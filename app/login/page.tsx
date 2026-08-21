'use client';
import { FormEvent, useState } from 'react';
export default function LoginPage() {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Login failed');window.location.href='/';}catch(err){setError(err instanceof Error?err.message:'Login failed')}finally{setBusy(false)}}
  return <main className="shell"><section className="hero"><span className="eyebrow">AURELIS ACCOUNT</span><h1>Welcome back.</h1><form className="authform" onSubmit={submit}><input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email" required/><input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" required/><button className="primary authbutton" disabled={busy}>{busy?'Signing in…':'Sign in'}</button>{error&&<div className="error">{error}</div>}<div className="status">New here? <a href="/signup">Create an account</a></div></form></section></main>;
}
