import {and,eq} from 'drizzle-orm';
import {getDb} from '../../../db';
import {workspaceOnboarding as onboarding,businessProducts,reconciliationOrganizations as organizations} from '../../../db/schema';
import {currentUser,ownedBusiness,reply,requireOrigin,reportFailure} from '../../../lib/tenant-server';
import {boundedText} from '../../../lib/payment-security.mjs';
import {digest} from '../../../lib/tenant-security.mjs';
import {onboardingProgress,profileSnapshot,validOnboardingMutation} from '../../../lib/onboarding.mjs';
export const dynamic='force-dynamic';
async function context(user:string,b:NonNullable<Awaited<ReturnType<typeof ownedBusiness>>>){
 const db=getDb();
 const [record]=await db.select().from(onboarding).where(and(eq(onboarding.businessId,b.id),eq(onboarding.ownerId,user)));
 const orgs=await db.select({id:organizations.id,name:organizations.name,gstin:organizations.gstin,ownerId:organizations.ownerId}).from(organizations).where(eq(organizations.ownerId,user)).limit(10);
 const products=await db.select({id:businessProducts.id,name:businessProducts.name,active:businessProducts.active}).from(businessProducts).where(eq(businessProducts.businessId,b.id)).limit(20);
 const profileDigest=await digest(profileSnapshot(b));
 const progress=onboardingProgress(record,{profileDigest,ownerId:user,organizations:orgs,productCount:products.length});
 return {record,orgs,products,profileDigest,progress};
}
export async function GET(){try{
 const user=await currentUser();if(!user)return reply({error:'Sign in to continue your private setup.'},401);
 const b=await ownedBusiness();if(!b)return reply({needsSignup:true});
 const c=await context(user,b);
 return reply({business:{id:b.id,name:b.name,email:b.supportEmail,address:b.address,category:b.category,description:b.description},progress:c.progress,version:c.record?.version||0,finishedAt:c.record?.finishedAt||null,organizations:c.orgs.map(({ownerId,...o})=>o),products:c.products.map(p=>({...p,active:p.active===1})),demoDataImported:false});
 }catch{reportFailure('onboarding_read');return reply({error:'Unable to load setup. Please retry.'},503)}}
export async function POST(request:Request){try{
 requireOrigin(request);const user=await currentUser();if(!user)return reply({error:'Sign in to save setup.'},401);
 const b=await ownedBusiness();if(!b)return reply({error:'Create your business account first.'},403);
 let d;try{d=JSON.parse(await boundedText(request,4096))}catch{return reply({error:'Provide a valid setup request.'},400)}
 if(!validOnboardingMutation(d))return reply({error:'Choose a valid setup action and current version.'},400);
 const db=getDb(),c=await context(user,b);
 if((c.record?.version||0)!==d.version)return reply({error:'Setup changed in another tab. We refreshed your progress; please retry.'},409);
 const next={role:c.record?.role||'',organizationId:c.progress.organizationId,profileDigest:c.record?.profileDigest||'',finishedAt:c.record?.finishedAt||null};
 if(d.action==='choose-role'){next.role=d.role;next.finishedAt=null}
 else if(!c.record)return reply({error:'Choose your setup path first.'},400);
 else if(d.action==='review-profile'){next.profileDigest=c.profileDigest;next.finishedAt=null}
 else if(d.action==='select-organization'){
  if(!c.orgs.some(o=>o.id===d.organizationId))return reply({error:'Workspace not found in your account.'},404);
  next.organizationId=d.organizationId;next.finishedAt=null;
 }else if(d.action==='finish'){
  if(!c.progress.setupReady)return reply({error:'Review your profile and finish your first workspace task before completing setup.'},409);
  next.finishedAt=new Date().toISOString();
 }
 const values={...next,version:d.version+1,updatedAt:new Date().toISOString()};
 const result=c.record?await db.update(onboarding).set(values).where(and(eq(onboarding.businessId,b.id),eq(onboarding.ownerId,user),eq(onboarding.version,d.version))).returning({id:onboarding.businessId}):await db.insert(onboarding).values({businessId:b.id,ownerId:user,...values}).onConflictDoNothing().returning({id:onboarding.businessId});
 return result.length?reply({saved:true}):reply({error:'Setup changed in another tab. Refresh and retry.'},409);
 }catch{reportFailure('onboarding_write');return reply({error:'Unable to save setup. Please retry.'},503)}}
