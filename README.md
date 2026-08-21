# Aurelis Nord Clip

A production-oriented AI long-form video → short-form clip platform. The product takes inspiration from the workflow patterns users expect from tools such as Cliphi, but the implementation, UX and codebase are original.

## Current working slice

The current build is focused on the highest-value path:

`YouTube/public URL or upload → yt-dlp/file ingest → FFmpeg audio → faster-whisper → word timestamps → OpenRouter clip ranking → vertical 9:16 render → animated word-pop captions → project dashboard`

The market baseline includes AI clip scoring, animated captions, speaker tracking, multiple aspect ratios, presets, an editor, publishing, supercuts and livestream clipping. Aurelis will add these in staged releases rather than pretending they are already production-ready.

## Stack

- **Web:** Next.js 15 + React 19 + TypeScript
- **AI reasoning:** OpenRouter; development default is `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
- **Transcription:** faster-whisper with word timestamps
- **Media:** yt-dlp + FFmpeg
- **Captions:** ASS-based animated word-pop rendering; Hindi words are transliterated toward Latin-script Hinglish
- **State:** in-memory MVP contract; PostgreSQL + Prisma is the production persistence target
- **Queue:** Redis/BullMQ or a dedicated job broker in production
- **Storage:** S3-compatible object storage in production

## Product roadmap

### Phase 1 — Core clipping
- URL ingestion
- local uploads
- transcription + language detection
- AI moment detection
- clip scoring
- clip filtering
- 9:16 rendering
- word-level animated captions
- Hindi → Hinglish caption mode
- preview/download

### Phase 2 — Editor
- caption style presets
- typography controls
- caption position/size/color
- clip trim handles
- crop/reframe controls
- brand presets
- intro/outro
- watermark/logo
- safe zones

### Phase 3 — Smart framing
- face detection
- active speaker detection
- speaker identity tracking
- multi-person split layouts
- scene-aware crop switching
- smooth camera motion

### Phase 4 — AI growth features
- virality score calibration
- hook rewriting
- titles/descriptions/hashtags
- content categories
- custom clipping prompts
- supercuts/highlight reels
- clip variation generation

### Phase 5 — Distribution
- YouTube Shorts publishing
- TikTok export/publishing
- Instagram Reels publishing
- scheduling
- render history
- credits/usage accounting
- team workspaces

### Phase 6 — Scale
- PostgreSQL/Prisma
- Redis queue
- S3 storage + signed URLs
- worker autoscaling
- retries/idempotency
- observability
- per-user quotas and billing

## Environment

Copy `.env.example` to `.env.local` and never commit API keys.

```env
OPENROUTER_API_KEY=
OPENROUTER_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
WORKER_URL=http://localhost:8080
```

## Development

```bash
npm install
npm run dev
```

Run the media worker in a second terminal:

```bash
cd apps/worker
python -m venv .venv
# activate the environment
pip install -r requirements.txt
python server.py
```

The worker requires `ffmpeg`, `yt-dlp`, and a compatible Python environment for `faster-whisper`.

## Important

Only process media you own or are authorized to repurpose. A public URL is not automatically licensed for reuse.
