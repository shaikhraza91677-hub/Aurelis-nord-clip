import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from captioning import write_captions
from smart_crop import build_crop_plan
from worker import audio, download, transcribe, clip_focus_x


def _source_path(source: str, work: Path) -> Path:
    local = Path(source)
    if local.exists() and local.is_file():
        target = work / local.name
        shutil.copy2(local, target)
        return target
    return download(source, work)


def _dimensions(aspect: str) -> tuple[int, int]:
    return {'9:16': (1080, 1920), '1:1': (1080, 1080), '16:9': (1920, 1080)}.get(aspect, (1080, 1920))


def _crop_filter(width: int, height: int, aspect: str, framing: str, focus_x: float) -> str:
    target_w, target_h = _dimensions(aspect)
    ratio = target_w / target_h
    focus_x = {'left': 0.2, 'center': 0.5, 'right': 0.8}.get(framing, focus_x)
    focus_x = max(0.0, min(1.0, focus_x))
    if width / max(height, 1) >= ratio:
        crop_w = max(2, int(height * ratio))
        x = max(0, min(width - crop_w, int(width * focus_x - crop_w / 2)))
        return f'crop={crop_w}:{height}:{x}:0,scale={target_w}:{target_h}'
    crop_h = max(2, int(width / ratio))
    y = max(0, min(height - crop_h, int((height - crop_h) / 2)))
    return f'crop={width}:{crop_h}:0:{y},scale={target_w}:{target_h}'


def _run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def render_clip(source_url: str, start: float, end: float, out: str, config: dict[str, Any] | None = None) -> dict[str, Any]:
    config = config or {}
    style = str(config.get('captionStyle', 'Word Pop'))
    language_mode = str(config.get('captionLanguage', 'auto'))
    position = str(config.get('captionPosition', 'bottom'))
    size = str(config.get('captionSize', 'medium'))
    color = str(config.get('captionColor', '#FFFFFF'))
    aspect = str(config.get('aspectRatio', '9:16'))
    framing = str(config.get('framing', 'smart'))
    show = bool(config.get('showCaptions', True))

    with tempfile.TemporaryDirectory(prefix='aurelis-render-') as td:
        work = Path(td)
        video = _source_path(source_url, work)
        wav = work / 'audio.wav'
        audio(video, wav)
        transcript = transcribe(wav)
        language = str(transcript.get('language', 'en'))
        if language_mode == 'english':
            language = 'en'
        elif language_mode == 'original':
            language = 'original'

        crop_plan = build_crop_plan(video)
        focus_x = 0.5 if framing == 'center' else clip_focus_x(crop_plan, start, end)
        caption_file = work / 'captions.ass'
        if show:
            write_captions(transcript['words'], start, end, language, caption_file, style=style, position=position, size=size, color=color, aspect=aspect)
        else:
            caption_file.write_text('[Script Info]\nScriptType: v4.00+\n', encoding='utf-8')

        target = Path(out).resolve()
        target.parent.mkdir(parents=True, exist_ok=True)
        probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', str(video)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        raw = probe.stdout.strip().split('x')
        width, height = (int(raw[0]), int(raw[1])) if len(raw) == 2 else (1920, 1080)
        vf = _crop_filter(width, height, aspect, framing, focus_x)
        safe_ass = str(caption_file.resolve()).replace('\\', '/').replace(':', '\\:')
        vf = f"{vf},ass='{safe_ass}'"
        duration = max(1.0, end - start)
        _run([
            'ffmpeg', '-y', '-ss', f'{start:.3f}', '-i', str(video), '-t', f'{duration:.3f}',
            '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
            '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', str(target),
        ])
        return {'file': str(target), 'language': transcript.get('language'), 'focusX': focus_x, 'style': style, 'aspectRatio': aspect, 'framing': framing}
