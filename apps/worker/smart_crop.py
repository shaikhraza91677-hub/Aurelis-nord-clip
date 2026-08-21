import json
from pathlib import Path
from typing import Any


def _load_cv2():
    try:
        import cv2  # type: ignore
        return cv2
    except ImportError:
        return None


def detect_faces(video: Path, sample_every: float = 1.0, max_samples: int = 60) -> list[dict[str, float]]:
    """Best-effort face detection using OpenCV's bundled Haar cascade.

    The detector is intentionally optional. Production can replace this module with a
    stronger face/pose tracker without changing the render contract.
    """
    cv2 = _load_cv2()
    if cv2 is None:
        return []
    cascade_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
    if not cascade_path.exists():
        return []

    cap = cv2.VideoCapture(str(video))
    fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = frame_count / fps if fps else 0.0
    classifier = cv2.CascadeClassifier(str(cascade_path))
    samples: list[dict[str, float]] = []
    t = 0.0
    while t <= duration and len(samples) < max_samples:
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, frame = cap.read()
        if not ok:
            break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = classifier.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=5, minSize=(80, 80))
        if len(faces):
            # Choose the largest face as the primary speaker candidate.
            x, y, w, h = max(faces, key=lambda f: int(f[2]) * int(f[3]))
            samples.append({"time": t, "cx": float(x + w / 2) / frame.shape[1], "cy": float(y + h / 2) / frame.shape[0], "area": float(w * h) / float(frame.shape[0] * frame.shape[1])})
        t += sample_every
    cap.release()
    return samples


def crop_filter(width: int, height: int, mode: str = "smart", focus_x: float = 0.5) -> str:
    """Return an FFmpeg filter for a 9:16 output.

    focus_x is normalized 0..1 and is clamped for safety. Smart mode uses this focus point;
    an upstream tracker can update it over time for smooth active-speaker movement.
    """
    focus_x = max(0.0, min(1.0, focus_x))
    target_ratio = 9 / 16
    if width / max(height, 1) > target_ratio:
        crop_w = int(height * target_ratio)
        x = int(max(0, min(width - crop_w, width * focus_x - crop_w / 2)))
        return f"crop={crop_w}:{height}:{x}:0,scale=1080:1920"
    crop_h = int(width / target_ratio)
    y = max(0, int((height - crop_h) / 2))
    return f"crop={width}:{crop_h}:0:{y},scale=1080:1920"


def build_crop_plan(video: Path) -> dict[str, Any]:
    faces = detect_faces(video)
    if not faces:
        return {"mode": "center", "segments": [{"start": 0.0, "end": 1e9, "focusX": 0.5}]}

    # Bucket detections into coarse one-second segments and smooth the x coordinate.
    segments: list[dict[str, float]] = []
    for item in faces:
        fx = float(item["cx"])
        if segments and item["time"] - segments[-1]["start"] < 1.0:
            segments[-1]["focusX"] = (segments[-1]["focusX"] + fx) / 2.0
            segments[-1]["end"] = item["time"] + 1.0
        else:
            segments.append({"start": item["time"], "end": item["time"] + 1.0, "focusX": fx})
    for i in range(1, len(segments)):
        segments[i]["focusX"] = 0.65 * segments[i - 1]["focusX"] + 0.35 * segments[i]["focusX"]
    return {"mode": "smart", "segments": segments}


def save_crop_plan(video: Path, out: Path) -> dict[str, Any]:
    plan = build_crop_plan(video)
    out.write_text(json.dumps(plan, indent=2), encoding="utf-8")
    return plan
