import subprocess
from pathlib import Path


def generate_thumbnail(video: str, out: str, at_seconds: float = 1.0) -> str:
    target = Path(out).resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    t = max(0.0, float(at_seconds))
    subprocess.run([
        'ffmpeg', '-y', '-ss', f'{t:.3f}', '-i', video, '-frames:v', '1',
        '-vf', 'scale=720:-2', '-q:v', '3', str(target)
    ], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return str(target)
