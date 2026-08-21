import { NextResponse } from 'next/server';
import { createReadStream, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { Readable } from 'node:stream';
import { projects } from '@/lib/projects';

async function syncRender(project: any, clip: any) {
  if (!clip.renderJobId || clip.renderStatus === 'completed' || clip.renderStatus === 'failed') return clip;
  const worker = process.env.WORKER_URL || 'http://localhost:8080';
  try {
    const response = await fetch(`${worker}/jobs/${clip.renderJobId}`, { cache: 'no-store' });
    if (!response.ok) return clip;
    const job = await response.json();
    let next = clip;
    if (job.status === 'completed' && job.result) {
      next = { ...clip, file: job.result.file, framing: { mode: job.result.framing || clip.config?.framing || 'smart', focusX: job.result.focusX }, renderStatus: 'completed', renderError: undefined };
    } else if (job.status === 'failed') {
      next = { ...clip, renderStatus: 'failed', renderError: job.error || 'Render failed.' };
    } else {
      next = { ...clip, renderStatus: job.status === 'queued' ? 'queued' : 'processing' };
    }
    projects.set(project.id, { ...project, clips: project.clips.map((c: any) => c.id === clip.id ? next : c) });
    return next;
  } catch { return clip; }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string; clipId: string }> }) {
  const { id, clipId } = await params;
  const project = projects.get(id);
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  let clip = project.clips.find(c => c.id === clipId);
  if (!clip) return NextResponse.json({ error: 'Clip not found.' }, { status: 404 });
  clip = await syncRender(project, clip);
  if (!clip.file) return NextResponse.json({ clip, ready: false });
  if (!existsSync(clip.file)) return NextResponse.json({ clip, ready: false, error: 'Rendered media is unavailable on the current worker volume.' });
  if (clip.renderStatus && clip.renderStatus !== 'completed') return NextResponse.json({ clip, ready: false });
  const file = basename(clip.file);
  const stream = Readable.toWeb(createReadStream(clip.file)) as ReadableStream;
  return new NextResponse(stream, { status: 200, headers: { 'Content-Type': 'video/mp4', 'Content-Disposition': `inline; filename="${file}"`, 'Cache-Control': 'private, max-age=3600' } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string; clipId: string }> }) {
  const { id, clipId } = await params;
  const project = projects.get(id);
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  const clip = project.clips.find(c => c.id === clipId);
  if (!clip) return NextResponse.json({ error: 'Clip not found.' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const config = body.config || clip.config || {};
  const source = project.sourcePath || project.sourceUrl;
  const workerUrl = process.env.WORKER_URL || 'http://localhost:8080';
  const outputDir = process.env.WORKER_OUTPUT_DIR || './output';
  const out = `${outputDir}/${id}-${clipId.replace(/[^a-zA-Z0-9_-]/g, '_')}-render.mp4`;

  try {
    const response = await fetch(`${workerUrl}/render-clip`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceUrl: source, start: clip.start, end: clip.end, out, config }), cache: 'no-store'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Render failed to queue.');
    const nextClip = { ...clip, config, renderJobId: result.jobId, renderStatus: 'queued' as const, renderError: undefined };
    projects.set(id, { ...project, clips: project.clips.map(c => c.id === clipId ? nextClip : c) });
    return NextResponse.json(nextClip, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Render failed.' }, { status: 502 });
  }
}
