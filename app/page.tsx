'use client';

import { FormEvent, useRef, useState } from 'react';

const features=[
  ['AI moment detection','Find hooks, punchlines, insights and emotional peaks instead of blindly slicing every N seconds.'],
  ['Language-aware captions','Detect the spoken language. Hindi captions are transliterated toward Hinglish while other languages remain native in the MVP.'],
  ['Smart vertical framing','Prepare a 9:16 crop plan around the active speaker and preserve multi-person conversations.'],
  ['Virality scoring','Rank candidate clips by hook strength, standalone context, payoff, pacing and shareability.'],
  ['Caption presets','Word-pop is live; Highlight, Fade and Bounce are staged as the next rendering presets.'],
  ['Ready-to-post metadata','Generate titles, hooks, descriptions and hashtags for each selected platform.'],
];

export default function Home(){
  const[url,setUrl]=useState('');
  const[loading,setLoading]=useState(false);
  const[message,setMessage]=useState('');
  const fileRef=useRef<HTMLInputElement>(null);

  async function submit(e:FormEvent){
    e.preventDefault(); setMessage('');
    if(!url.trim())return setMessage('Paste a video URL first.');
    setLoading(true);
    try{
      const res=await fetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||'Could not start the project.');
      window.location.href=`/projects/${data.id}`;
    }catch(err){setMessage(err instanceof Error?err.message:'Something went wrong.')}finally{setLoading(false)}
  }

  async function upload(){
    const file=fileRef.current?.files?.[0];
    if(!file)return setMessage('Choose a video file first.');
    setMessage(''); setLoading(true);
    try{
      const form=new FormData(); form.append('file',file);
      const res=await fetch('/api/uploads',{method:'POST',body:form});
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||'Upload failed.');
      window.location.href=`/projects/${data.id}`;
    }catch(err){setMessage(err instanceof Error?err.message:'Upload failed.')}finally{setLoading(false)}
  }

  return <main className="shell"><nav className="nav"><div className="brand">AURELIS <span>NORD</span></div><div className="navlinks"><span>How it works</span><span>Captions</span><span>Pricing</span></div><button className="secondary">Sign in</button></nav><section className="hero"><span className="eyebrow">AI VIDEO REPURPOSING · BUILT FOR SHORT-FORM</span><h1>Long video in.<br/><em>Scroll-stopping clips out.</em></h1><p>Paste a YouTube link or upload your media. Aurelis finds the moments worth posting, reframes them vertically, and builds captions around every spoken word.</p><form className="ingest" onSubmit={submit}><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste a YouTube, Twitch, Kick or video URL…" aria-label="Video URL"/><button className="primary" disabled={loading}>{loading?'Analyzing…':'Get clips'}</button></form><div className="drop"><input ref={fileRef} type="file" accept="video/*" hidden onChange={e=>e.currentTarget.files?.[0]&&setMessage(`Ready: ${e.currentTarget.files[0].name}`)}/><button className="secondary" type="button" onClick={()=>fileRef.current?.click()} disabled={loading}>Choose video</button><button className="primary" type="button" onClick={upload} disabled={loading}>Upload & analyze</button></div>{message&&<div className="error">{message}</div>}<div className="status">Only process videos you own or have permission to repurpose.</div></section><section className="features">{features.map(([title,desc])=><article className="card" key={title}><b>{title}</b><p>{desc}</p></article>)}</section></main>;
}
