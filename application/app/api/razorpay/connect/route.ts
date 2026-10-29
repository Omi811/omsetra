import {eq,and} from 'drizzle-orm';
import {getDb} from '../../../../db';
import {oauthStates} from '../../../../db/schema';
import {ownedBusiness,currentUser,requireOrigin,reply,oauthConfigured,runtime,connectionFor} from '../../../../lib/tenant-server';
import {digest,randomToken} from '../../../../lib/tenant-security.mjs';
import {boundedText} from '../../../../lib/payment-security.mjs';
import {connectionModeAllowed} from '../../../../lib/launch-readiness.mjs';
export async function POST(request:Request){try{requireOrigin(request);const b=await ownedBusiness();const user=await currentUser();if(!b||!user)return reply({error:'Create your free account first.'},401);if(!oauthConfigured())return reply({error:'Omsetra’s Razorpay partner application is not configured yet. Your free workspace is ready; account connections will open after partner approval.'},503);
 const existing=await connectionFor(b.id);if(existing)return reply({error:'Disconnect the existing account before connecting another.'},409);
 const d=JSON.parse(await boundedText(request,1024));if(!['test','live'].includes(d.mode))return reply({error:'Select test or live mode.'},400);if(!connectionModeAllowed(runtime(),d.mode)||d.mode==='live'&&b.policiesConfirmed!==1)return reply({error:'This connection mode is disabled. Live connections require verified production setup and merchant policies.'},409);
 if(d.authorized!==true)return reply({error:'Confirm you can authorize this business’s account.'},400);
 const origin=runtime().APP_ORIGIN!;if(new URL(request.url).origin!==origin)return reply({error:'Use the configured Omsetra origin.'},400);
 const state=randomToken();const db=getDb();await db.delete(oauthStates).where(and(eq(oauthStates.userId,user),eq(oauthStates.businessId,b.id)));await db.insert(oauthStates).values({hash:await digest(state),userId:user,businessId:b.id,mode:d.mode,expiresAt:Date.now()+600000});
 const u=new URL('https://auth.razorpay.com/authorize');u.search=new URLSearchParams({client_id:runtime().RAZORPAY_OAUTH_CLIENT_ID!,response_type:'code',redirect_uri:origin+'/api/razorpay/callback',scope:'read_write',state}).toString();return reply({url:u.toString()});
 }catch{return reply({error:'Unable to start authorization. Please retry.'},503)}}
