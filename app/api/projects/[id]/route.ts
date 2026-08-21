import { NextResponse } from 'next/server';
import { defaultClipConfig, type ClipConfig } from '@/lib/projects';
import { hydrateWorkerResult } from '@/lib/hydrate';
import { loadProject, saveProject } from '@/lib/project-store';
import { z } from 'zod';

const configSchema = z.object({
  captionStyle: z.enum(['Word Pop', 'Highlight', 'Fade', 'Bounce']).optional(), captionLanguage: z.enum(['auto', 'hinglish', 'english', 'original']).optional(),
  aspectRatio: z.enum(['9:16', '1:1', '16:9']).optional(), framing: z.enum(['smart', 'center', 'left', 'right']).optional(),
  captionPosition: z.enum(['top', 'center', 'bottom']).optional(), captionSize: z.enum(['small', 'medium', 'large']).optional(),
  captionColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), showCaptions: z.boolean().optional(),
});

async function syncWorker(project: any) {
  if (!project.jobId || project.status === 'completed' || project.status === 'failed') return project;
  const worker = process.env.WORKER_URL || 'http://localhost:8080';
  try {
    const response = await fetch(`${worker}/jobs/${project.jobId}`, { cache: 'no-store' });
    if (!response.ok) return project;
    const job = await response.json();
    let next = project;
    if (job.status === 'completed' && job.result) {
      const completed = hydrateWorkerResult(job.result, project.id, project.sourceUrl, project.createdAt);
      next = { ...project, ...completed, jobId: project.jobId, sourcePath: project.sourcePath, customPrompt: project.customPrompt };
    } else if (job.status === 'failed') {
      next = { ...project, status: 'failed', progress: 100, stage: 'Failed', error: job.error || 'Worker job failed.' };
    } else {
      next = { ...project, status: 'processing', progress: Number(job.progress || project.progress || 0), stage: job.stage || project.stage };
    }
    await saveProject(next);
  } catch { /* transient worker failures are safe; browser keeps polling */ }
  return (await loadProject(project.id)) || project;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await loadProject(id);
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  return NextResponse.json(await syncWorker(project));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await loadProject(id);
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = configSchema.safeParse(body?.config);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid editor configuration.' }, { status: 400 });
  const nextConfig: ClipConfig = { ...defaultClipConfig, ...parsed.data };
  const next = { ...project, clips: project.clips.map(clip => ({ ...clip, config: { ...defaultClipConfig, ...clip.config, ...nextConfig } })) };
  await saveProject(next);
  return NextResponse.json(next);
}
