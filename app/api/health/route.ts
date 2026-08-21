import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const workerUrl = process.env.WORKER_URL || 'http://localhost:8080';
  let worker: any = { ok: false, error: 'unreachable' };
  try {
    const response = await fetch(`${workerUrl}/health`, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    worker = await response.json().catch(() => ({ ok: response.ok }));
  } catch (error) {
    worker = { ok: false, error: error instanceof Error ? error.message : 'worker unavailable' };
  }
  return NextResponse.json({ ok: Boolean(worker.ok), service: 'aurelis-web', worker, databaseConfigured: Boolean(process.env.DATABASE_URL), aiConfigured: Boolean(process.env.OPENROUTER_API_KEY), timestamp: new Date().toISOString() }, { status: worker.ok ? 200 : 503 });
}
