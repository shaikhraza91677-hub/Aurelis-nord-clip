import { NextResponse } from 'next/server';
import { loadProject } from '@/lib/project-store';
import { z } from 'zod';

const schema = z.object({ clipIds: z.array(z.string()).min(1).max(20), transition: z.enum(['hard', 'normalize']).default('hard') });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await loadProject(id);
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Select at least one clip.' }, { status: 400 });
  const clips = parsed.data.clipIds.map(clipId => project.clips.find(c => c.id === clipId)).filter(Boolean);
  if (!clips.length) return NextResponse.json({ error: 'No matching clips.' }, { status: 404 });
  const files = clips.map(c => c!.file).filter((x): x is string => Boolean(x));
  if (!files.length) return NextResponse.json({ error: 'Render the clips before creating a supercut.' }, { status: 409 });
  const worker = process.env.WORKER_URL || 'http://localhost:8080';
  const out = `${process.env.WORKER_OUTPUT_DIR || './output'}/${id}-supercut.mp4`;
  const response = await fetch(`${worker}/supercut`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ files, out, transition: parsed.data.transition }), cache: 'no-store' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return NextResponse.json({ error: result.error || 'Could not queue supercut.' }, { status: 502 });
  return NextResponse.json({ jobId: result.jobId, status: result.status, output: out, clipCount: files.length }, { status: 202 });
}
