import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
export function middleware(req:NextRequest){const path=req.nextUrl.pathname;const protectedPage=path.startsWith('/projects/');if(protectedPage&&!req.cookies.get('aurelis_session')){const url=req.nextUrl.clone();url.pathname='/login';url.searchParams.set('next',path);return NextResponse.redirect(url);}return NextResponse.next();}
export const config={matcher:['/projects/:path*']};
