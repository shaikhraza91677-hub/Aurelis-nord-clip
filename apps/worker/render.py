import os
import tempfile
from pathlib import Path
from typing import Any

from captioning import write_captions
from smart_crop import build_crop_plan
from worker import audio, download, render, transcribe, clip_focus_x


def render_clip(source_url: str, start: float, end: float, out: str, config: dict[str, Any] | None = None) -> dict[str, Any]:
    config = config or {}
    style = str(config.get('captionStyle', 'Word Pop'))
    language_mode = str(config.get('captionLanguage', 'auto'))
    position = str(config.get('captionPosition', 'bottom'))
    size = str(config.get('captionSize', 'medium'))
    color = str(config.get('captionColor', '#FFFFFF'))
    show = bool(config.get('showCaptions', True))

    with tempfile.TemporaryDirectory(prefix='aurelis-render-') as td:
        work = Path(td)
        video = download(source_url, work)
        wav = work / 'audio.wav'
        audio(video, wav)
        transcript = transcribe(wav)
        language = 'en' if language_mode == 'english' else str(transcript.get('language', 'en'))
        if language_mode == 'original':
            language = 'original'

        crop_plan = build_crop_plan(video)
        focus_x = clip_focus_x(crop_plan, start, end)
        caption_file = work / 'captions.ass'
        if show:
            write_captions(transcript['words'], start, end, language, caption_file, style=style, position=position, size=size, color=color)
        else:
            caption_file.write_text('[Script Info]\nScriptType: v4.00+\n', encoding='utf-8')

        target = Path(out).resolve()
        target.parent.mkdir(parents=True, exist_ok=True)
        render(video, target, start, end, caption_file, focus_x)
        return {'file': str(target), 'language': transcript.get('language'), 'focusX': focus_x, 'style': style}
