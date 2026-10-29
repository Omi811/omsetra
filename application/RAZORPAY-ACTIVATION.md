# Omsetra activation handover

## Current state

The Technology Partner switch request was submitted on 22 October 2026. Razorpay confirmed Application Received. This is not approval. Public free signup is available; account management and exports require the authenticated business owner. Live payment collection remains explicitly disabled.

The operator has not yet designated a public platform support email or business address. `/contact` and `/privacy` honestly state that these are pending. Do not copy private KYC/account details into public pages. Merchant contact details are separately supplied by each business and intentionally shown on its storefront.

No real provider OAuth grant, token refresh, signed webhook delivery or payment has been tested. Local security checks and fixture tests do not replace those provider tests.

## Exact application settings

| Setting | Current site value |
| --- | --- |
| Name | Omsetra |
| Website / `APP_ORIGIN` | `https://astrobharat-studio.hp909145.chatgpt.site` |
| Exact OAuth redirect | `https://astrobharat-studio.hp909145.chatgpt.site/api/razorpay/callback` |
| Partner webhook to confirm with Razorpay | `https://astrobharat-studio.hp909145.chatgpt.site/api/webhook` |
| Requested scope | `read_write` for payment orders and verification |

Whitelist the complete redirect URI, without a trailing slash or wildcard. If a dedicated test deployment or custom domain is used, configure its own exact origin and callback. Do not use this production callback for an unrelated deployment.

When Razorpay enables the Owner's Applications screen, create Omsetra with the prepared square logo and website. It supplies separate development and production clients. [Official OAuth setup](https://razorpay.com/docs/partners/technology-partners/onboard-businesses/integrate-oauth/integration-steps).

## Runtime settings

Configure these through the Sites environment tool or supported secure settings, then deploy a saved version. Never put real credentials in source, browser code, screenshots or chat. Public identifiers need not be secrets; client secrets, vault keys and webhook secrets must be secret values.

| Key | Purpose / safe state |
| --- | --- |
| `APP_ORIGIN` | Exact HTTPS origin above; no path, trailing slash, query, user information or fragment |
| `RAZORPAY_PARTNER_APPROVED` | `false` until approval is verified, then `true` |
| `RAZORPAY_OAUTH_CLIENT_MODE` | Explicit `development` or `production`; missing/unknown disables connections |
| `RAZORPAY_OAUTH_CLIENT_ID` | ID for that selected client |
| `RAZORPAY_OAUTH_CLIENT_SECRET` | Matching client secret |
| `TOKEN_ENCRYPTION_KEY` | Random 32-byte key as 64 hexadecimal characters; encrypted-token vault key |
| `RAZORPAY_PARTNER_WEBHOOK_SECRET` | Secret matching partner webhook configuration |
| `PLATFORM_TEST_PAYMENTS_ENABLED` | `false` by default; `true` permits checkout only for development-client test connections |
| `PLATFORM_PAYMENTS_ENABLED` | **Keep `false`**; live payment switch |
| `PLATFORM_LAUNCH_REVIEWED` | **Keep `false`**; separate attestation that policies, contact, security and real provider tests passed |

Approval is an operator-recorded flag, not inferred from credential presence. No browser or merchant API can change these settings. A live connection additionally requires production-client mode, both live/review flags and confirmed merchant policies. A development client cannot be used for live connections in Omsetra even though Razorpay itself supports that combination. This is intentional.

## Sandbox sequence after approval

1. Prefer an isolated test deployment with separate D1 data, a separate vault key and the development client. Never mix test connections with a production-client deployment.
2. Register its exact callback and webhook URLs. Confirm with Razorpay that partner events include the correct `account_id` and the configured signature/event-ID headers.
3. Configure approval, development credentials, origin, encryption and webhook secrets. Keep both `PLATFORM_PAYMENTS_ENABLED=false` and `PLATFORM_LAUNCH_REVIEWED=false`.
4. Enable only `PLATFORM_TEST_PAYMENTS_ENABLED=true`, deploy, and connect a test merchant through the real consent screen. Create no live connection. The UI and server must both reject live requests.
5. Exercise the matrix below. Record actual results and provider references without storing access tokens, codes or secrets in evidence.
6. Revoke and disconnect test merchants. Do not blindly swap credential pairs over stored tokens. Existing connections belong to the client and encryption key that issued/stored them.

