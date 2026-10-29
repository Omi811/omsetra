import {and,eq} from 'drizzle-orm';
import {getDb} from '../../../../db';
import {checkoutOrders} from '../../../../db/schema';
import {reply,requireOrigin,connectionFor,runtime,merchantRequest} from '../../../../lib/tenant-server';
import {digest} from '../../../../lib/tenant-security.mjs';
import {boundedText,validSignature,capturedPaymentMatches} from '../../../../lib/payment-security.mjs';
export async function POST(request:Request){try{requireOrigin(request);const d=JSON.parse(await boundedText(request,4096));if(typeof d.id!=='string'||typeof d.token!=='string'||d.token.length!==64||typeof d.razorpay_payment_id!=='string'||!/^pay_[A-Za-z0-9]+$/.test(d.razorpay_payment_id))return reply({error:'Invalid payment response.'},400);
 const db=getDb();const [o]=await db.select().from(checkoutOrders).where(and(eq(checkoutOrders.id,d.id),eq(checkoutOrders.buyerTokenHash,await digest(d.token))));if(!o||!o.providerOrderId)return reply({error:'Order not found.'},404);const c=await connectionFor(o.businessId);if(!c||c.status!=='connected'||c.mode!==o.mode||c.accountId!==o.accountId)return reply({error:'The merchant connection changed. Contact the merchant to confirm payment.'},409);
 if(d.razorpay_order_id!==o.providerOrderId||!await validSignature(o.providerOrderId+'|'+d.razorpay_payment_id,d.razorpay_signature,runtime().RAZORPAY_OAUTH_CLIENT_SECRET))return reply({error:'The payment signature is invalid.'},400);
 const p=await merchantRequest(c,'payments/'+encodeURIComponent(d.razorpay_payment_id));if(p.order_id!==o.providerOrderId||p.amount!==o.amount||p.currency!==o.currency)return reply({error:'Payment does not match this order.'},400);const status=capturedPaymentMatches(p,o)?'captured':o.status==='captured'?'captured':'awaiting_capture';
 if(o.status!=='captured')await db.update(checkoutOrders).set({status,paymentId:p.id}).where(and(eq(checkoutOrders.id,o.id),eq(checkoutOrders.status,o.status)));return reply({status,id:o.id});
 }catch{return reply({error:'Payment confirmation is pending. Contact the merchant before paying again.'},503)}}
