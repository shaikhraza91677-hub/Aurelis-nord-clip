import { NextResponse } from 'next/server';
import { z } from 'zod';
import { projects, type Clip } from '@/lib/projects';

const bodySchema = z.object({
  url: z.string().url(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid video URL.' }, { status: 400 });

  const id = crypto.randomUUID();
  const project = {
    id,
    sourceUrl: parsed.data.url,
    status: 'processing' as const,
    createdAt: new Date().toISOString(),
    clips: [] as Clip[],
  };
  projects.set(id, project);

  const workerUrl = process.env.WORKER_URL || 'http://localhost:8080';

  try {
    const workerResponse = await fetch(`${workerUrl}/process`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: parsed.data.url, out: process.env.WORKER_OUTPUT_DIR || './output' }),
      cache: 'no-store',
    });

    const result = await workerResponse.json().catch(() => ({}));
    if (!workerResponse.ok) throw new Error(result.error || 'Media worker failed.');

    const clips: Clip[] = (result.clips || []).map((clip: any, index: number) => ({
      id: `${id}-${index + 1}`,
      title: clip.title || `Aurelis clip ${index + 1}`,
      hook: clip.hook || '',
      reason: clip.reason || '',
      category: clip.category || 'Other',
      score: Math.round(Number(clip.score || 0)),
      start: Number(clip.start || 0),
      end: Number(clip.end || 0),
      file: clip.file,
      captionTimeline: clip.captionTimeline,
      language: result.language,
    }));

    const completed = {
      ...project,
      status: 'completed' as const,
      language: result.language,
      model: result.model,
      clips,
    };
    projects.set(id, completed);
    return NextResponse.json(completed, { status: 202 });
  } catch (error) {
    const failed = { ...project, status: 'failed' as const, error: error instanceof Error ? error.message : 'Processing failed.' };
    projects.set(id, failed);
    return NextResponse.json(failed, { status: 502 });
  }
}
