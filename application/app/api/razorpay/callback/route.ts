import {and,eq,gt} from 'drizzle-orm';
import {getDb} from '../../../../db';
import {oauthStates,connections} from '../../../../db/schema';
import {ownedBusiness,currentUser,oauthConfigured,runtime,authRequest} from '../../../../lib/tenant-server';
import {digest,sealTokens} from '../../../../lib/tenant-security.mjs';
import {connectionModeAllowed} from '../../../../lib/launch-readiness.mjs';
export async function GET(request:Request){const end=(status:string)=>new Response(null,{status:303,headers:{Location:'/signup?connection='+status,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});try{
 const b=await ownedBusiness(),user=await currentUser();if(!b||!user||!oauthConfigured())return end('unavailable');const u=new URL(request.url);const state=u.searchParams.get('state');if(!state||state.length!==64)return end('invalid_state');
 // Atomic consumption binds state to the authenticated owner and prevents replay.
 const [row]=await getDb().delete(oauthStates).where(and(eq(oauthStates.hash,await digest(state)),eq(oauthStates.userId,user),eq(oauthStates.businessId,b.id),gt(oauthStates.expiresAt,Date.now()))).returning();if(!row)return end('invalid_state');if(u.searchParams.has('error'))return end('denied');const code=u.searchParams.get('code');if(!code||code.length>10000)return end('denied');
 if(!connectionModeAllowed(runtime(),row.mode)||row.mode==='live'&&b.policiesConfirmed!==1)return end('mode_disabled');
 const r=await authRequest('token',{grant_type:'authorization_code',redirect_uri:runtime().APP_ORIGIN+'/api/razorpay/callback',code,mode:row.mode});
 if(!r.access_token||!r.refresh_token||!r.razorpay_account_id||!r.public_token?.startsWith('rzp_'+row.mode+'_oauth_')||r.token_type!=='Bearer'||!Number.isFinite(Number(r.expires_in))||Number(r.expires_in)<=0)return end('invalid_response');
 const sealed=await sealTokens({access:r.access_token,refresh:r.refresh_token},runtime().TOKEN_ENCRYPTION_KEY,b.id+':'+row.mode);
 await getDb().insert(connections).values({businessId:b.id,accountId:r.razorpay_account_id,mode:row.mode,encryptedTokens:sealed,publicToken:r.public_token,expiresAt:Date.now()+Number(r.expires_in)*1000,status:'connected',connectedAt:new Date().toISOString()});return end('connected');
 }catch{return end('failed')}}
