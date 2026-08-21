import subprocess
import tempfile
from pathlib import Path
from typing import Any


def create_supercut(files: list[str], out: str, transition: str = 'hard') -> dict[str, Any]:
    if not files:
        raise RuntimeError('No clips selected for supercut')
    valid = [Path(f).resolve() for f in files if Path(f).is_file() and Path(f).suffix.lower() == '.mp4']
    if not valid:
        raise RuntimeError('No rendered MP4 clips are available')

    target = Path(out).resolve()
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='aurelis-supercut-') as td:
        concat = Path(td) / 'concat.txt'
        concat.write_text('\n'.join(f"file '{str(p).replace("'", "'\\''")}'" for p in valid), encoding='utf-8')
        if transition == 'hard':
            cmd = ['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', str(concat), '-c', 'copy', '-movflags', '+faststart', str(target)]
        else:
            # Normalize and re-encode when a future transition mode is requested.
            cmd = ['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', str(concat), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', str(target)]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return {'file': str(target), 'clipCount': len(valid), 'transition': transition}
