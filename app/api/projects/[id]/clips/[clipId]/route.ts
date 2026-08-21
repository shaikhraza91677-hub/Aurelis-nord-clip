import { NextResponse } from 'next/server';
import { createReadStream, existsSync } from 'node:fs';
import { basename } from 'node:path';
import { Readable } from 'node:stream';
import { projects } from '@/lib/projects';

export async function GET(_: Request, { params }: { params: Promise<{ id: string; clipId: string }> }) {
  const { id, clipId } = await params;
  const project = projects.get(id);
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  const clip = project.clips.find(c => c.id === clipId);
  if (!clip?.file) return NextResponse.json({ error: 'Rendered clip not found.' }, { status: 404 });
  const file = basename(clip.file);
  if (!file.endsWith('.mp4') || !existsSync(clip.file)) return NextResponse.json({ error: 'Rendered media is unavailable. Keep the worker output directory shared with the Next.js process.' }, { status: 404 });
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
    const response = await fetch(`${workerUrl}/render-clip`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sourceUrl: source, start: clip.start, end: clip.end, out, config }), cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Render failed.');
    const nextClip = { ...clip, file: result.file, config, framing: { mode: config.framing || 'smart', focusX: result.focusX } };
    projects.set(id, { ...project, clips: project.clips.map(c => c.id === clipId ? nextClip : c) });
    return NextResponse.json(nextClip);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Render failed.' }, { status: 502 });
  }
}
