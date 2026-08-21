import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadProject } from '@/lib/project-store';

function srtTime(seconds: number) {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(totalMs / 3600000);
  const m = Math.floor((totalMs % 3600000) / 60000);
  const s = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function vttTime(seconds: number) { return srtTime(seconds).replace(',', '.'); }

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await loadProject(id);
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
  const sourceFile = project.clips.find(c => c.file)?.file;
  if (!sourceFile) return NextResponse.json({ error: 'No rendered clip is available yet.' }, { status: 409 });
  try {
    const manifestPath = path.join(path.dirname(sourceFile), 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const transcript = manifest.transcript || {};
    const format = new URL(req.url).searchParams.get('format') || 'txt';
    const words = Array.isArray(transcript.words) ? transcript.words : [];
    if (format === 'json') return NextResponse.json(transcript);
    if (format === 'txt') return new NextResponse(String(transcript.text || ''), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="${id}.txt"` } });
    const cues = words.map((word: any, index: number) => ({ index: index + 1, start: Number(word.start), end: Number(word.end), text: String(word.word || '') }));
    if (format === 'vtt') {
      const body = ['WEBVTT', '', ...cues.map(c => `${c.index}\n${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text}\n`)].join('\n');
      return new NextResponse(body, { headers: { 'Content-Type': 'text/vtt; charset=utf-8', 'Content-Disposition': `attachment; filename="${id}.vtt"` } });
    }
    const body = cues.map(c => `${c.index}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join('\n');
    return new NextResponse(body, { headers: { 'Content-Type': 'application/x-subrip; charset=utf-8', 'Content-Disposition': `attachment; filename="${id}.srt"` } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Transcript unavailable.' }, { status: 500 });
  }
}
