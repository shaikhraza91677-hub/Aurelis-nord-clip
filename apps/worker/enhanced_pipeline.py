import json
import os
import tempfile
from pathlib import Path
from typing import Any

from captioning import transliterate_word, write_captions
from clip_discovery import discover_moments
from metadata import generate_metadata
from smart_crop import build_crop_plan
from thumbnail import generate_thumbnail
from worker import OPENROUTER_MODEL, audio, clip_focus_x, download, transcribe


def _caption_transcript(wav: Path, original: dict[str, Any]) -> dict[str, Any]:
    language = str(original.get('language', 'en')).lower()
    if language.startswith('hi'):
        return original
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(os.getenv('WHISPER_MODEL', 'small'), device=os.getenv('WHISPER_DEVICE', 'cpu'), compute_type=os.getenv('WHISPER_COMPUTE_TYPE', 'int8'))
        segments, _ = model.transcribe(str(wav), word_timestamps=True, vad_filter=True, task='translate')
        words, text_parts, out_segments = [], [], []
        for seg in segments:
            seg_words = []
            for word in (seg.words or []):
                item = {'start': float(word.start), 'end': float(word.end), 'word': word.word.strip()}
                words.append(item); seg_words.append(item)
            text = seg.text.strip()
            if text: text_parts.append(text)
            out_segments.append({'start': float(seg.start), 'end': float(seg.end), 'text': text, 'words': seg_words})
        return {'language': language, 'captionLanguage': 'en', 'segments': out_segments, 'words': words, 'text': ' '.join(text_parts)}
    except Exception:
        return {**original, 'captionLanguage': language}


def _render(video: Path, out: Path, start: float, end: float, crop_plan: dict[str, Any], caption_transcript: dict[str, Any], language: str, style: str = 'Word Pop') -> None:
    import subprocess
    duration = max(1.0, end - start)
    caption_file = out.with_suffix('.ass')
    caption_language = 'hi' if language.lower().startswith('hi') else 'en'
    write_captions(caption_transcript['words'], start, end, caption_language, caption_file, style=style, position='bottom', size='medium', color='#FFFFFF', aspect='9:16')
    focus_x = clip_focus_x(crop_plan, start, end)
    safe_ass = str(caption_file.resolve()).replace('\\', '/').replace(':', '\\:')
    vf = f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:({focus_x:.4f}*iw)-540:0,ass='{safe_ass}'"
    subprocess.run(['ffmpeg', '-y', '-ss', f'{start:.3f}', '-i', str(video), '-t', f'{duration:.3f}', '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', str(out)], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try: caption_file.unlink()
    except OSError: pass


def process_url(url: str, outdir: str = './output', custom_prompt: str = '') -> dict[str, Any]:
    root = Path(outdir); root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='aurelis-production-') as td:
        work = Path(td); video = download(url, work)
        return _process_video(video, url, root, work, custom_prompt)


def process_file(source: str, outdir: str = './output', custom_prompt: str = '') -> dict[str, Any]:
    video = Path(source).resolve()
    if not video.exists() or not video.is_file(): raise RuntimeError('Uploaded media file does not exist')
    root = Path(outdir); root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='aurelis-production-upload-') as td:
        return _process_video(video, f'upload://{video.name}', root, Path(td), custom_prompt)


def _process_video(video: Path, source: str, root: Path, work: Path, custom_prompt: str) -> dict[str, Any]:
    wav = work / 'audio.wav'; audio(video, wav)
    transcript = transcribe(wav)
    caption_transcript = _caption_transcript(wav, transcript)
    clips = discover_moments(transcript, custom_prompt)
    crop_plan = build_crop_plan(video)
    rendered = []
    for index, clip in enumerate(clips[:8], 1):
        start, end = float(clip['start']), float(clip['end'])
        target = root / f'clip-{index:02d}.mp4'
        _render(video, target, start, end, crop_plan, caption_transcript, str(transcript.get('language', 'en')))
        thumbnail = root / f'clip-{index:02d}.jpg'
        generate_thumbnail(str(target), str(thumbnail), min(1.0, max(0.1, (end - start) / 3)))
        rendered.append({**clip, 'file': str(target), 'thumbnail': str(thumbnail), 'captionLanguage': 'hinglish' if str(transcript.get('language', '')).lower().startswith('hi') else 'english', 'hookTransliterated': transliterate_word(str(clip.get('hook', '')), str(transcript.get('language', ''))), 'framing': {'mode': crop_plan.get('mode', 'center'), 'focusX': clip_focus_x(crop_plan, start, end)}})
    rendered = generate_metadata(rendered, str(transcript.get('language', 'en')))
    manifest = {'source': source, 'customPrompt': custom_prompt, 'language': transcript.get('language'), 'captionLanguage': 'hinglish' if str(transcript.get('language', '')).lower().startswith('hi') else 'english', 'transcript': transcript, 'cropPlan': crop_plan, 'clips': rendered, 'model': OPENROUTER_MODEL}
    (root / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    return manifest
