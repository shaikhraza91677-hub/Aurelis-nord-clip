# Aurelis Nord Clip

AI long-form video → short-form clip platform inspired by the workflow patterns of Cliphi, but implemented as an original product and codebase.

## Product

Paste a supported public video URL or upload a video. Aurelis Nord Clip will:

1. ingest the source
2. extract/transcribe speech with timestamps
3. detect high-value moments with an LLM
4. generate vertical 9:16 clip plans
5. create word-timed captions
6. apply language-aware caption rules (Hindi → Hinglish, other supported languages → English by default)
7. render clips with FFmpeg
8. expose score, title, hook and export metadata

## Architecture

- `apps/web`: Next.js application and API orchestration
- `apps/worker`: Python media worker using yt-dlp + FFmpeg
- `packages/core`: shared schemas and clip-scoring contracts
- PostgreSQL/Prisma can be added as the persistence layer; the first slice keeps job state API-friendly so the UI is usable immediately.

## Required runtime

- Node.js 20+
- Python 3.11+
- FFmpeg
- yt-dlp
- An LLM/transcription provider configured through environment variables

## Environment

Copy `.env.example` to `.env.local` and configure the provider when ready. The UI and job contracts are designed so the provider can be swapped without rewriting the product.

## Development

```bash
npm install
npm run dev
```

Worker:

```bash
cd apps/worker
python -m venv .venv
# activate the environment
pip install -r requirements.txt
python worker.py
```

## Important

Only process media you own or have permission to use. Public URLs are not automatically licensed for reuse.
