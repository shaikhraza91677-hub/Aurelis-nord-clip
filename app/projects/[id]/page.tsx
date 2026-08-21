'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ClipConfig, Project } from '@/lib/projects';
import { defaultClipConfig } from '@/lib/projects';

const categories = ['All', 'Hook', 'Insight', 'Emotion', 'Education', 'Curiosity', 'Quote', 'Story', 'Humor'];

function timecode(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState<string[]>([]);
  const [config, setConfig] = useState<ClipConfig>(defaultClipConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch(`/api/projects/${params.id}`, { cache: 'no-store' });
      if (response.ok && !cancelled) {
        const data: Project = await response.json();
        setProject(data);
        setConfig(data.clips[0]?.config ?? defaultClipConfig);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [params.id]);

  const filtered = useMemo(() => project?.clips.filter(c => filter === 'All' || c.category === filter) ?? [], [project, filter]);

  async function saveConfig(next: Partial<ClipConfig>) {
    const merged = { ...config, ...next };
    setConfig(merged);
    setSaving(true);
    setSaved(false);
    try {
      const response = await fetch(`/api/projects/${params.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ config: merged }) });
      if (response.ok) setProject(await response.json());
      setSaved(response.ok);
    } finally { setSaving(false); }
  }

  if (!project) return <main className="shell"><div className="dashboard"><div className="loading">Loading project…</div></div></main>;

  return <main className="shell">
    <nav className="nav"><div className="brand">AURELIS <span>NORD</span></div><div className="navlinks"><span>Project</span><span>Brand</span><span>Exports</span></div><button className="secondary" onClick={() => window.location.href = '/'}>New project</button></nav>
    <section className="dashboard">
      <div className="dashhead">
        <div>
          <div className="muted" style={{fontSize:12, marginBottom:8}}>PROJECT / {project.status.toUpperCase()}</div>
          <h2>Your clips</h2>
          <div className="muted" style={{marginTop:8,fontSize:13, maxWidth:760, overflow:'hidden', textOverflow:'ellipsis'}}>{project.sourceUrl}</div>
          <div className="muted" style={{marginTop:6,fontSize:12}}>Language: {project.language || 'detecting'} · {project.clips.length} candidates · Model: {project.model || '—'}</div>
        </div>
        <button className="primary" disabled={!selected.length}>{selected.length ? `Render ${selected.length}` : 'Select clips to render'}</button>
      </div>

      {project.status === 'failed' && <div className="error">{project.error}</div>}
      {project.status === 'completed' && <div className="success">Analysis complete. Aurelis ranked the strongest moments by hook, payoff, context, pacing and shareability.</div>}

      <div className="editorbar">
        <div className="editor-group"><label>Caption</label><select className="filter" value={config.captionStyle} onChange={e=>saveConfig({ captionStyle: e.target.value as ClipConfig['captionStyle'] })}><option>Word Pop</option><option>Highlight</option><option>Fade</option><option>Bounce</option></select></div>
        <div className="editor-group"><label>Language</label><select className="filter" value={config.captionLanguage} onChange={e=>saveConfig({ captionLanguage: e.target.value as ClipConfig['captionLanguage'] })}><option value="auto">Auto</option><option value="hinglish">Hinglish</option><option value="english">English</option><option value="original">Original</option></select></div>
        <div className="editor-group"><label>Format</label><select className="filter" value={config.aspectRatio} onChange={e=>saveConfig({ aspectRatio: e.target.value as ClipConfig['aspectRatio'] })}><option>9:16</option><option>1:1</option><option>16:9</option></select></div>
        <div className="editor-group"><label>Framing</label><select className="filter" value={config.framing} onChange={e=>saveConfig({ framing: e.target.value as ClipConfig['framing'] })}><option value="smart">Smart speaker</option><option value="center">Center</option><option value="left">Left</option><option value="right">Right</option></select></div>
        <div className="editor-group"><label>Caption position</label><select className="filter" value={config.captionPosition} onChange={e=>saveConfig({ captionPosition: e.target.value as ClipConfig['captionPosition'] })}><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></div>
        <div className="editor-group"><label>Size</label><select className="filter" value={config.captionSize} onChange={e=>saveConfig({ captionSize: e.target.value as ClipConfig['captionSize'] })}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></div>
        <div className="editor-group"><label>Color</label><input className="color" type="color" value={config.captionColor} onChange={e=>saveConfig({ captionColor: e.target.value })} /></div>
        <button className="filter" onClick={() => saveConfig({ showCaptions: !config.showCaptions })}>{config.showCaptions ? 'Captions ON' : 'Captions OFF'}</button>
        <span className="save-state">{saving ? 'Saving…' : saved ? 'Saved' : ' '}</span>
      </div>

      <div className="toolbar"><select className="filter" value={filter} onChange={e=>setFilter(e.target.value)}>{categories.map(x=><option key={x}>{x}</option>)}</select><button className="filter" onClick={() => setSelected(filtered.map(c => c.id))}>Select visible</button><button className="filter" onClick={() => setSelected([])}>Clear</button></div>

      <div className="clips">
        {filtered.length === 0 && <div className="empty">No clips match this filter.</div>}
        {filtered.map((c, index) => {
          const checked = selected.includes(c.id);
          return <article className={`clip ${checked ? 'selected' : ''}`} key={c.id}>
            <div className="preview"><span className="score">{c.score}</span><span className="previewlabel">{config.aspectRatio} · {config.captionStyle} · {c.framing?.mode === 'smart' ? 'Smart crop' : 'Center crop'}</span></div>
            <div className="clipbody"><div className="clipmeta">#{index + 1} · {c.category} · {timecode(c.start)}–{timecode(c.end)}</div><h3>{c.title}</h3><p>{c.reason}</p><p className="hook">“{c.hook}”</p>
              <div className="actions"><button className="secondary" onClick={() => setSelected(v => v.includes(c.id) ? v.filter(id => id !== c.id) : [...v, c.id])}>{checked ? 'Selected' : 'Select'}</button>{c.file && <a className="secondary" href={`/api/projects/${params.id}/clips/${encodeURIComponent(c.id)}`}>Preview / Download</a>}</div>
            </div>
          </article>;
        })}
      </div>
    </section>
  </main>;
}
