import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
const globalForPrisma=globalThis as typeof globalThis & {prisma?:PrismaClient};const prisma=globalForPrisma.prisma??new PrismaClient();if(process.env.NODE_ENV!=='production')globalForPrisma.prisma=prisma;
export async function GET(){const user=await getCurrentUser();if(!user)return NextResponse.json({error:'Sign in required.'},{status:401});return NextResponse.json(await prisma.brandPreset.findMany({where:{userId:user.id},orderBy:{updatedAt:'desc'}}));}
export async function POST(req:Request){const user=await getCurrentUser();if(!user)return NextResponse.json({error:'Sign in required.'},{status:401});const body=await req.json().catch(()=>({}));const name=String(body.name||'').trim().slice(0,80);if(!name)return NextResponse.json({error:'Preset name is required.'},{status:400});const row=await prisma.brandPreset.create({data:{id:crypto.randomUUID(),userId:user.id,name,config:body.config||{}}});return NextResponse.json(row,{status:201});}
