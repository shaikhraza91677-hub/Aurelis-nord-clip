import { NextResponse } from 'next/server';
import { projects, defaultClipConfig, type ClipConfig } from '@/lib/projects';
import { hydrateWorkerResult } from '@/lib/hydrate';
import { z } from 'zod';

const configSchema = z.object({
  captionStyle: z.enum(['Word Pop', 'Highlight', 'Fade', 'Bounce']).optional(),
  captionLanguage: z.enum(['auto', 'hinglish', 'english', 'original']).optional(),
  aspectRatio: z.enum(['9:16', '1:1', '16:9']).optional(),
  framing: z.enum(['smart', 'center', 'left', 'right']).optional(),
  captionPosition: z.enum(['top', 'center', 'bottom']).optional(),
  captionSize: z.enum(['small', 'medium', 'large']).optional(),
  captionColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  showCaptions: z.boolean().optional(),
});

async function syncWorker(project: any) {
  if (!project.jobId || project.status === 'completed' || project.status === 'failed') return project;
  const worker = process.env.WORKER_URL || 'http://localhost:8080';
  try {
    const response = await fetch(`${worker}/jobs/${project.jobId}`, { cache: 'no-store' });
    if (!response.ok) return project;
    const job = await response.json();
    if (job.status === 'completed' && job.result) {
      const completed = hydrateWorkerResult(job.result, project.id, project.sourceUrl, project.createdAt);
      projects.set(project.id, { ...project, ...completed, jobId: project.jobId, sourcePath: project.sourcePath });
    } else if (job.status === 'failed') {
      projects.set(project.id, { ...project, status: 'failed', progress: 100, stage: 'Failed', error: job.error || 'Worker job failed.' });
    } else {
      projects.set(project.id, { ...project, status: 'processing', progress: Number(job.progress || project.progress || 0), stage: job.stage || project.stage });
    }
  } catch { /* transient worker failures are safe; browser keeps polling */ }
  return projects.get(project.id) || project;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = projects.get(id);
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  return NextResponse.json(await syncWorker(project));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = projects.get(id);
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = configSchema.safeParse(body?.config);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid editor configuration.' }, { status: 400 });

  const nextConfig: ClipConfig = { ...defaultClipConfig, ...parsed.data };
  const clips = project.clips.map(clip => ({ ...clip, config: { ...defaultClipConfig, ...clip.config, ...nextConfig } }));
  const next = { ...project, clips };
  projects.set(id, next);
  return NextResponse.json(next);
}
