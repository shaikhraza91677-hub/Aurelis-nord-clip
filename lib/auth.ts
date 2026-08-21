import { createHash,randomBytes,scryptSync,timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';
const globalForPrisma=globalThis as typeof globalThis & {prisma?:PrismaClient};const prisma=globalForPrisma.prisma??new PrismaClient();if(process.env.NODE_ENV!=='production')globalForPrisma.prisma=prisma;
const SESSION_DAYS=30;const COOKIE='aurelis_session';export type AuthUser={id:string;email:string;name:string|null;plan:string};
function hashPassword(password:string,salt:Buffer){return scryptSync(password,salt,64).toString('hex')}
export function makePasswordHash(password:string){const salt=randomBytes(16);return `${salt.toString('hex')}:${hashPassword(password,salt)}`}
export function verifyPassword(password:string,stored:string){const [saltHex,digestHex]=stored.split(':');if(!saltHex||!digestHex)return false;const derived=Buffer.from(hashPassword(password,Buffer.from(saltHex,'hex')),'hex');const expected=Buffer.from(digestHex,'hex');return derived.length===expected.length&&timingSafeEqual(derived,expected)}
function tokenHash(token:string){return createHash('sha256').update(token).digest('hex')}
export async function createSession(userId:string){const token=randomBytes(32).toString('base64url');const expiresAt=new Date(Date.now()+SESSION_DAYS*86400000);await prisma.session.create({data:{id:randomBytes(16).toString('hex'),tokenHash:tokenHash(token),userId,expiresAt}});const jar=await cookies();jar.set(COOKIE,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',expires:expiresAt})}
export async function destroySession(){const jar=await cookies();const token=jar.get(COOKIE)?.value;if(token)await prisma.session.deleteMany({where:{tokenHash:tokenHash(token)}});jar.delete(COOKIE)}
export async function getCurrentUser():Promise<AuthUser|null>{const jar=await cookies();const token=jar.get(COOKIE)?.value;if(!token)return null;const session=await prisma.session.findUnique({where:{tokenHash:token},include:{user:true}});if(!session)return null;if(session.expiresAt<=new Date()){await prisma.session.delete({where:{id:session.id}}).catch(()=>undefined);return null}return{id:session.user.id,email:session.user.email,name:session.user.name,plan:session.user.plan}}
export async function requireUser(){const user=await getCurrentUser();if(!user)throw new Error('AUTH_REQUIRED');return user}
