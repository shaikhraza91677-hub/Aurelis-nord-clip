# Aurelis Nord Clip

A full-stack AI long-form video → short-form clipping platform with an original UX and implementation.

## What works now

`YouTube/public URL or upload → async worker job → yt-dlp/file ingest → FFmpeg audio → faster-whisper → AI clip discovery → language-aware captions → smart face-biased crop → 9:16 MP4 + thumbnail → project dashboard`

The current build includes:

- YouTube/public URL ingestion and local video uploads
- Background processing with job IDs and live progress polling
- AI moment discovery with a custom creator instruction
- 0–100 clip scoring and category filtering
- Hindi caption path → Latin-script Hinglish
- Other-language caption path → English translation
- Word-level timed animated captions: Word Pop, Highlight, Fade, Bounce
- 9:16, 1:1 and 16:9 editor output
- Smart/center/left/right framing controls
- OpenCV face-biased smart framing fallback
- Clip preview, download and generated thumbnails
- AI-generated YouTube titles, descriptions, Instagram/TikTok captions and hashtags with graceful fallback
- Asynchronous per-clip re-rendering
- Multi-clip Supercut generation
- Transcript export: TXT, SRT, VTT and JSON
- PostgreSQL + Prisma persistence when `DATABASE_URL` is configured, with in-memory fallback for local-only development
- Docker Compose stack for web + worker + PostgreSQL with shared media volumes

## Architecture

```text
Next.js Web
   │
   ├── Project API ────────────────┐
   ├── Upload API                  │
   ├── Editor / Render API         │ HTTP
   └── Export APIs                 │
                                  ▼
                         Python Media Worker
                                  │
             ┌────────────────────┼──────────────────┐
             ▼                    ▼                  ▼
          yt-dlp             faster-whisper       FFmpeg
             │                    │                  │
             └──────────────┬─────┴──────────────────┘
                            ▼
                       OpenRouter LLM
                            │
                            ▼
                   Clip discovery + metadata
                            │
                            ▼
                    Rendered short-form MP4
```

## Stack

- Web: Next.js 15, React 19, TypeScript
- Worker: Python 3.11
- AI reasoning: OpenRouter; development default uses `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
- Transcription: faster-whisper
- Media: FFmpeg + yt-dlp
- Vision fallback: OpenCV Haar face detection
- Captions: ASS timed word rendering
- Persistence: PostgreSQL + Prisma, optional memory fallback

## Run locally

### Web

```bash
npm install
npm run db:generate
npm run dev
```

### Worker

```bash
cd apps/worker
python -m venv .venv
# activate the environment
pip install -r requirements.txt
python server.py
```

Required tools: `ffmpeg` and `yt-dlp` available on PATH.

### Environment

```env
APP_URL=http://localhost:3000
WORKER_URL=http://localhost:8080
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
WHISPER_MODEL=small
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
WORKER_OUTPUT_DIR=./output
DATABASE_URL=postgresql://aurelis:aurelis_dev_change_me@localhost:5432/aurelis?schema=public
```

## Docker

```bash
export OPENROUTER_API_KEY=your-development-key
cp .env.example .env.local

docker compose up --build
```

Then open `http://localhost:3000`.

Before any public deployment, replace the development database password, set a paid/private AI model, move media to object storage, and put secrets in the deployment secret manager.

## Production hardening still required

The repo now has the production seams for persistence and container deployment. Before a public SaaS launch, add Redis/BullMQ or another durable external queue, S3-compatible object storage with signed URLs, real authentication/team workspaces, OAuth publishing integrations, stronger active-speaker tracking, rate limiting, quotas/billing, and observability.

Only process media you own or are authorized to repurpose. A public URL is not automatically licensed for reuse.
