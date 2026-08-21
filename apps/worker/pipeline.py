import json
import tempfile
from pathlib import Path
from typing import Any

from captioning import transliterate_word, write_word_pop_ass
from worker import OPENROUTER_MODEL, audio, moments, render, transcribe


def process_file(source: str, outdir: str = './output') -> dict[str, Any]:
    video = Path(source).resolve()
    if not video.exists() or not video.is_file():
        raise RuntimeError('Uploaded media file does not exist on the worker filesystem')

    root = Path(outdir)
    root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='aurelis-upload-') as td:
        work = Path(td)
        wav = work / 'audio.wav'
        audio(video, wav)
        transcript = transcribe(wav)
        clips = moments(transcript)
        rendered: list[dict[str, Any]] = []
        for i, clip in enumerate(clips[:8], 1):
            start, end = float(clip['start']), float(clip['end'])
            caption_path = root / f'clip-{i:02d}.ass'
            write_word_pop_ass(transcript['words'], start, end, str(transcript.get('language', '')), caption_path)
            target = root / f'clip-{i:02d}.mp4'
            render(video, target, start, end, caption_path)
            rendered.append({**clip, 'file': str(target), 'captionTimeline': str(caption_path), 'captionStyle': 'Word Pop', 'captionLanguage': transcript.get('language'), 'hookTransliterated': transliterate_word(str(clip.get('hook', '')), str(transcript.get('language', '')))})

        manifest = {'source': str(video), 'language': transcript.get('language'), 'transcript': transcript, 'clips': rendered, 'model': OPENROUTER_MODEL}
        (root / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
        return manifest
