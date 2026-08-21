'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { Project } from '@/lib/projects';

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
  const [style, setStyle] = useState('Word Pop');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch(`/api/projects/${params.id}`, { cache: 'no-store' });
      if (response.ok && !cancelled) setProject(await response.json());
    }
    load();
    return () => { cancelled = true; };
  }, [params.id]);

  const filtered = useMemo(() => project?.clips.filter(c => filter === 'All' || c.category === filter) ?? [], [project, filter]);

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

      <div className="toolbar">
        <select className="filter" value={filter} onChange={e=>setFilter(e.target.value)}>{categories.map(x=><option key={x}>{x}</option>)}</select>
        <select className="filter" value={style} onChange={e=>setStyle(e.target.value)}><option>Word Pop</option><option>Highlight</option><option>Fade</option><option>Bounce</option></select>
        <button className="filter">9:16</button><button className="filter">Auto crop</button><button className="filter">Captions: ON</button>
      </div>

      <div className="clips">
        {filtered.length === 0 && <div className="empty">No clips match this filter.</div>}
        {filtered.map((c, index) => {
          const checked = selected.includes(c.id);
          return <article className={`clip ${checked ? 'selected' : ''}`} key={c.id}>
            <div className="preview"><span className="score">{c.score}</span><span className="previewlabel">9:16 · {style}</span></div>
            <div className="clipbody"><div className="clipmeta">#{index + 1} · {c.category} · {timecode(c.start)}–{timecode(c.end)}</div><h3>{c.title}</h3><p>{c.reason}</p><p className="hook">“{c.hook}”</p>
              <div className="actions"><button className="secondary" onClick={() => setSelected(v => v.includes(c.id) ? v.filter(id => id !== c.id) : [...v, c.id])}>{checked ? 'Selected' : 'Select'}</button>{c.file && <a className="secondary" href={`/api/projects/${params.id}/clips/${encodeURIComponent(c.id)}`}>Preview / Download</a>}</div>
            </div>
          </article>;
        })}
      </div>
    </section>
  </main>;
}
