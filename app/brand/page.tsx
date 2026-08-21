'use client';

import { useEffect, useState } from 'react';
import type { BrandPreset } from '@/lib/brand-store';

export default function BrandPage() {
  const [brand, setBrand] = useState<BrandPreset | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetch('/api/brand').then(r => r.json()).then(setBrand).catch(() => undefined); }, []);

  async function save(patch: Partial<BrandPreset>) {
    if (!brand) return;
    const next = { ...brand, ...patch };
    setBrand(next); setSaving(true);
    try {
      const r = await fetch('/api/brand', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) });
      if (r.ok) setBrand(await r.json());
    } finally { setSaving(false); }
  }

  if (!brand) return <main className="shell"><section className="dashboard"><div className="loading">Loading brand preset…</div></section></main>;

  return <main className="shell">
    <nav className="nav"><div className="brand">AURELIS <span>NORD</span></div><div className="navlinks"><span>Brand</span><span>Project</span><span>Exports</span></div><button className="secondary" onClick={() => window.location.href='/'}>Home</button></nav>
    <section className="dashboard">
      <div className="dashhead"><div><div className="muted" style={{fontSize:12,marginBottom:8}}>BRAND SYSTEM</div><h2>{brand.name}</h2><div className="muted" style={{marginTop:8,fontSize:13}}>Save your default visual language once, then reuse it across projects.</div></div><div className="muted" style={{fontSize:12}}>{saving ? 'Saving…' : 'Saved'}</div></div>
      <div className="editorbar">
        <div className="editor-group"><label>Name</label><input className="filter" value={brand.name} onChange={e=>setBrand({...brand,name:e.target.value})} onBlur={()=>save({name:brand.name})}/></div>
        <div className="editor-group"><label>Caption</label><select className="filter" value={brand.captionStyle} onChange={e=>save({captionStyle:e.target.value as BrandPreset['captionStyle']})}><option>Word Pop</option><option>Highlight</option><option>Fade</option><option>Bounce</option></select></div>
        <div className="editor-group"><label>Language</label><select className="filter" value={brand.captionLanguage} onChange={e=>save({captionLanguage:e.target.value as BrandPreset['captionLanguage']})}><option value="auto">Auto</option><option value="hinglish">Hinglish</option><option value="english">English</option><option value="original">Original</option></select></div>
        <div className="editor-group"><label>Format</label><select className="filter" value={brand.aspectRatio} onChange={e=>save({aspectRatio:e.target.value as BrandPreset['aspectRatio']})}><option>9:16</option><option>1:1</option><option>16:9</option></select></div>
        <div className="editor-group"><label>Framing</label><select className="filter" value={brand.framing} onChange={e=>save({framing:e.target.value as BrandPreset['framing']})}><option value="smart">Smart speaker</option><option value="center">Center</option><option value="left">Left</option><option value="right">Right</option></select></div>
        <div className="editor-group"><label>Position</label><select className="filter" value={brand.captionPosition} onChange={e=>save({captionPosition:e.target.value as BrandPreset['captionPosition']})}><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></div>
        <div className="editor-group"><label>Size</label><select className="filter" value={brand.captionSize} onChange={e=>save({captionSize:e.target.value as BrandPreset['captionSize']})}><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></div>
        <div className="editor-group"><label>Color</label><input className="color" type="color" value={brand.captionColor} onChange={e=>save({captionColor:e.target.value})}/></div>
      </div>
      <div className="card" style={{maxWidth:480}}><b>Preset preview</b><p style={{color:brand.captionColor,fontSize:38,fontWeight:800,margin:'20px 0',textAlign:'center'}}>Your words<br/>look like <span style={{color:'#a9ff4f'}}>your brand.</span></p><p className="muted">The preset is stored centrally and can be applied to future projects.</p></div>
    </section>
  </main>;
}
