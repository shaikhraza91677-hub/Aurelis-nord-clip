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
  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `inline; filename="${file}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
