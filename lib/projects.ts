export type ClipCategory = 'Hook' | 'Insight' | 'Emotion' | 'Education' | 'Curiosity' | 'Quote' | 'Story' | 'Humor' | 'Other';

export type Clip = {
  id: string;
  title: string;
  hook: string;
  reason: string;
  category: ClipCategory | string;
  score: number;
  start: number;
  end: number;
  file?: string;
  captionTimeline?: string;
  language?: string;
};

export type Project = {
  id: string;
  sourceUrl: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  language?: string;
  model?: string;
  error?: string;
  clips: Clip[];
};

declare global {
  // eslint-disable-next-line no-var
  var aurelisProjects: Map<string, Project> | undefined;
}

export const projects = globalThis.aurelisProjects ?? new Map<string, Project>();
if (!globalThis.aurelisProjects) globalThis.aurelisProjects = projects;
