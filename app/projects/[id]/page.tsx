'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

const demo = [
  { title:'The insight everyone misses', score:96, time:'00:42 – 01:31', reason:'Strong hook + complete payoff', tags:['Hook','Insight'] },
  { title:'A brutally honest answer', score:92, time:'12:08 – 12:57', reason:'High emotional tension', tags:['Emotion','Punchline'] },
  { title:'This changes the whole story', score:88, time:'24:16 – 25:04', reason:'Standalone educational moment', tags:['Education','Story'] },
  { title:'The unexpected turning point', score:84, time:'37:20 – 38:11', reason:'Curiosity gap + payoff', tags:['Curiosity'] },
  { title:'One sentence worth clipping', score:81, time:'49:02 – 49:44', reason:'Short, quotable and clear', tags:['Quote'] },
  { title:'The final takeaway', score:78, time:'58:10 – 59:06', reason:'Useful conclusion', tags:['Takeaway'] },
];

export default function Project() {
  const params=useSearchParams();
  const source=params.get('source') || 'Video source';
  const [filter,setFilter]=useState('All');
  const [style,setStyle]=useState('Word Pop');
  const filtered=useMemo(()=>filter==='All'?demo:demo.filter(c=>c.tags.includes(filter)),[filter]);
  return <main className="shell"><nav className="nav"><div className="brand">AURELIS <span>NORD</span></div><div className="navlinks"><span>Project</span><span>Brand</span><span>Exports</span></div><button className="secondary">New project</button></nav>
    <section className="dashboard"><div className="dashhead"><div><div className="muted" style={{fontSize:12,marginBottom:8}}>PROJECT / AI ANALYSIS</div><h2>Your clips</h2><div className="muted" style={{marginTop:8,fontSize:13}}>{source}</div></div><button className="primary">Render selected</button></div>
      <div className="toolbar"><select className="filter" value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Hook</option><option>Insight</option><option>Emotion</option><option>Education</option><option>Curiosity</option><option>Quote</option></select><select className="filter" value={style} onChange={e=>setStyle(e.target.value)}><option>Word Pop</option><option>Highlight</option><option>Fade</option><option>Bounce</option></select><button className="filter">9:16</button><button className="filter">Auto crop</button><button className="filter">Captions: ON</button></div>
      <div className="clips">{filtered.map(c=><article className="clip" key={c.title}><div className="preview"><span className="score">{c.score}</span></div><div className="clipbody"><h3>{c.title}</h3><p>{c.time} · {c.reason}</p><div className="actions"><button className="secondary">Preview</button><button className="secondary">Render</button></div></div></article>)}</div>
    </section>
  </main>;
}