import { PrismaClient } from '@prisma/client';
import type { Project } from './projects';
import { projects } from './projects';

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const databaseEnabled = Boolean(process.env.DATABASE_URL);

function toDb(project: Project) {
  return {
    id: project.id,
    sourceUrl: project.sourceUrl,
    sourcePath: project.sourcePath,
    customPrompt: project.customPrompt,
    jobId: project.jobId,
    progress: project.progress ?? 0,
    stage: project.stage,
    status: project.status,
    createdAt: new Date(project.createdAt),
    language: project.language,
    model: project.model,
    duration: project.duration,
    error: project.error,
    clips: project.clips,
  };
}

function fromDb(row: any): Project {
  return {
    id: row.id,
    sourceUrl: row.sourceUrl,
    sourcePath: row.sourcePath ?? undefined,
    customPrompt: row.customPrompt ?? undefined,
    jobId: row.jobId ?? undefined,
    progress: row.progress ?? 0,
    stage: row.stage ?? undefined,
    status: row.status,
    createdAt: new Date(row.createdAt).toISOString(),
    language: row.language ?? undefined,
    model: row.model ?? undefined,
    duration: row.duration ?? undefined,
    error: row.error ?? undefined,
    clips: Array.isArray(row.clips) ? row.clips : [],
  };
}

export async function saveProject(project: Project): Promise<Project> {
  projects.set(project.id, project);
  if (!databaseEnabled) return project;
  try {
    await prisma.project.upsert({ where: { id: project.id }, create: toDb(project), update: toDb(project) });
  } catch (error) {
    console.error('[project-store] database write failed; using memory fallback', error);
  }
  return project;
}

export async function loadProject(id: string): Promise<Project | null> {
  const cached = projects.get(id);
  if (cached) return cached;
  if (!databaseEnabled) return null;
  try {
    const row = await prisma.project.findUnique({ where: { id } });
    if (!row) return null;
    const project = fromDb(row);
    projects.set(id, project);
    return project;
  } catch (error) {
    console.error('[project-store] database read failed', error);
    return null;
  }
}

export async function listProjects(limit = 50): Promise<Project[]> {
  if (databaseEnabled) {
    try {
      const rows = await prisma.project.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
      const result = rows.map(fromDb);
      for (const project of result) projects.set(project.id, project);
      return result;
    } catch (error) {
      console.error('[project-store] database list failed; using memory fallback', error);
    }
  }
  return [...projects.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}
