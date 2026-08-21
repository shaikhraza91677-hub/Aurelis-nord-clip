import { NextResponse } from 'next/server';
import { getBrand, saveBrand } from '@/lib/brand-store';
import { z } from 'zod';

const schema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  captionStyle: z.enum(['Word Pop', 'Highlight', 'Fade', 'Bounce']).optional(),
  captionLanguage: z.enum(['auto', 'hinglish', 'english', 'original']).optional(),
  aspectRatio: z.enum(['9:16', '1:1', '16:9']).optional(),
  framing: z.enum(['smart', 'center', 'left', 'right']).optional(),
  captionPosition: z.enum(['top', 'center', 'bottom']).optional(),
  captionSize: z.enum(['small', 'medium', 'large']).optional(),
  captionColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export async function GET() { return NextResponse.json(await getBrand()); }

export async function PATCH(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid brand preset.' }, { status: 400 });
  return NextResponse.json(await saveBrand(parsed.data));
}
