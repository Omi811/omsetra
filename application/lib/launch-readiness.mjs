// These checks are used by the API, not just by disabled browser controls.
export function validOrigin(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && u.origin === value && !u.username && !u.password; } catch { return false; }
}
export function integrationStatus(env) {
  const approved = env.RAZORPAY_PARTNER_APPROVED === 'true';
  const credentials = !!(env.RAZORPAY_OAUTH_CLIENT_ID && env.RAZORPAY_OAUTH_CLIENT_SECRET);
  const vault = /^[a-f0-9]{64}$/i.test(env.TOKEN_ENCRYPTION_KEY || '');
  const origin = validOrigin(env.APP_ORIGIN);
  const clientMode = ['development', 'production'].includes(env.RAZORPAY_OAUTH_CLIENT_MODE) ? env.RAZORPAY_OAUTH_CLIENT_MODE : 'unconfigured';
  const oauth = approved && credentials && vault && origin && clientMode !== 'unconfigured';
  const webhook = !!env.RAZORPAY_PARTNER_WEBHOOK_SECRET;
  return {
    approved, credentials, vault, origin, clientMode, oauth, webhook,
    testConnections: oauth && clientMode === 'development',
    liveConnections: oauth && clientMode === 'production' && env.PLATFORM_LAUNCH_REVIEWED === 'true' && env.PLATFORM_PAYMENTS_ENABLED === 'true',
    testPayments: oauth && clientMode === 'development' && webhook && env.PLATFORM_TEST_PAYMENTS_ENABLED === 'true',
    livePayments: oauth && clientMode === 'production' && webhook && env.PLATFORM_LAUNCH_REVIEWED === 'true' && env.PLATFORM_PAYMENTS_ENABLED === 'true',
  };
}
export function connectionModeAllowed(env, mode) {
  const s = integrationStatus(env);
  return mode === 'test' ? s.testConnections : mode === 'live' ? s.liveConnections : false;
}
export function merchantPaymentReady(env, business, connection) {
  if (!business || !connection || connection.status !== 'connected' || business.policiesConfirmed !== 1) return false;
  if (!['terms','privacy','refunds'].every(k => typeof business[k] === 'string' && business[k].trim().length >= 50)) return false;
  const s = integrationStatus(env);
  return connection.mode === 'test' ? s.testPayments : connection.mode === 'live' ? s.livePayments : false;
}
export function launchChecklist(env, business, connection, products) {
  const s = integrationStatus(env);
  return [
    {id:'workspace',label:'Create your free business account',done:!!business,detail:'One private workspace for your business.'},
    {id:'profile',label:'Review your public business details',done:!!business && !!business.supportEmail && !!business.address,detail:'Your support email and address appear on your storefront.'},
    {id:'products',label:'Publish your first product',done:products.some(p=>p.active===1 || p.active===true),detail:'Drafts stay private; published products appear in your store.'},
    {id:'policies',label:'Publish customer policies',done:business?.policiesConfirmed===1,detail:'Set terms, privacy, refunds and delivery for your actual offering.'},
    {id:'partner',label:'Razorpay partner approval',done:s.approved,detail:s.approved?'Platform approval recorded.':'Omsetra’s application is under review. No action needed from your business.'},
    {id:'integration',label:'Platform connection setup',done:s.oauth && s.webhook,detail:s.oauth && s.webhook?'OAuth and webhook settings are configured; provider testing is still required.':'Omsetra will configure and test the approved application.'},
    {id:'connection',label:'Authorize your Razorpay account',done:connection?.status==='connected',detail:connection?.status==='connected'?'Account authorized in '+connection.mode+' mode.':'Connect only on Razorpay’s own consent screen when setup opens.'},
    {id:'payments',label:'Payment collection enabled',done:merchantPaymentReady(env,business,connection),detail:merchantPaymentReady(env,business,connection)?(connection.mode==='test'?'Sandbox checkout only. No real money.':'Live payments enabled.'):'Payment collection is disabled for this workspace.'},
  ];
}
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"','""') + '"';
}
