export const onboardingRoles=[
 {id:'founder',title:'I’m a new founder',description:'Create your first private offer and prepare your storefront.',task:'Create your first product draft'},
 {id:'business',title:'I run an existing business',description:'Set up your business books and bring in your own records.',task:'Set up your reconciliation workspace'},
 {id:'accountant',title:'I manage client accounts',description:'Create an authorised client workspace with its own books.',task:'Set up your first client workspace'},
];
export function profileSnapshot(b){return JSON.stringify([b.id,b.name,b.supportEmail,b.address,b.category,b.description])}
export function onboardingProgress(record,context){
 const role=onboardingRoles.find(r=>r.id===record?.role);
 const profileReviewed=!!record?.profileDigest&&record.profileDigest===context.profileDigest;
 const organization=context.organizations.find(o=>o.id===record?.organizationId&&o.ownerId===context.ownerId)||null;
 const firstWorkReady=!!role&&(role.id==='founder'?context.productCount>0:!!organization);
 const setupReady=!!role&&profileReviewed&&firstWorkReady;
 return {role:role?.id||'',profileReviewed,firstWorkReady,setupReady,complete:setupReady&&!!record?.finishedAt,organizationId:organization?.id||null};
}
export function validOnboardingMutation(d){
 if(!d||!Number.isSafeInteger(d.version)||d.version<0)return false;
 if(d.action==='choose-role')return onboardingRoles.some(r=>r.id===d.role);
 if(d.action==='select-organization')return typeof d.organizationId==='string'&&d.organizationId.length>0&&d.organizationId.length<=100;
 return d.action==='review-profile'||d.action==='finish'&&d.acknowledged===true;
}
