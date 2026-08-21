# Aurelis Nord Clip

Aurelis Nord is an AI long-form video → short-form clipping platform. It intentionally focuses on recorded video repurposing; **livestream clipping, AI voiceover and AI music are out of scope by design**.

## What Aurelis does

```text
YouTube / public video URL / upload
            ↓
        Background job
            ↓
        FFmpeg + Whisper
            ↓
       AI clip discovery
            ↓
       Virality scoring
            ↓
 Hindi → Hinglish captions
 Other languages → English
            ↓
 Smart speaker framing
            ↓
  9:16 / 1:1 / 16:9 render
            ↓
 MP4 + thumbnail + metadata
```

### Built features

- Account signup/login/logout and protected projects
- YouTube/public URL ingestion
- Direct video upload
- Custom clipping instructions
- Background processing with progress polling
- AI moment discovery and 0–100 scoring
- Clip category filters
- Hindi → Latin-script Hinglish caption path
- Other spoken languages → English caption path
- Word-level timed captions: Word Pop, Highlight, Fade, Bounce
- Caption position, size, color and on/off controls
- 9:16, 1:1 and 16:9 output
- Smart / center / left / right framing
- Lightweight active-speaker heuristic using face + mouth-motion signals
- Clip thumbnails and browser previews
- Per-clip asynchronous re-render
- Transcript export: TXT, SRT, VTT, JSON
- AI titles, descriptions, hashtags and platform captions
- Multi-clip supercuts
- Persistent PostgreSQL/Prisma project storage
- Redis-backed durable queue with local fallback
- Persistent brand presets
- Plan usage limits / quotas
- Request rate limiting
- Encrypted publishing-token storage
- YouTube / TikTok / Instagram publishing adapters
- Stripe Checkout + subscription webhook reconciliation
- Optional S3-compatible media storage / signed URLs
- Docker Compose stack for web + worker + PostgreSQL + Redis
- GitHub CI for TypeScript/build + Python smoke tests

## Deliberately not included

These are **not bugs or unfinished requirements**:

- Livestream clipping
- AI voiceover
- AI-generated music

## Quickest way to use it locally

### 1. Clone

```bash
git clone https://github.com/shaikhraza91677-hub/Aurelis-nord-clip.git
cd Aurelis-nord-clip
```

### 2. Create environment

```bash
cp .env.example .env.local
```

At minimum set:

```env
OPENROUTER_API_KEY=YOUR_OPENROUTER_KEY
OPENROUTER_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free
DATABASE_URL=postgresql://aurelis:aurelis_dev_change_me@localhost:5432/aurelis?schema=public
WORKER_URL=http://localhost:8080
WORKER_OUTPUT_DIR=./output
REDIS_URL=redis://localhost:6379/0
```

For local development, PostgreSQL and Redis must be running. FFmpeg and yt-dlp must also be installed and available on PATH.

### 3. Install web dependencies

```bash
npm install
npm run db:generate
npm run db:push
```

### 4. Start the web app

```bash
npm run dev
```

Open:

`http://localhost:3000`

### 5. Start the worker

In another terminal:

```bash
cd apps/worker
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Then:

```bash
pip install -r requirements.txt
python server.py
```

The worker listens on `http://localhost:8080` by default.

## First-use walkthrough

1. Open `http://localhost:3000`.
2. Create an account at `/signup`.
3. Sign in at `/login`.
4. Paste a YouTube/public video URL or upload a video.
5. Optionally enter an instruction such as:
   - `Find the funniest moments.`
   - `Only find business lessons.`
   - `Find surprising or controversial statements.`
6. Start processing.
7. The project page polls the background job and shows progress.
8. When clips appear, filter by category and inspect their scores.
9. Choose caption style, language, format, framing and caption settings.
10. Click **Get clip** to render or **Re-render** after changing settings.
11. Preview the MP4 in the browser and download it.
12. Export TXT/SRT/VTT transcript files when needed.
13. Save/apply a brand preset from the Brand area.
14. Connect YouTube/TikTok/Instagram publishing credentials before using the publish controls.
15. Configure Stripe only when you want paid plans enabled.

## Docker: easiest complete stack

The repository includes a Docker Compose stack for:

- PostgreSQL
- Redis
- Python media worker
- Next.js web app
- Shared media volumes

Set the secrets in `.env.local` / your deployment environment, then run:

```bash
docker compose up --build
```

Open:

`http://localhost:3000`

For a real deployment, replace development PostgreSQL credentials and set a strong auth/encryption secret.

## External services needed for production

### Required for AI clipping

- OpenRouter API key
- A paid/private production model is recommended before launch

### Required for publishing

- YouTube OAuth/app credentials
- TikTok developer app + required Content Posting permissions
- Instagram/Meta app + appropriate professional-account permissions
- Publicly reachable media URL for URL-pull publishing paths

### Required for billing

- Stripe secret key
- Stripe price IDs
- Stripe webhook secret

### Optional production infrastructure

- S3-compatible object storage
- Redis/managed Redis
- Managed PostgreSQL

## Verify before launch

Run the same checks locally that CI runs:

```bash
npm install
npm run db:generate
npx tsc --noEmit
npm run build
```

Worker:

```bash
python -m compileall apps/worker
python -m unittest discover apps/worker/tests -v
```

Then manually test one real video through this entire path:

`signup → login → URL/upload → processing → clips → render → preview → download → transcript export`

After that test:

`brand preset → publisher connection → publish`

And separately:

`Stripe Checkout → webhook → plan/usage enforcement`

## Important reality check

The codebase contains the integrations and production seams, but **third-party OAuth, Stripe, S3 and production infrastructure cannot be validated from this repository alone**. Those need real credentials and a reachable deployment environment.

Also, the current active-speaker logic is a lightweight computer-vision heuristic, not a proprietary neural active-speaker model. It is designed to be replaceable without changing the renderer contract.

Only process media you own or are authorized to repurpose.
