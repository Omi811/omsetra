import {and,eq,gt,asc} from 'drizzle-orm';
import {getDb} from '../../../../db';
import {businessProducts,checkoutOrders,workspaceOnboarding} from '../../../../db/schema';
import {ownedBusiness,reportFailure,reply} from '../../../../lib/tenant-server';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 const b=await ownedBusiness();if(!b)return reply({error:'Sign in to your business to export its data.'},401);
 const cursor=new URL(request.url).searchParams.get('after')||'';if(cursor.length>100)return reply({error:'Invalid export cursor.'},400);
 const db=getDb();const products=await db.select().from(businessProducts).where(eq(businessProducts.businessId,b.id));
 const [onboarding]=await db.select({role:workspaceOnboarding.role,organizationId:workspaceOnboarding.organizationId,finishedAt:workspaceOnboarding.finishedAt,version:workspaceOnboarding.version,updatedAt:workspaceOnboarding.updatedAt}).from(workspaceOnboarding).where(and(eq(workspaceOnboarding.businessId,b.id),eq(workspaceOnboarding.ownerId,b.ownerId)));
 // Explicit projection excludes buyer capabilities and provider credentials.
 const rows=await db.select({id:checkoutOrders.id,productId:checkoutOrders.productId,productName:checkoutOrders.productName,amount:checkoutOrders.amount,currency:checkoutOrders.currency,status:checkoutOrders.status,mode:checkoutOrders.mode,createdAt:checkoutOrders.createdAt,providerOrderId:checkoutOrders.providerOrderId,paymentId:checkoutOrders.paymentId,consentVersion:checkoutOrders.consentVersion,policySnapshot:checkoutOrders.policySnapshot}).from(checkoutOrders).where(and(eq(checkoutOrders.businessId,b.id),gt(checkoutOrders.id,cursor))).orderBy(asc(checkoutOrders.id)).limit(501);
 const orders=rows.slice(0,500);const response=reply({exportedAt:new Date().toISOString(),business:{id:b.id,name:b.name,email:b.supportEmail,address:b.address,category:b.category,description:b.description,terms:b.terms,privacy:b.privacy,refunds:b.refunds,policiesConfirmed:b.policiesConfirmed===1,createdAt:b.createdAt},products,onboarding:onboarding||null,orders,nextCursor:rows.length>500?orders[orders.length-1].id:null});
 response.headers.set('Content-Disposition','attachment; filename="omsetra-business-export.json"');return response;
 }catch{reportFailure('export');return reply({error:'Unable to export your data. Please retry.'},503)}}
