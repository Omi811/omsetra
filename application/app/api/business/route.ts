import {eq,and} from 'drizzle-orm';
import {getDb} from '../../../db';
import {businesses,businessProducts,connections} from '../../../db/schema';
import {currentUser,ownedBusiness,reportFailure,requireOrigin,reply,authRequest,runtime,connectionFor} from '../../../lib/tenant-server';
import {validBusinessInput,validProductInput,unsealTokens} from '../../../lib/tenant-security.mjs';
import {boundedText} from '../../../lib/payment-security.mjs';
export async function POST(request:Request){try{requireOrigin(request);const user=await currentUser();if(!user)return reply({error:'Sign in to create or manage a business.'},401);const d=JSON.parse(await boundedText(request,20000));const db=getDb();const b=await ownedBusiness();
 if(d.action==='signup'){
  if(b)return reply({error:'You already have a free business workspace.'},409);
  if(!validBusinessInput(d))return reply({error:'Complete the business details and accept the free beta terms.'},400);
  const id=crypto.randomUUID();const created=await db.insert(businesses).values({id,ownerId:user,name:d.name.trim(),supportEmail:d.email.trim().toLowerCase(),address:d.address.trim(),category:d.category,description:d.description.trim(),terms:'',privacy:'',refunds:'',termsVersion:'2026-10-22',createdAt:new Date().toISOString()}).onConflictDoNothing().returning({id:businesses.id});return created.length?reply({created:true}):reply({error:'You already have a free business workspace.'},409);
 }
 if(!b)return reply({error:'Create your free business account first.'},403);
 if(d.action==='profile'){
  if(!validBusinessInput({...d,accepted:true}))return reply({error:'Complete your business name, support email, address, category and description.'},400);
  await db.update(businesses).set({name:d.name.trim(),supportEmail:d.email.trim().toLowerCase(),address:d.address.trim(),category:d.category,description:d.description.trim(),policiesConfirmed:0}).where(and(eq(businesses.id,b.id),eq(businesses.ownerId,user)));
  return reply({saved:true,policiesNeedReview:true});
 }
 if(d.action==='policies'){
  if(!['terms','privacy','refunds'].every(k=>typeof d[k]==='string'&&d[k].trim().length>=50&&d[k].length<=5000)||d.confirmed!==true)return reply({error:'Add complete policies (at least 50 characters each) and confirm their accuracy.'},400);
  await db.update(businesses).set({terms:d.terms.trim(),privacy:d.privacy.trim(),refunds:d.refunds.trim(),policiesConfirmed:1,termsVersion:crypto.randomUUID()}).where(and(eq(businesses.id,b.id),eq(businesses.ownerId,user)));return reply({saved:true});
 }
 if(d.action==='product'||d.action==='update-product'){
  if(!validProductInput(d))return reply({error:'Enter a name, description, delivery details and a price from ₹1 to ₹1,00,000.'},400);
  if(d.action==='update-product'){
   if(typeof d.id!=='string')return reply({error:'Product required.'},400);
   const rows=await db.update(businessProducts).set({name:d.name.trim(),description:d.description.trim(),amount:d.amount,category:['Consultation','Digital report','Other product'].includes(d.category)?d.category:'Other product',duration:d.duration.trim(),active:d.active===true?1:0}).where(and(eq(businessProducts.id,d.id),eq(businessProducts.businessId,b.id))).returning({id:businessProducts.id});
   return rows.length?reply({saved:true}):reply({error:'Product not found.'},404);
  }
  const count=await db.select({id:businessProducts.id}).from(businessProducts).where(eq(businessProducts.businessId,b.id)).limit(20);if(count.length>=20)return reply({error:'The free beta supports 20 products per business.'},409);
  await db.insert(businessProducts).values({id:crypto.randomUUID(),businessId:b.id,name:d.name.trim(),description:d.description.trim(),amount:d.amount,category:['Consultation','Digital report','Other product'].includes(d.category)?d.category:'Other product',duration:d.duration.trim(),active:d.active===true?1:0,createdAt:new Date().toISOString()});return reply({saved:true});
 }
 if(d.action==='delete-product'){
  if(typeof d.id!=='string')return reply({error:'Product required.'},400);await db.delete(businessProducts).where(and(eq(businessProducts.id,d.id),eq(businessProducts.businessId,b.id)));return reply({deleted:true});
 }
 if(d.action==='disconnect'){
  const c=await connectionFor(b.id);if(c&&c.status!=='revoked'&&c.encryptedTokens){await db.update(connections).set({status:'disconnect_pending'}).where(eq(connections.businessId,b.id));try{const tokens=await unsealTokens(c.encryptedTokens,runtime().TOKEN_ENCRYPTION_KEY,b.id+':'+c.mode) as {refresh:string};await authRequest('revoke',{token_type_hint:'refresh_token',token:tokens.refresh})}catch{reportFailure('business');return reply({error:'Payment access is paused, but provider revocation could not be confirmed. Retry disconnect, or revoke Omsetra in your Razorpay Dashboard.'},503)}}
  await db.delete(connections).where(eq(connections.businessId,b.id));return reply({disconnected:true});
 }
 return reply({error:'Unknown action.'},400);
 }catch{reportFailure('business');return reply({error:'Unable to save this request. Please check the details and retry.'},503)}}
