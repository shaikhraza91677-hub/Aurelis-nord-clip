import json
from pathlib import Path
from typing import Any


def _load_cv2():
    try:
        import cv2  # type: ignore
        return cv2
    except ImportError:
        return None


def _motion_score(gray, x: int, y: int, w: int, h: int, previous) -> float:
    cv2 = _load_cv2()
    if cv2 is None or previous is None:
        return 0.0
    # Lower face region approximates mouth movement. It is deliberately lightweight,
    # because a full active-speaker model would add a large inference dependency.
    my = y + int(h * 0.48)
    mh = max(4, int(h * 0.42))
    mx = x + int(w * 0.14)
    mw = max(8, int(w * 0.72))
    roi = gray[my:my + mh, mx:mx + mw]
    prev_roi = previous[my:my + mh, mx:mx + mw]
    if roi.size == 0 or prev_roi.size == 0 or roi.shape != prev_roi.shape:
        return 0.0
    diff = cv2.absdiff(roi, prev_roi)
    return float(diff.mean()) / 255.0


def detect_faces(video: Path, sample_every: float = 0.5, max_samples: int = 240) -> list[dict[str, float]]:
    cv2 = _load_cv2()
    if cv2 is None:
        return []
    cascade_path = Path(cv2.data.haarcascades) / 'haarcascade_frontalface_default.xml'
    if not cascade_path.exists():
        return []

    cap = cv2.VideoCapture(str(video))
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = frame_count / fps if fps else 0.0
    classifier = cv2.CascadeClassifier(str(cascade_path))
    samples: list[dict[str, float]] = []
    previous = None
    t = 0.0
    while t <= duration and len(samples) < max_samples:
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, frame = cap.read()
        if not ok:
            break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = classifier.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=5, minSize=(64, 64))
        candidates = []
        for x, y, w, h in faces:
            area = float(w * h) / float(frame.shape[0] * frame.shape[1])
            motion = _motion_score(gray, int(x), int(y), int(w), int(h), previous)
            score = 0.6 * min(1.0, area * 25.0) + 0.4 * min(1.0, motion * 4.0)
            candidates.append((score, x, y, w, h, motion, area))
        if candidates:
            score, x, y, w, h, motion, area = max(candidates, key=lambda item: item[0])
            samples.append({
                'time': t,
                'cx': float(x + w / 2) / frame.shape[1],
                'cy': float(y + h / 2) / frame.shape[0],
                'area': area,
                'speakerScore': float(score),
                'mouthMotion': float(motion),
            })
        previous = gray
        t += sample_every
    cap.release()
    return samples


def crop_filter(width: int, height: int, mode: str = 'smart', focus_x: float = 0.5) -> str:
    focus_x = max(0.0, min(1.0, focus_x))
    target_ratio = 9 / 16
    if width / max(height, 1) > target_ratio:
        crop_w = int(height * target_ratio)
        x = int(max(0, min(width - crop_w, width * focus_x - crop_w / 2)))
        return f'crop={crop_w}:{height}:{x}:0,scale=1080:1920'
    crop_h = int(width / target_ratio)
    y = max(0, int((height - crop_h) / 2))
    return f'crop={width}:{crop_h}:0:{y},scale=1080:1920'


def build_crop_plan(video: Path) -> dict[str, Any]:
    faces = detect_faces(video)
    if not faces:
        return {'mode': 'center', 'segments': [{'start': 0.0, 'end': 1e9, 'focusX': 0.5}]}

    segments: list[dict[str, float]] = []
    for item in faces:
        fx = float(item['cx'])
        if segments and item['time'] - segments[-1]['start'] < 0.75:
            previous = segments[-1]
            previous['focusX'] = 0.7 * previous['focusX'] + 0.3 * fx
            previous['end'] = item['time'] + 0.75
        else:
            segments.append({'start': item['time'], 'end': item['time'] + 0.75, 'focusX': fx})
    # Smooth abrupt camera jumps so vertical crop motion feels natural.
    for i in range(1, len(segments)):
        segments[i]['focusX'] = 0.72 * segments[i - 1]['focusX'] + 0.28 * segments[i]['focusX']
    return {'mode': 'active-speaker-heuristic', 'segments': segments}


def save_crop_plan(video: Path, out: Path) -> dict[str, Any]:
    plan = build_crop_plan(video)
    out.write_text(json.dumps(plan, indent=2), encoding='utf-8')
    return plan
