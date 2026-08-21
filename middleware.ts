import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
const buckets=new Map<string,{count:number;reset:number}>();
function limited(key:string,limit:number,windowMs:number){const now=Date.now();const item=buckets.get(key);if(!item||item.reset<now){buckets.set(key,{count:1,reset:now+windowMs});return false}item.count+=1;return item.count>limit}
export function middleware(req:NextRequest){const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';const path=req.nextUrl.pathname;const rateSensitive=path.startsWith('/api/auth/')||path==='/api/projects'||path==='/api/uploads';if(rateSensitive&&limited(`${ip}:${path}`,30,60000))return NextResponse.json({error:'Too many requests. Try again shortly.'},{status:429,headers:{'Retry-After':'60'}});if(path.startsWith('/projects/')&&!req.cookies.get('aurelis_session')){const url=req.nextUrl.clone();url.pathname='/login';url.searchParams.set('next',path);return NextResponse.redirect(url)}return NextResponse.next()}
export const config={matcher:['/projects/:path*','/api/auth/:path*','/api/projects','/api/uploads']};
