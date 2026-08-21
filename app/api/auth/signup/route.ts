import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createSession, makePasswordHash } from '@/lib/auth';

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim().slice(0, 80) || null;
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
  const user = await prisma.user.create({ data: { id: crypto.randomUUID(), email, passwordHash: makePasswordHash(password), name } });
  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
}
