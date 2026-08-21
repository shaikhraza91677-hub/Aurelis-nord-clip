import type { Clip, Project } from './projects';

export function hydrateWorkerResult(result: any, id: string, sourceUrl: string, createdAt: string): Project {
  const clips: Clip[] = (result?.clips || []).map((clip: any, index: number) => ({
    id: `${id}-${index + 1}`,
    title: clip.title || `Aurelis clip ${index + 1}`,
    hook: clip.hookTransliterated || clip.hook || '',
    reason: clip.reason || '',
    description: clip.description || '',
    hashtags: Array.isArray(clip.hashtags) ? clip.hashtags : [],
    youtubeTitle: clip.youtubeTitle || clip.title || '',
    instagramCaption: clip.instagramCaption || '',
    tiktokCaption: clip.tiktokCaption || '',
    category: clip.category || 'Other',
    score: Math.max(0, Math.min(100, Math.round(Number(clip.score || 0)))),
    start: Number(clip.start || 0),
    end: Number(clip.end || 0),
    file: clip.file,
    thumbnail: clip.thumbnail,
    captionTimeline: clip.captionTimeline,
    language: result?.language,
    framing: clip.framing,
  }));
  return {
    id,
    sourceUrl,
    createdAt,
    customPrompt: result?.customPrompt || '',
    status: 'completed', progress: 100, stage: 'Complete',
    language: result?.language, model: result?.model,
    duration: Number(result?.duration || 0) || undefined,
    clips,
  };
}
