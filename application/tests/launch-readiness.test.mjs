import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {integrationStatus,connectionModeAllowed,merchantPaymentReady,launchChecklist,validOrigin,csvCell} from '../lib/launch-readiness.mjs';
const env={RAZORPAY_PARTNER_APPROVED:'true',RAZORPAY_OAUTH_CLIENT_ID:'client',RAZORPAY_OAUTH_CLIENT_SECRET:'secret',TOKEN_ENCRYPTION_KEY:'aa'.repeat(32),APP_ORIGIN:'https://omsetra.example',RAZORPAY_OAUTH_CLIENT_MODE:'development',RAZORPAY_PARTNER_WEBHOOK_SECRET:'webhook',PLATFORM_TEST_PAYMENTS_ENABLED:'true',PLATFORM_PAYMENTS_ENABLED:'false'};
const business={id:'a',policiesConfirmed:1,terms:'t'.repeat(50),privacy:'p'.repeat(50),refunds:'r'.repeat(50),supportEmail:'support@example.test',address:'Public business address'};
const connection={status:'connected',mode:'test'};
test('sandbox payment flag never enables live authorisation or checkout',()=>{
 assert.equal(merchantPaymentReady(env,business,connection),true);
 assert.equal(connectionModeAllowed(env,'live'),false);
 assert.equal(merchantPaymentReady(env,business,{...connection,mode:'live'}),false);
 // Even an accidentally enabled live flag cannot use development credentials.
 assert.equal(connectionModeAllowed({...env,PLATFORM_PAYMENTS_ENABLED:'true'},'live'),false);
 assert.equal(merchantPaymentReady({...env,PLATFORM_PAYMENTS_ENABLED:'true'},business,{...connection,mode:'live'}),false);
 const production={...env,RAZORPAY_OAUTH_CLIENT_MODE:'production',PLATFORM_LAUNCH_REVIEWED:'true'};
 assert.equal(connectionModeAllowed(production,'test'),false);
 assert.equal(merchantPaymentReady(production,business,connection),false);
 assert.equal(merchantPaymentReady(production,business,{...connection,mode:'live'}),false);
 assert.equal(merchantPaymentReady({...production,PLATFORM_PAYMENTS_ENABLED:'true'},business,{...connection,mode:'live'}),true);
 assert.equal(merchantPaymentReady({...production,PLATFORM_LAUNCH_REVIEWED:'false',PLATFORM_PAYMENTS_ENABLED:'true'},business,{...connection,mode:'live'}),false);
});
test('missing prerequisites and revoked connections fail closed',()=>{
 for(const key of ['RAZORPAY_PARTNER_APPROVED','RAZORPAY_OAUTH_CLIENT_ID','RAZORPAY_OAUTH_CLIENT_SECRET','TOKEN_ENCRYPTION_KEY','APP_ORIGIN','RAZORPAY_OAUTH_CLIENT_MODE']){
  assert.equal(integrationStatus({...env,[key]:''}).oauth,false,key);
  assert.equal(merchantPaymentReady({...env,[key]:''},business,connection),false,key);
 }
 assert.equal(merchantPaymentReady({...env,RAZORPAY_PARTNER_WEBHOOK_SECRET:''},business,connection),false);
 assert.equal(merchantPaymentReady({...env,PLATFORM_TEST_PAYMENTS_ENABLED:'false'},business,connection),false);
 for(const status of ['revoked','disconnect_pending','reconnect_required',''])assert.equal(merchantPaymentReady(env,business,{...connection,status}),false);
 assert.equal(merchantPaymentReady(env,{...business,policiesConfirmed:0},connection),false);
 assert.equal(merchantPaymentReady(env,{...business,terms:''},connection),false);
 assert.equal(merchantPaymentReady(env,business,{...connection,mode:'unknown'}),false);
 for(const url of ['http://example.com','https://example.com/','https://example.com/path','https://user:pass@example.com','https://example.com?x=1','not-a-url'])assert.equal(validOrigin(url),false,url);
});
test('checklist reflects real persisted progress without claiming a successful test payment',()=>{
 const pending=launchChecklist({},null,null,[]);assert.equal(pending.length,8);assert.equal(pending.some(i=>i.done),false);
 const steps=launchChecklist(env,business,connection,[{active:0}]);assert.equal(steps.find(i=>i.id==='products').done,false);assert.equal(steps.find(i=>i.id==='payments').done,true);assert.match(steps.find(i=>i.id==='payments').detail,/Sandbox/);
 assert.equal(launchChecklist(env,business,connection,[{active:1}]).find(i=>i.id==='products').done,true);
});
test('order policy snapshots survive later policy changes and migration preserves existing orders',()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../drizzle/0001_shallow_spitfire.sql',import.meta.url),'utf8'));
 db.prepare("INSERT INTO businesses (id,owner_id,name,support_email,address,category,description,terms,privacy,refunds,terms_version,created_at) VALUES ('a','owner-a','A','a@example.test','Address','Software','Example business','old terms','privacy','refunds','v1','now')").run();
 db.prepare("INSERT INTO checkout_orders (id,business_id,product_id,product_name,amount,status,account_id,mode,buyer_token_hash,created_at,consent_version) VALUES ('old','a','p','Product',100,'created','acc_a','test','hash','now','v1')").run();
 db.exec(readFileSync(new URL('../drizzle/0002_nifty_thor_girl.sql',import.meta.url),'utf8'));
 assert.equal(db.prepare("SELECT policy_snapshot FROM checkout_orders WHERE id='old'").get().policy_snapshot,'');
 const snapshot=JSON.stringify({terms:'old terms',privacy:'privacy',refunds:'refunds'});
 db.prepare("UPDATE checkout_orders SET policy_snapshot=? WHERE id='old'").run(snapshot);
 db.prepare("UPDATE businesses SET terms='new terms',terms_version='v2' WHERE id='a'").run();
 assert.equal(JSON.parse(db.prepare("SELECT policy_snapshot FROM checkout_orders WHERE id='old'").get().policy_snapshot).terms,'old terms');
 const insert=db.prepare("INSERT INTO business_products VALUES (?, 'a', 'Name', 'Description', 100, 'Other', 'Now', 0, 'now')");for(let i=0;i<20;i++)insert.run('product-'+i);assert.throws(()=>insert.run('twenty-first'),/Starter supports/);db.close();
});
test('spreadsheet export escapes quotes, line breaks and formula injection',()=>{
 for(const value of ['=HYPERLINK("https://example.test")',' +SUM(1,2)','@SUM(1)','-1+2','\tformula','\n=1'])assert.ok(csvCell(value).startsWith('"\''));
 assert.equal(csvCell('A "quoted", product'),'"A ""quoted"", product"');assert.equal(csvCell(100),'"100"');
});
