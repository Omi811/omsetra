# Omsetra: free business accounts and merchant payments

Omsetra provides free business workspaces, a persisted product catalogue, customer storefronts and an official Razorpay Technology Partner OAuth integration. Starter is ₹0/month, with up to 20 catalogue products and no added Omsetra transaction markup. Provider processing fees and taxes remain separate. No paid subscription is implemented.

## Preparation release

Account settings show saved launch progress. Owners can edit their public business profile, edit/publish/unpublish/remove products, reconfirm customer policies and download their own paginated business JSON export. Profile edits pause payment readiness until policy confirmation. Starter product capacity is also enforced atomically in SQLite. Public platform notice pages are at `/privacy`, `/terms`, `/refunds` and `/contact`; public platform contact details remain pending at the owner’s request. Live/test switches are separate and both remain false.

## What works now

- Founders sign in with the hosting platform's ChatGPT authentication and create one free business account per user.
- Business name, support address/email, category, description and acceptance of versioned beta terms are stored in D1.
- Authenticated users can create/publish/remove their own products and edit customer policies. Public storefronts expose published products and business contact/policy details only.
- Product prices come from the server. Checkout creates a merchant-scoped order and returns only Razorpay's public OAuth token. Payment callbacks require an unguessable order capability, valid HMAC with the partner client secret, matching provider account/order/amount/currency and captured state.
- Owners see only their own business's transactions. Unauthenticated API callers cannot access business management data. Legacy single-owner sample orders remain stored but are not exposed by the new APIs.
- OAuth state is one-use, expiring and bound to the authenticated owner/business. Access and refresh tokens are encrypted with AES-GCM and authenticated business/mode context, never returned to the browser. Refresh uses a database lease and token rotation.
- Provider revocation webhooks invalidate local connections. Disconnect pauses payment access and attempts provider-side refresh-token revocation; unsuccessful revocation stays visibly pending for retry.
- Account-specific payment webhooks require the partner webhook signature, merchant identity, provider order match and amount/currency match. Duplicate deliveries converge on captured state and a unique event record. Recent pending orders reconcile through that merchant's bearer token on refresh.

## Explicit current boundary

The Technology Partner switch request was submitted on 22 October 2026; Razorpay confirmed Application Received. Approval has not been received. OAuth connections and payment collection therefore remain disabled. Free signup, catalogue management and customer storefront publishing do not require provider credentials. A connection button must never collect merchant API key secrets as a workaround.

Self-service signup and customer storefronts require a public Site. Authentication and tenant authorization still protect account management; public audience does not grant access to any merchant dashboard. This release is an early beta, not a legal compliance certificate. Name clearance, platform legal identity/contact, customer-facing policies and an external security review remain launch work. The five pasted startup concepts are product context only: no tax reconciliation, automated TDS advice, GST APIs, WhatsApp messaging, Tally connector or cross-border document processing is claimed or implemented. Non-custodial operation does not mean zero contractual, privacy, security or regulatory obligations.

## Partner activation: later, through runtime secrets

1. Obtain Razorpay Technology Partner approval and create the approved OAuth application. Do not sign up or accept provider terms on a user's behalf.
2. Whitelist `https://astrobharat-studio.hp909145.chatgpt.site/api/razorpay/callback` as an exact redirect URI. Set `APP_ORIGIN` to `https://astrobharat-studio.hp909145.chatgpt.site`.
3. Follow [RAZORPAY-ACTIVATION.md](RAZORPAY-ACTIVATION.md) for mode isolation and the full settings matrix. Configure `RAZORPAY_OAUTH_CLIENT_MODE` explicitly as `development` for test or `production` for live. Configure `RAZORPAY_OAUTH_CLIENT_ID`, `RAZORPAY_OAUTH_CLIENT_SECRET`, `RAZORPAY_PARTNER_APPROVED=true` and a cryptographically random 32-byte hexadecimal `TOKEN_ENCRYPTION_KEY` as runtime settings. Client secret and encryption key must be secret values. Retain and rotate vault keys with a migration plan; replacing the key alone makes existing tokens unreadable.
4. Register `/api/webhook` on the approved partner application, subscribe to `payment.captured`, `order.paid` and `account.app.authorization_revoked`, and configure `RAZORPAY_PARTNER_WEBHOOK_SECRET` as a secret. Verify actual account-specific event delivery and signature semantics in the provider sandbox.
5. Enable only `PLATFORM_TEST_PAYMENTS_ENABLED=true` on the development-client test deployment while both live/review flags remain false. Test OAuth grant, code replay/denial, refresh and revocation against the real provider with development credentials. Test checkout, capture, provider errors, double delivery and pending-payment reconciliation. No real provider transaction or OAuth grant has been executed in this build.
6. Only after partner approval, end-to-end verification and policy/security review, explicitly set `PLATFORM_LAUNCH_REVIEWED=true` and `PLATFORM_PAYMENTS_ENABLED=true` on a production-client deployment. A merchant must publish their own policies before payment readiness becomes true. A live connection requires policies and platform enablement. Provider approval and activation still govern each merchant's ability to accept payments; the app does not claim to infer KYC eligibility.