| Check | Required observation |
| --- | --- |
| Consent denied | No connection stored; understandable result in the business account |
| State replay / expiry / another owner | Rejected before token exchange |
| Test grant | Correct merchant account and test public-token prefix; encrypted tokens not exposed |
| Callback after mode disabled | Rejected; no new connection |
| Token refresh | Access and refresh pair rotated; merchant/mode preserved |
| Checkout | Provider order matches server catalogue amount and INR currency |
| Stale price / policy | Rejected; buyer must reload and review the current storefront |
| Authorised but uncaptured payment | Pending; no confirmed fulfilment |
| Invalid callback / webhook signature | Rejected without updating payment status |
| Captured callback / signed webhook | Correct business/order/amount/currency; captured status |
| Duplicate webhook | Converges on the same captured state and event record |
| Revoked authorisation | Connection disabled and encrypted credentials cleared |
| Disconnect provider failure | Local access paused; visible retry/revoke instructions |
| Another business / anonymous user | Private management, export and order data denied |
| Provider order-creation timeout | `provider_pending`; manually reconcile in merchant Dashboard before retry |

Webhook subscriptions expected by the code: `payment.captured`, `order.paid`, `account.app.authorization_revoked`. Verify that the approved partner webhook mechanism delivers all three as expected; do not substitute a global merchant account key.

## Before a later live launch

Publish the real platform support email/address, establish a deletion request channel and final retention schedule, review platform/merchant policies, confirm allowed merchant categories, obtain a security review and verify monitoring/incident procedures. Confirm any required provider merchant activation independently. Establish fulfilment handling and stronger production abuse controls appropriate to volume; this beta does not automatically book consultations, deliver reports, issue refunds or reconcile taxes.

Only after those reviews and explicit owner authorisation should a production deployment use the production client and set `PLATFORM_LAUNCH_REVIEWED=true` and `PLATFORM_PAYMENTS_ENABLED=true`. This preparation release does neither.

## Operations and recovery

- Emergency stop: set `PLATFORM_PAYMENTS_ENABLED=false` and `PLATFORM_TEST_PAYMENTS_ENABLED=false`, then deploy. New checkouts stop. Existing signed payment confirmations must still reconcile; do not discard real payment evidence.
- OAuth stop: also set `RAZORPAY_PARTNER_APPROVED=false` and deploy to stop new grants. Revoke affected grants with Razorpay as needed; disabling the app flag does not revoke provider tokens.
- Vault-key loss: existing tokens cannot be decrypted. Restore the correct key securely or revoke grants and reconnect. Do not generate a replacement key over existing connections without a migration plan.
- Credential rotation: test the provider's supported rotation procedure and existing-grant behaviour. Do not swap client IDs blindly.
- Review failed requests through structured `omsetra_request_failed` logs (fixed area and timestamp only). Source enables sampled logs and traces; verify the hosting platform retains these settings. Invocation URL logging is disabled in source to reduce OAuth-code exposure. Provider-side tracing and platform logging policies still need review before activation.
- Uncertain orders remain visible as pending; compare their receipt/reference in the merchant's Razorpay Dashboard before asking a buyer to pay again.
- Business JSON export fetches all pages, excludes credentials and buyer capabilities, and includes saved order policy text. Old orders before the snapshot migration have an empty snapshot; it cannot be retroactively reconstructed.
- Transaction CSV covers the most recent 100 workspace orders and escapes spreadsheet formula prefixes. Use the full JSON export for all records.
