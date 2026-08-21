export type ClipCategory = 'Hook' | 'Insight' | 'Emotion' | 'Education' | 'Curiosity' | 'Quote' | 'Story' | 'Humor' | 'Other';
export type CaptionStyle = 'Word Pop' | 'Highlight' | 'Fade' | 'Bounce';
export type AspectRatio = '9:16' | '1:1' | '16:9';

export type ClipConfig = {
  captionStyle: CaptionStyle; captionLanguage: 'auto' | 'hinglish' | 'english' | 'original';
  aspectRatio: AspectRatio; framing: 'smart' | 'center' | 'left' | 'right';
  captionPosition: 'top' | 'center' | 'bottom'; captionSize: 'small' | 'medium' | 'large';
  captionColor: string; showCaptions: boolean;
};

export const defaultClipConfig: ClipConfig = { captionStyle: 'Word Pop', captionLanguage: 'auto', aspectRatio: '9:16', framing: 'smart', captionPosition: 'bottom', captionSize: 'medium', captionColor: '#FFFFFF', showCaptions: true };

export type Clip = {
  id: string; title: string; hook: string; reason: string; description?: string; hashtags?: string[];
  youtubeTitle?: string; instagramCaption?: string; tiktokCaption?: string; category: ClipCategory | string;
  score: number; start: number; end: number; file?: string; captionTimeline?: string; language?: string;
  framing?: { mode: string; focusX?: number }; config?: ClipConfig;
  renderJobId?: string; renderStatus?: 'idle' | 'queued' | 'processing' | 'completed' | 'failed'; renderError?: string;
};

export type Project = {
  id: string; sourceUrl: string; sourcePath?: string; customPrompt?: string; jobId?: string;
  progress?: number; stage?: string; status: 'queued' | 'processing' | 'completed' | 'failed'; createdAt: string;
  language?: string; model?: string; duration?: number; error?: string; clips: Clip[];
};

declare global { var aurelisProjects: Map<string, Project> | undefined; }
export const projects = globalThis.aurelisProjects ?? new Map<string, Project>();
if (!globalThis.aurelisProjects) globalThis.aurelisProjects = projects;