Never configure an owner's global API key to process payments for other businesses. The prior `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `ASTRA_OWNER_USER_ID` and global merchant profile are not used by these tenant endpoints. The app requests `read_write` payment scope because it must create orders; merchants see the provider consent interface. No payouts, refunds initiation, fund custody, wallet or escrow function is provided.

## Verification and development

Run `node --test tests/payment-security.test.mjs tests/tenant-security.test.mjs tests/launch-readiness.test.mjs`, TypeScript `--noEmit`, and the standard Sites build. Tests cover forged signatures, exact webhook bytes, captured/authorized mismatch, bounded payloads, encrypted-token tenant/mode separation, expired/replayed OAuth state, catalogue filters, uniqueness and ownership. Browser QA uses only a local fixture account and product; local test data is not uploaded to production.

Schema changes are generated with Drizzle and committed as append-only schema migrations. Hosted Sites applies them on deployment. Local D1 uses `.wrangler/state`; apply initial and pending migration files exactly once to that local store. The beta's simple per-business checkout rate guard is not a complete production abuse-control system. Catalogue deletion removes products from future sales; existing order records retain the purchased title and price. Refunds and fulfilment remain merchant responsibilities.

Before broad paid use, complete audit and retention/deletion controls, verify hosted monitoring, add replay-safe fulfilment jobs, automated recovery for uncertain order creation and stronger abuse controls. Uncertain provider order creation is marked `provider_pending`: reconcile it in the merchant's provider Dashboard before asking a customer to retry. Updating customer policies requires another recorded confirmation; new orders save the exact merchant contact and policy text presented by that policy version; checkout rejects a stale policy version or price. Pre-migration orders have no reconstructable snapshot.

Sources: [Razorpay OAuth](https://razorpay.com/docs/partners/technology-partners/onboard-businesses/integrate-oauth), [OAuth integration and signature rules](https://razorpay.com/docs/partners/technology-partners/onboard-businesses/integrate-oauth/integration-steps), [OAuth participation terms](https://razorpay.com/oauth-tncs/).


## Reconciliation first slice

`/reconcile` now offers owner-managed multi-organisation reconciliation with review-before-save PDF/Excel/CSV bank inputs and Tally Sales voucher XML/tabular imports with GSTIN mapping, reviewed matches, probable-TDS flags, atomic approvals, undo/reassignment audit history, private JSON export and a Tally receipt XML draft. See [RECONCILIATION-MVP.md](RECONCILIATION-MVP.md) for exact import limits, supported formats, accounting boundaries and the four-week follow-up sequence. This uses the existing TypeScript/Worker and D1; PostgreSQL RLS and a Python parser have not been provisioned. Original files are parsed locally in the browser and never uploaded. Zoho, WhatsApp and payment links remain unconnected. Reconciliation never enables payment flags or sends external messages.

Run `node --test tests/payment-security.test.mjs tests/tenant-security.test.mjs tests/launch-readiness.test.mjs tests/reconciliation.test.mjs` plus the TypeScript check and standard production build. Apply migration `0003_misty_xavin.sql` through the normal deployment migration mechanism. Financial fixture records used during testing exist only in the local D1 store.

The operator chose to leave support email setup pending on 22 October 2026. No professional mailbox, forwarding address or verified public support email has been created or published. Contact and privacy pages disclose this pending state and now describe the financial metadata/audit processing actually implemented.

## UPI checkout
UPI is presented in the public preview, merchant setup and storefront checkout. The official Razorpay Checkout configuration highlights UPI or limits the UI to UPI when selected. Merchant dashboard eligibility still controls actual availability; this is not a capability verification. Mobile Intent and provider-generated QR are delegated to Razorpay. No static payee VPA, manual UPI-ID collect form, UPI PIN field or direct payment deep link is created. Existing server order/amount/policy/readiness/signature/capture checks remain authoritative. All platform payment and partner-approval flags stay false until explicitly activated after approval and testing. Provider testing is pending.

## Public demo journeys
`/demo` and its `journey=start|business|clients` query options are public and require no signup. Starter lets a visitor edit an in-memory fictional offer and simulate a UPI receipt; it never launches Checkout. Business reconciliation parses bundled fictional CSVs and uses the shared matching engine; every approval is local. Client accounts keep independent fixture IDs, decisions and demo audit logs; downloads are marked fictional and must not be posted to real books. No demo path calls an API, uploads a file, sends a message or writes to a database. Reset clears all local demo changes, and reload starts fresh. Real account creation goes to `/signup`; fixture data is not migrated. Free limits remain enforced by the existing business and reconciliation APIs.

## Saved post-signup onboarding
New signup redirects to `/onboarding`; existing owners can resume through account settings or the workspace banner. `/api/onboarding` requires signed-in business ownership. The founder path creates only an explicit private product draft; business/accountant paths select an existing owned organisation or create a real GSTIN-mapped one through the reconciliation API. No fictional data or identifiers are seeded. Role, selected organisation, current-profile digest, completion/update timestamps and a version are persisted in `workspace_onboarding` (migration 0004). Steps are derived from current owned records; product removal or profile changes make relevant steps pending again. Optimistic versions prevent stale updates; database triggers reject foreign-owner organisation bindings. Completing onboarding never calls or configures a provider and does not enable payments. Staff sharing remains unavailable. Optional record imports open the selected owned workspace. Public demos remain isolated browser-only state.
