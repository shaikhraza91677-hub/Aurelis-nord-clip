import { PrismaClient } from '@prisma/client';

export type BrandPreset = {
  id: string;
  name: string;
  captionStyle: 'Word Pop' | 'Highlight' | 'Fade' | 'Bounce';
  captionLanguage: 'auto' | 'hinglish' | 'english' | 'original';
  aspectRatio: '9:16' | '1:1' | '16:9';
  framing: 'smart' | 'center' | 'left' | 'right';
  captionPosition: 'top' | 'center' | 'bottom';
  captionSize: 'small' | 'medium' | 'large';
  captionColor: string;
};

export const defaultBrand: BrandPreset = {
  id: 'default', name: 'Aurelis Default', captionStyle: 'Word Pop', captionLanguage: 'auto',
  aspectRatio: '9:16', framing: 'smart', captionPosition: 'bottom', captionSize: 'medium', captionColor: '#FFFFFF',
};

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const enabled = Boolean(process.env.DATABASE_URL);
let memory = { ...defaultBrand };

export async function getBrand(): Promise<BrandPreset> {
  if (!enabled) return memory;
  try {
    const row = await prisma.brandPreset.findUnique({ where: { id: 'default' } });
    return row ? ({ ...defaultBrand, ...(row.config as any), id: row.id, name: row.name } as BrandPreset) : defaultBrand;
  } catch (error) {
    console.error('[brand-store] read failed', error);
    return memory;
  }
}

export async function saveBrand(next: Partial<BrandPreset>): Promise<BrandPreset> {
  memory = { ...memory, ...next, id: 'default' };
  const brand = memory;
  if (!enabled) return brand;
  try {
    await prisma.brandPreset.upsert({
      where: { id: 'default' },
      create: { id: 'default', name: brand.name, config: brand as any },
      update: { name: brand.name, config: brand as any },
    });
  } catch (error) {
    console.error('[brand-store] write failed', error);
  }
  return brand;
}
