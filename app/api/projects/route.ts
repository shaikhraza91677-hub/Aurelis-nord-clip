import { NextResponse } from 'next/server';
import { z } from 'zod';

const bodySchema = z.object({ url: z.string().url() });

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid video URL.' }, { status: 400 });

  const id = crypto.randomUUID();
  const job = {
    id,
    sourceUrl: parsed.data.url,
    status: 'queued',
    createdAt: new Date().toISOString(),
    clips: [],
  };

  // Replace this hand-off with Redis/queue + worker persistence in production.
  // Keeping the contract stable means the UI does not change when the media worker is connected.
  return NextResponse.json(job, { status: 202 });
}