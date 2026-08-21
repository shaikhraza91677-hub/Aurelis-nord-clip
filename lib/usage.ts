import { PrismaClient } from '@prisma/client';
const globalForPrisma=globalThis as typeof globalThis & {prisma?:PrismaClient};const prisma=globalForPrisma.prisma??new PrismaClient();if(process.env.NODE_ENV!=='production')globalForPrisma.prisma=prisma;
const LIMITS={free:3,pro:100};
export async function canProcess(userId:string,plan:string){const since=new Date();since.setUTCDate(1);since.setUTCHours(0,0,0,0);const used=await prisma.usageLedger.aggregate({where:{userId,kind:'process',createdAt:{gte:since}},_sum:{units:true}});const limit=LIMITS[plan as keyof typeof LIMITS]||LIMITS.free;return {allowed:(used._sum.units||0)<limit,used:used._sum.units||0,limit};}
export async function recordUsage(userId:string,kind:string,units=1){await prisma.usageLedger.create({data:{id:crypto.randomUUID(),userId,kind,units}});}
