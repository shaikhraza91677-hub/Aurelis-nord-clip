import { NextResponse } from 'next/server';
import { createReadStream, existsSync } from 'node:fs';
import { Readable } from 'node:stream';
import { loadProject } from '@/lib/project-store';

export async function GET(_: Request, { params }: { params: Promise<{ id: string; clipId: string }> }) {
  const { id, clipId } = await params;
  const project = await loadProject(id);
  const clip = project?.clips.find(c => c.id === clipId);
  if (!project || !clip?.thumbnail || !existsSync(clip.thumbnail)) return NextResponse.json({ error: 'Thumbnail not found.' }, { status: 404 });
  const stream = Readable.toWeb(createReadStream(clip.thumbnail)) as ReadableStream;
  return new NextResponse(stream, { status: 200, headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600' } });
}
