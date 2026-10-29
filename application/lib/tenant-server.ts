import {env} from 'cloudflare:workers';
import {headers} from 'next/headers';
import {and,eq,lt} from 'drizzle-orm';
import {getDb} from '../db';
import {businesses,connections} from '../db/schema';
import {sealTokens,unsealTokens} from './tenant-security.mjs';
import {integrationStatus,merchantPaymentReady} from './launch-readiness.mjs';
export type Business=typeof businesses.$inferSelect;
export type Connection=typeof connections.$inferSelect;
type Runtime={RAZORPAY_OAUTH_CLIENT_ID?:string;RAZORPAY_OAUTH_CLIENT_SECRET?:string;RAZORPAY_OAUTH_CLIENT_MODE?:string;TOKEN_ENCRYPTION_KEY?:string;RAZORPAY_PARTNER_WEBHOOK_SECRET?:string;RAZORPAY_PARTNER_APPROVED?:string;PLATFORM_PAYMENTS_ENABLED?:string;PLATFORM_LAUNCH_REVIEWED?:string;PLATFORM_TEST_PAYMENTS_ENABLED?:string;APP_ORIGIN?:string};
export const runtime=()=>env as typeof env&Runtime;
export function reportFailure(area:string){console.error(JSON.stringify({event:'omsetra_request_failed',area,timestamp:new Date().toISOString()}))}
export const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
export async function currentUser(){return (await headers()).get('oai-authenticated-user-id')}
export async function ownedBusiness(){const user=await currentUser();if(!user)return null;return (await getDb().select().from(businesses).where(eq(businesses.ownerId,user)))[0]||null}
export function requireOrigin(request:Request){if(request.headers.get('origin')!==new URL(request.url).origin)throw new Error('Invalid request origin.');if(!request.headers.get('content-type')?.includes('application/json'))throw new Error('JSON required.')}
export function oauthConfigured(){return integrationStatus(runtime()).oauth}
export async function connectionFor(id:string){return (await getDb().select().from(connections).where(eq(connections.businessId,id)))[0]||null}
export function paymentReady(b:Business,c:Connection|null){return merchantPaymentReady(runtime(),b,c)}
type TokenResponse={access_token:string;refresh_token:string;public_token:string;expires_in:number;razorpay_account_id?:string;token_type:string};
export async function authRequest(path:'token'|'revoke',body:Record<string,unknown>){const s=runtime();const r=await fetch('https://auth.razorpay.com/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:s.RAZORPAY_OAUTH_CLIENT_ID,client_secret:s.RAZORPAY_OAUTH_CLIENT_SECRET,...body}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('Razorpay authorization could not be completed. Reconnect or contact support.');return r.json() as Promise<TokenResponse>}
export async function accessToken(c:Connection){const s=runtime();let tokens=await unsealTokens(c.encryptedTokens,s.TOKEN_ENCRYPTION_KEY,c.businessId+':'+c.mode) as {access:string;refresh:string};if(c.expiresAt>Date.now()+120000)return tokens.access;
 const db=getDb();const lease=await db.update(connections).set({leaseUntil:Date.now()+30000}).where(and(eq(connections.businessId,c.businessId),eq(connections.encryptedTokens,c.encryptedTokens),eq(connections.status,'connected'),lt(connections.leaseUntil,Date.now()))).returning({id:connections.businessId});if(!lease.length)throw new Error('Connection is refreshing. Retry shortly.');
 try{const r=await authRequest('token',{grant_type:'refresh_token',refresh_token:tokens.refresh});if(!r.access_token||!r.refresh_token||!r.public_token||!r.expires_in)throw new Error('Unexpected token response.');const sealed=await sealTokens({access:r.access_token,refresh:r.refresh_token},s.TOKEN_ENCRYPTION_KEY,c.businessId+':'+c.mode);await db.update(connections).set({encryptedTokens:sealed,publicToken:r.public_token,expiresAt:Date.now()+Number(r.expires_in)*1000,leaseUntil:0}).where(and(eq(connections.businessId,c.businessId),eq(connections.status,'connected'),eq(connections.encryptedTokens,c.encryptedTokens)));return r.access_token}catch{await db.update(connections).set({status:'reconnect_required',leaseUntil:0}).where(and(eq(connections.businessId,c.businessId),eq(connections.encryptedTokens,c.encryptedTokens)));throw new Error('Your Razorpay connection needs authorization again.')}
}
export type Payment={id:string;order_id:string;amount:number;currency:string;status:string;captured:boolean};
export async function merchantRequest(c:Connection,path:string,body?:unknown){const token=await accessToken(c);const r=await fetch('https://api.razorpay.com/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});if(!r.ok){if(r.status===401){await getDb().update(connections).set({status:'reconnect_required'}).where(eq(connections.businessId,c.businessId))}throw new Error('Razorpay could not complete the request. Check your connection and retry.')}return r.json() as Promise<Payment&{items?:Payment[]}>}
