# Aurelis Nord Clip

Full-stack AI long-form video to short-form clipping platform.

## Current platform

- Next.js 15 + React 19 + TypeScript web application
- Self-hosted email/password auth with secure HTTP-only sessions
- PostgreSQL persistence with Prisma
- Redis-backed durable worker queue with local fallback
- OpenRouter AI clip discovery and metadata
- faster-whisper word timestamps
- Hindi → Hinglish and other-language → English caption modes
- FFmpeg 9:16, 1:1, 16:9 rendering
- Smart face-biased framing
- Word Pop / Highlight / Fade / Bounce captions
- Thumbnails, transcripts, supercuts and project library
- Encrypted YouTube/TikTok/Instagram publishing connections
- Real YouTube resumable upload and TikTok/Instagram publish adapters
- Stripe Checkout + subscription webhook reconciliation
- Free/Pro processing quotas
- Optional S3-compatible rendered-media storage
- Docker Compose with PostgreSQL + Redis + worker + web

## Local setup

Copy `.env.example` to `.env.local`, install Node dependencies, run `npm run db:generate`, start Redis/PostgreSQL, start the worker, then run `npm run dev`.

The worker requires FFmpeg and yt-dlp. A production deployment should set `AUTH_SECRET`, an OpenRouter key, and the relevant platform/storage/billing credentials.

Only process media you own or are authorized to repurpose.
