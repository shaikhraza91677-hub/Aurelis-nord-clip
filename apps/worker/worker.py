import json, os, re, subprocess, tempfile
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

from captioning import write_word_pop_ass, transliterate_word

load_dotenv()

OPENROUTER_BASE = os.getenv('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1').rstrip('/')
OPENROUTER_KEY = os.getenv('OPENROUTER_API_KEY', '')
OPENROUTER_MODEL = os.getenv('OPENROUTER_MODEL', 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free')


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def download(url: str, out: Path) -> Path:
    run(['yt-dlp', '--no-playlist', '-f', 'bv*+ba/b', '--merge-output-format', 'mp4', '-o', str(out / 'source.%(ext)s'), url])
    files = list(out.glob('source.*'))
    if not files:
        raise RuntimeError('Video download completed without producing a media file')
    return files[0]


def audio(video: Path, out: Path) -> None:
    run(['ffmpeg', '-y', '-i', str(video), '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', str(out)])


def transcribe(path: Path) -> dict[str, Any]:
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise RuntimeError('Install faster-whisper in the worker environment to enable transcription') from exc

    model_name = os.getenv('WHISPER_MODEL', 'small')
    device = os.getenv('WHISPER_DEVICE', 'cpu')
    compute = os.getenv('WHISPER_COMPUTE_TYPE', 'int8')
    model = WhisperModel(model_name, device=device, compute_type=compute)
    segments, info = model.transcribe(str(path), word_timestamps=True, vad_filter=True)
    out_segments: list[dict[str, Any]] = []
    words: list[dict[str, Any]] = []
    text_parts: list[str] = []
    for seg in segments:
        seg_words = []
        for w in (seg.words or []):
            item = {'start': float(w.start), 'end': float(w.end), 'word': w.word.strip()}
            words.append(item)
            seg_words.append(item)
        text = seg.text.strip()
        if text:
            text_parts.append(text)
        out_segments.append({'start': float(seg.start), 'end': float(seg.end), 'text': text, 'words': seg_words})
    return {'language': info.language, 'segments': out_segments, 'words': words, 'text': ' '.join(text_parts)}


def openrouter_json(system: str, user: str) -> dict[str, Any]:
    if not OPENROUTER_KEY:
        raise RuntimeError('OPENROUTER_API_KEY is not configured')
    headers = {
        'Authorization': f'Bearer {OPENROUTER_KEY}',
        'Content-Type': 'application/json',
        'HTTP-Referer': os.getenv('APP_URL', 'http://localhost:3000'),
        'X-Title': 'Aurelis Nord Clip',
    }
    payload = {
        'model': OPENROUTER_MODEL,
        'temperature': 0.15,
        'messages': [{'role': 'system', 'content': system}, {'role': 'user', 'content': user}],
    }
    r = requests.post(f'{OPENROUTER_BASE}/chat/completions', headers=headers, json=payload, timeout=300)
    r.raise_for_status()
    content = r.json()['choices'][0]['message']['content']
    if isinstance(content, list):
        content = ''.join(str(part.get('text', '')) if isinstance(part, dict) else str(part) for part in content)
    match = re.search(r'\{.*\}', str(content), flags=re.S)
    if not match:
        raise RuntimeError('OpenRouter did not return valid JSON')
    return json.loads(match.group(0))


def moments(transcript: dict[str, Any]) -> list[dict[str, Any]]:
    prompt = f'''
Return strict JSON: {{"clips":[...]}}.
Find up to 12 non-overlapping short-form moments from this transcript.
Each clip must have: start, end, score, hook, title, reason, category, language.
Constraints: 20-75 seconds; preserve enough context to stand alone; strong first 1-2 seconds;
clear payoff; emotional tension, surprising insight, useful teaching, humor, controversy, or story beat.
Avoid intros, greetings, ads, long setup, repeated points and unfinished sentences.
Score 0-100 using hook strength, payoff clarity, emotional intensity, standalone context,
pacing and shareability. Start/end should align with natural sentence boundaries.
Transcript language: {transcript.get('language', 'unknown')}.
Transcript:\n{transcript.get('text', '')[:80000]}
'''
    result = openrouter_json(
        'You are Aurelis Nord\'s senior short-form editor. Be selective. Quality beats quantity. Never invent transcript content.',
        prompt,
    )
    clips = result.get('clips', [])
    clips = [c for c in clips if isinstance(c, dict) and float(c.get('end', 0)) > float(c.get('start', 0))]
    return sorted(clips, key=lambda x: float(x.get('score', 0)), reverse=True)[:12]


def render(video: Path, out: Path, start: float, end: float, caption_file: Path) -> None:
    duration = max(1.0, end - start)
    safe_ass = str(caption_file.resolve()).replace('\\', '/').replace(':', '\\:')
    vf = f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,ass='{safe_ass}'"
    run([
        'ffmpeg', '-y', '-ss', f'{start:.3f}', '-i', str(video), '-t', f'{duration:.3f}',
        '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
        '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', str(out)
    ])


def process(url: str, outdir: str = './output') -> dict[str, Any]:
    root = Path(outdir)
    root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='aurelis-') as td:
        work = Path(td)
        video = download(url, work)
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
            rendered.append({
                **clip,
                'file': str(target),
                'captionTimeline': str(caption_path),
                'captionStyle': 'Word Pop',
                'captionLanguage': transcript.get('language'),
                'hookTransliterated': transliterate_word(str(clip.get('hook', '')), str(transcript.get('language', ''))),
            })
        manifest = {
            'source': url,
            'language': transcript.get('language'),
            'transcript': transcript,
            'clips': rendered,
            'model': OPENROUTER_MODEL,
        }
        (root / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
        return manifest


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('url')
    parser.add_argument('--out', default='./output')
    args = parser.parse_args()
    print(json.dumps(process(args.url, args.out), ensure_ascii=False))
