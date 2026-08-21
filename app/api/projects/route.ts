import { NextResponse } from 'next/server';
import { projects, type Clip } from '@/lib/projects';
import { z } from 'zod';

const bodySchema = z.object({ url: z.string().url(), prompt: z.string().trim().max(500).optional().default('') });

function workerUrl() { return process.env.WORKER_URL || 'http://localhost:8080'; }

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid video URL.' }, { status: 400 });

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const project = { id, sourceUrl: parsed.data.url, customPrompt: parsed.data.prompt, status: 'queued' as const, progress: 0, stage: 'Queued', createdAt, clips: [] as Clip[] };
  projects.set(id, project);

  try {
    const response = await fetch(`${workerUrl()}/process`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: parsed.data.url, prompt: parsed.data.prompt, out: process.env.WORKER_OUTPUT_DIR || './output' }), cache: 'no-store',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Media worker failed to queue the project.');
    projects.set(id, { ...project, jobId: result.jobId, status: 'processing', progress: 2, stage: 'Downloading source' });
    return NextResponse.json(projects.get(id), { status: 202 });
  } catch (error) {
    const failed = { ...project, status: 'failed' as const, progress: 100, stage: 'Failed', error: error instanceof Error ? error.message : 'Could not reach media worker.' };
    projects.set(id, failed);
    return NextResponse.json(failed, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json([...projects.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50));
}
