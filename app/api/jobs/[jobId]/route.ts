import { NextResponse } from 'next/server';

export async function GET(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const worker = process.env.WORKER_URL || 'http://localhost:8080';
  try {
    const response = await fetch(`${worker}/jobs/${jobId}`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Worker unavailable.' }, { status: 502 });
  }
}
