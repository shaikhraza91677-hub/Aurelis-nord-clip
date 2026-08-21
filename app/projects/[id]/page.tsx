'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import type { ClipConfig, Project } from '@/lib/projects';
import { defaultClipConfig } from '@/lib/projects';

const categories = ['All', 'Hook', 'Insight', 'Emotion', 'Education', 'Curiosity', 'Quote', 'Story', 'Humor', 'Other'];

function timecode(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState<string[]>([]);
  const [config, setConfig] = useState<ClipConfig>(defaultClipConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rendering, setRendering] = useState<string | null>(null);

  async function load() {
    const response = await fetch(`/api/projects/${id}`, { cache: 'no-store' });
    if (!response.ok) return;
    const data: Project = await response.json();
    setProject(data);
    if (data.clips[0]?.config) setConfig(data.clips[0].config);
  }

  useEffect(() => {
    let disposed = false;
    const tick = async () => { if (!disposed) await load(); };
    void tick();
    const timer = window.setInterval(() => void tick(), 2500);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [id]);

  const filtered = useMemo(() => project?.clips.filter(c => filter === 'All' || c.category === filter) ?? [], [project, filter]);

  async function saveConfig(next: Partial<ClipConfig>) {
    const merged = { ...config, ...next };
    setConfig(merged);
    setSaving(true); setSaved(false);
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ config: merged }),
      });
      if (response.ok) setProject(await response.json());
      setSaved(response.ok);
    } finally { setSaving(false); }
  }

  async function renderClip(clipId: string) {
    setRendering(clipId);
    try {
      const response = await fetch(`/api/projects/${id}/clips/${clipId}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (response.ok || response.status === 202) await load();
    } finally { setRendering(null); }
  }

  async function renderSelected() {
    for (const clipId of selected) await renderClip(clipId);
    setSelected([]);
  }

  if (!project) return <main className="shell"><div className="dashboard"><div className="loading">Loading project…</div></div></main>;

  const processing = project.status === 'queued' || project.status === 'processing';

  return <main className="shell">
    <nav className="nav"><div className="brand">AURELIS <span>NORD</span></div><div className="navlinks"><span>Project</span><span>Brand</span><span>Exports</span></div><button className="secondary" onClick={() => window.location.href='/'}>New project</button></nav>
    <section className="dashboard">
      <div className="dashhead">
        <div>
          <div className="muted" style={{fontSize:12, marginBottom:8}}>PROJECT / {project.status.toUpperCase()}</div>
          <h2>Your clips</h2>
          <div className="muted" style={{marginTop:8,fontSize:13,maxWidth:760,overflow:'hidden',textOverflow:'ellipsis'}}>{project.sourceUrl}</div>
          <div className="muted" style={{marginTop:6,fontSize:12}}>{project.language ? `Language: ${project.language}` : 'Detecting language'} · {project.clips.length} candidates · {project.model || 'AI model pending'}</div>
        </div>
        <button className="primary" disabled={!selected.length || processing || !!rendering} onClick={renderSelected}>{selected.length ? `Render ${selected.length}` : 'Select clips to render'}</button>
      </div>

      {processing && <div className="progressbox"><div className="progressrow"><b>{project.stage || 'Processing'}</b><span>{project.progress || 0}%</span></div><div className="progress"><span style={{width:`${Math.max(3,project.progress || 0)}%`}}/></div><p>Long videos are processed in the background. You can leave this page open; it will update automatically.</p></div>}
      {project.status === 'failed' && <div className="error">{project.error}</div>}
      {project.status === 'completed' && <div className="success">Analysis complete. Aurelis ranked moments by hook, payoff, context, pacing and shareability.</div>}

      <div className="editorbar">
        <div className="editor-group"><label>Caption</label><select className="filter" value={config.captionStyle} onChange={e=>saveConfig({captionStyle:e.target.value as ClipConfig['captionStyle']})}><option>Word Pop</option><option>Highlight</option><option>Fade</option><option>Bounce</option></select></div>
        <div className="editor-group"><label>Language</label><select className="filter" value={config.captionLanguage} onChange={e=>saveConfig({captionLanguage:e.target.value as ClipConfig['captionLanguage']})}><option value="auto">Auto</option><option value="hinglish">Hinglish</option><option value="english">English</option><option value="original">Original</option></select></div>
        <div className="editor-group"><label>Format</label><select className="filter" value={config.aspectRatio} onChange={e=>saveConfig({aspectRatio:e.target.value as ClipConfig['aspectRatio']})}><option>9:16</option><option>1:1</option><option>16:9</option></select></div>
        <div className="editor-group"><label>Framing</label><select className="filter" value={config.framing} onChange={e=>saveConfig({framing:e.target.value as ClipConfig['framing']})}><option value="smart">Smart speaker</option><option value="center">Center</option><option value="left">Left</option><option value="right">Right</option></select></div>
        <div className="editor-group"><label>Position</label><select className="filter" value={config.captionPosition} onChange={e=>saveConfig({captionPosition:e.target.value as ClipConfig['captionPosition']})}><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></div>
        <div className="editor-group"><label>Size</label><select className="filter" value={config.captionSize} onChange={e=>saveConfig({captionSize:e.target.value as ClipConfig['captionSize']})}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></div>
        <div className="editor-group"><label>Color</label><input className="color" type="color" value={config.captionColor} onChange={e=>saveConfig({captionColor:e.target.value})}/></div>
        <button className="filter" onClick={()=>saveConfig({showCaptions:!config.showCaptions})}>{config.showCaptions ? 'Captions ON' : 'Captions OFF'}</button>
        <span className="save-state">{saving ? 'Saving…' : saved ? 'Saved' : ''}</span>
      </div>

      <div className="toolbar"><select className="filter" value={filter} onChange={e=>setFilter(e.target.value)}>{categories.map(x=><option key={x}>{x}</option>)}</select><button className="filter" onClick={()=>setSelected(filtered.map(c=>c.id))}>Select visible</button><button className="filter" onClick={()=>setSelected([])}>Clear</button></div>

      <div className="clips">
        {filtered.length===0 && <div className="empty">{processing ? 'Aurelis is finding the strongest moments…' : 'No clips match this filter.'}</div>}
        {filtered.map((c,index)=>{
          const checked=selected.includes(c.id);
          const ready=Boolean(c.file) && c.renderStatus !== 'queued' && c.renderStatus !== 'processing';
          return <article className={`clip ${checked?'selected':''}`} key={c.id}>
            <div className="preview">
              {ready && <video className="previewvideo" controls preload="metadata" src={`/api/projects/${id}/clips/${encodeURIComponent(c.id)}`} />}
              <span className="score">{c.score}</span>
              <span className="previewlabel">{config.aspectRatio} · {config.captionStyle} · {c.framing?.mode || 'smart'}</span>
            </div>
            <div className="clipbody">
              <div className="clipmeta">#{index+1} · {c.category} · {timecode(c.start)}–{timecode(c.end)}</div>
              <h3>{c.title}</h3><p>{c.reason}</p><p className="hook">“{c.hook}”</p>
              {c.description && <p className="description">{c.description}</p>}
              {c.hashtags?.length ? <div className="tags">{c.hashtags.map(tag=><span key={tag}>{tag}</span>)}</div> : null}
              {c.renderStatus && c.renderStatus !== 'completed' && <div className="muted" style={{fontSize:12,marginTop:8}}>{c.renderStatus === 'failed' ? c.renderError : `Render ${c.renderStatus}…`}</div>}
              <div className="actions">
                <button className="secondary" onClick={()=>setSelected(v=>v.includes(c.id)?v.filter(id=>id!==c.id):[...v,c.id])}>{checked?'Selected':'Select'}</button>
                <button className="secondary" disabled={processing || rendering===c.id} onClick={()=>renderClip(c.id)}>{rendering===c.id ? 'Queueing…' : ready ? 'Re-render' : 'Get clip'}</button>
                {ready && <a className="secondary" download href={`/api/projects/${id}/clips/${encodeURIComponent(c.id)}`}>Download</a>}
              </div>
            </div>
          </article>;
        })}
      </div>
    </section>
  </main>;
}
