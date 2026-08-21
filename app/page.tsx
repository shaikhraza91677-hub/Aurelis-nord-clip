'use client';

import { FormEvent, useRef, useState } from 'react';

const features = [
  ['AI moment detection', 'Find hooks, punchlines, insights and emotional peaks instead of blindly slicing every N seconds.'],
  ['Language-aware captions', 'Hindi becomes Latin-script Hinglish. Other spoken languages are translated into English captions.'],
  ['Smart vertical framing', 'Detect faces and bias each 9:16 crop toward the likely active speaker.'],
  ['Virality scoring', 'Rank candidates by hook strength, standalone context, payoff, pacing and shareability.'],
  ['Caption presets', 'Word-pop, highlight, fade and bounce styles with size, position and color controls.'],
  ['Ready-to-post metadata', 'Generate titles, hooks, descriptions and hashtags for each selected platform.'],
];

export default function Home() {
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    if (!url.trim()) return setMessage('Paste a video URL first.');
    setLoading(true);
    try {
      const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, prompt }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start the project.');
      window.location.href = `/projects/${data.id}`;
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Something went wrong.'); }
    finally { setLoading(false); }
  }

  async function upload(file?: File) {
    if (!file) return;
    setMessage('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file); form.append('prompt', prompt);
      const res = await fetch('/api/uploads', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      window.location.href = `/projects/${data.id}`;
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Upload failed.'); }
    finally { setUploading(false); }
  }

  return <main className="shell">
    <nav className="nav"><div className="brand">AURELIS <span>NORD</span></div><div className="navlinks"><span>How it works</span><span>Captions</span><span>Pricing</span></div><button className="secondary">Sign in</button></nav>
    <section className="hero">
      <span className="eyebrow">AI VIDEO REPURPOSING · BUILT FOR SHORT-FORM</span>
      <h1>Long video in.<br/><em>Scroll-stopping clips out.</em></h1>
      <p>Paste a YouTube link or upload your media. Aurelis finds the moments worth posting, reframes them around the speaker, and builds captions around every spoken word.</p>
      <form className="ingest" onSubmit={submit}><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste a YouTube, Twitch, Kick or video URL…" aria-label="Video URL"/><button className="primary" disabled={loading}>{loading ? 'Queueing…' : 'Get clips'}</button></form>
      <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={500} className="promptbox" placeholder="Optional: tell Aurelis what to hunt for — e.g. ‘Find the funniest moments and controversial takes’ or ‘Only business lessons’." aria-label="Custom clipping instruction" />
      <input ref={inputRef} type="file" accept="video/*" hidden onChange={e=>upload(e.target.files?.[0])}/>
      <button className="drop dropbutton" disabled={uploading} onClick={() => inputRef.current?.click()}>{uploading ? 'Uploading and queueing…' : 'Upload a video file · up to 500 MB'}</button>
      {message && <div className="error">{message}</div>}
      <div className="status">Only process videos you own or have permission to repurpose.</div>
    </section>
    <section className="features">{features.map(([title,desc])=><article className="card" key={title}><b>{title}</b><p>{desc}</p></article>)}</section>
  </main>;
}
