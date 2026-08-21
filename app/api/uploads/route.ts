import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { projects, type Clip, defaultClipConfig } from '@/lib/projects';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Attach a video file.' }, { status: 400 });
  if (!file.type.startsWith('video/')) return NextResponse.json({ error: 'Only video files are supported.' }, { status: 400 });
  if (file.size > 500 * 1024 * 1024) return NextResponse.json({ error: 'Maximum upload size for the MVP is 500 MB.' }, { status: 413 });

  const id = crypto.randomUUID();
  const uploadDir = path.join(process.cwd(), 'uploads');
  await mkdir(uploadDir, { recursive: true });
  const ext = path.extname(file.name) || '.mp4';
  const savedPath = path.join(uploadDir, `${id}${ext}`);
  await writeFile(savedPath, Buffer.from(await file.arrayBuffer()));

  const project = { id, sourceUrl: `upload://${file.name}`, sourcePath: savedPath, status: 'processing' as const, createdAt: new Date().toISOString(), clips: [] as Clip[] };
  projects.set(id, project);

  try {
    const workerUrl = process.env.WORKER_URL || 'http://localhost:8080';
    const response = await fetch(`${workerUrl}/process-file`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: savedPath, out: process.env.WORKER_OUTPUT_DIR || './output' }), cache: 'no-store',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Media worker failed.');

    const clips: Clip[] = (result.clips || []).map((clip: any, index: number) => ({
      id: `${id}-${index + 1}`, title: clip.title || `Aurelis clip ${index + 1}`,
      hook: clip.hookTransliterated || clip.hook || '', reason: clip.reason || '', category: clip.category || 'Other',
      score: Math.round(Number(clip.score || 0)), start: Number(clip.start || 0), end: Number(clip.end || 0),
      file: clip.file, captionTimeline: clip.captionTimeline, language: result.language,
      framing: clip.framing, config: defaultClipConfig,
    }));
    const completed = { ...project, status: 'completed' as const, language: result.language, model: result.model, clips };
    projects.set(id, completed);
    return NextResponse.json(completed, { status: 202 });
  } catch (error) {
    const failed = { ...project, status: 'failed' as const, error: error instanceof Error ? error.message : 'Processing failed.' };
    projects.set(id, failed);
    return NextResponse.json(failed, { status: 502 });
  }
}
