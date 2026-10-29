import {eq,and} from 'drizzle-orm';
import {getDb} from '../../../db';
import {connections,checkoutOrders,merchantEvents} from '../../../db/schema';
import {runtime,reply} from '../../../lib/tenant-server';
import {boundedText,validSignature,capturedPaymentMatches} from '../../../lib/payment-security.mjs';
export async function POST(request:Request){const secret=runtime().RAZORPAY_PARTNER_WEBHOOK_SECRET;if(!secret)return reply({error:'Webhook not configured.'},503);try{
 const raw=await boundedText(request);if(!await validSignature(raw,request.headers.get('x-razorpay-signature'),secret))return reply({error:'Invalid signature.'},400);const d=JSON.parse(raw);if(typeof d.account_id!=='string')return reply({error:'Merchant identity missing.'},400);const db=getDb();const [c]=await db.select().from(connections).where(eq(connections.accountId,d.account_id));if(!c)return reply({received:true});const eventId=request.headers.get('x-razorpay-event-id');if(!eventId||eventId.length>200)return reply({error:'Event identity required.'},400);
 if(d.event==='account.app.authorization_revoked'){
  if(typeof d.created_at!=='number')return reply({error:'Event timestamp required.'},400);if(d.created_at*1000<Date.parse(c.connectedAt)-1000)return reply({received:true});await db.update(connections).set({status:'revoked',encryptedTokens:'',publicToken:'',expiresAt:0}).where(and(eq(connections.businessId,c.businessId),eq(connections.accountId,d.account_id)));return reply({received:true});
 }
 if(!['payment.captured','order.paid'].includes(d.event))return reply({received:true});const p=d.payload?.payment?.entity;if(!p?.order_id)return reply({error:'Missing payment.'},400);const [o]=await db.select().from(checkoutOrders).where(and(eq(checkoutOrders.providerOrderId,p.order_id),eq(checkoutOrders.businessId,c.businessId),eq(checkoutOrders.accountId,c.accountId),eq(checkoutOrders.mode,c.mode)));if(!o)return reply({received:true});if(!capturedPaymentMatches(p,o))return reply({error:'Payment mismatch.'},400);
 await db.batch([db.insert(merchantEvents).values({id:c.accountId+':'+c.mode+':'+eventId,businessId:c.businessId,event:d.event,createdAt:new Date().toISOString()}).onConflictDoNothing(),db.update(checkoutOrders).set({status:'captured',paymentId:p.id}).where(and(eq(checkoutOrders.id,o.id),eq(checkoutOrders.businessId,c.businessId)))]);return reply({received:true});
 }catch{return reply({error:'Unable to process event.'},503)}}
