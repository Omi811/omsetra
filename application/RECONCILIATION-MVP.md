# Omsetra reconciliation beta

## Available in this first slice

Open `/reconcile` and sign in through the existing hosting authentication. One owner can manage up to ten private GSTIN-mapped organisations, independently of the existing single-business storefront workspace. GSTIN syntax is checked; registration/ownership is not verified. Staff invitations and shared CA-firm roles are not enabled yet.

Each organisation supports 200 invoices and 200 incoming bank credits. Each save is limited to 50 reviewed rows and 180 KB of normalized CSV. Browser previews accept files up to 8 MB and 500 records (Excel: 30 sheets, 80 columns, 30 header rows; PDF: 25 pages). Common bank header aliases are recognized, but this is not certification against every HDFC, ICICI, SBI or Axis statement layout. Bank statements accept searchable PDF tables, XLSX, XLS and CSV. Sales Registers accept tabular Excel/CSV and native Tally Sales voucher XML. Extraction happens locally in browser workers; original files are not uploaded or stored. Users select sheets/header rows, check column mapping, inspect extracted cells and edit/select records before an explicit save. Changing records resets review consent. Missing due dates, unknown GST, gross mismatches and invalid dates/amounts block selected rows. Debit-only rows are excluded. Native XML excludes cancelled, optional and non-Sales vouchers and rejects DTD/entities; tax ledger names are heuristics requiring review. PDF layouts vary: image-only scans, encrypted files and unrecognized tables require a fresh searchable PDF/Excel/CSV export. There is no OCR service. Formula cells are blanked rather than evaluated. No macros or linked workbook content execute. Preview limits and a 20-second worker timeout bound processing.

### Invoice CSV (INR)

```csv
Invoice Number,Customer,Net Amount,GST Amount,Invoice Date,Due Date,Reference
DEMO-101,Example Design Studio,10000,1800,2026-10-01,2026-10-15,DEMOREF123
DEMO-102,Sample Software LLP,5000,900,2026-10-02,2026-10-16,DEMOREF456
```

Use a unique invoice number within an organisation, the exact party ledger name where applicable, the pre-GST taxable value and the separate GST amount. `Reference` is optional; supply a known payment UTR/reference only when available. The importer will not manufacture it. Duplicate invoice numbers with identical data are skipped; conflicting amounts or identity fields reject the entire import instead of overwriting history.

### Bank-credit CSV (INR)

```csv
Date,Narration,Credit,Debit,UTR,Counterparty
2026-10-16,NEFT DEMO-101,11600,0,DEMOREF123,Example Design Studio
2026-10-17,NEFT DEMO-102,5900,0,DEMOREF456,Sample Software LLP
```

Dates support `YYYY-MM-DD` and `DD/MM/YYYY` (or hyphenated four-digit-year day-first dates). Amounts have at most two decimal places; quote values with grouping commas. A row with both a positive debit and credit is rejected. Debit-only and zero-credit rows are skipped. A `Currency` column, if present, must be INR. Missing counterparties are left blank, not inferred as a verified identity.

Credit import deduplication compares the same bank alias and canonical selected fields, including an occurrence index for repeated identical rows within a file. It is not a universal bank transaction identity or a guarantee of deduplicating differently formatted exports. Keep aliases consistent and review UTRs and duplicates. Bulk changes roll back as a unit if a database constraint fails.

## Matching and review rules

- Exact outstanding amount plus a strong UTR/invoice reference, or exact normalized customer name, can enter the **Auto-matched · 95+** suggestion bucket. Scores are heuristic points out of 100, not calibrated probabilities.
- Partial, TDS, fuzzy, pre-invoice-date or competing candidates require review. Amount alone never automatically identifies a customer.
- Multiple plausible invoices, or multiple credits competing for the same invoice, are demoted to review.
- Probable TDS uses `outstanding gross invoice − cash received`, compared with 1%, 2% or 10% of the original pre-GST invoice value (one-paise rounding tolerance). For example, ₹11,600 received for a ₹10,000 + ₹1,800 GST invoice can suggest ₹200/2% TDS. A ₹9,800 receipt is not assumed to settle that ₹11,800 invoice.
- Hints are not legal TDS classification or evidence of tax credit. The reviewer must confirm deduction evidence and separately verify the applicable tax credit. The app does not access Form 26AS or make tax filings.
- Every saved allocation requires a review note. TDS recognition requires a separate checkbox. No suggestion is automatically posted or exported without approval.
- A receipt can currently be assigned to one invoice only. Multiple partial receipts can reduce one invoice. Splitting one receipt across several invoices, overpayments, credit notes, foreign currency, refunds and reversals are outside this first slice.

Reviewed TDS is tracked as a receivable, not silently written off as a shortfall. Remaining invoice value deducts approved cash and reviewed TDS. Data outside this workspace is not independently verified. Opening settlements and existing ERP payment balances are not imported in this first slice. Import wholly unpaid invoices or include and approve the earlier bank receipts before treating the displayed balance as complete; otherwise receivables can be overstated.

## Audit, tenant boundaries and exports

All reads and writes resolve the signed-in owner and organisation on the server. D1 foreign keys, uniqueness and allocation triggers protect invoice/credit membership, cash amounts and over-allocation under concurrent requests. This deployment uses D1 with server-enforced tenant checks; it does **not** claim PostgreSQL RLS. A future PostgreSQL/Supabase deployment must add and test membership-based RLS before shared staff access is introduced.

Approvals, undo/reassignment, imports, export-setting changes and Tally export creation are recorded with `user_id`, UTC timestamp, `previous_state` and result. Allocation and audit changes are committed in the same batch transaction. Audit entries reject updates and deletes. Undo removes an approval and records its prior state and reason; reassigning then requires a fresh reviewed approval. Concurrent duplicate approvals and undo attempts are rejected without duplicate postings.

The screen displays the latest 50 audit records. The private JSON download includes all bounded invoices/credits/allocations and the latest 500 audit records, not an unlimited historical audit export. Audit data remains stored; automated retention/deletion workflows are still pending operator policy. No account-erasure promise is made.

Tally export produces a **receipt XML draft** containing approved allocations, balanced bank/TDS/party entries, bill reference and stable receipt IDs. It does not connect to desktop Tally, create missing ledger masters, or confirm successful import. Check company, party, bank and TDS ledger names; validate the file in a backup/test company and check previously exported vouchers before importing. An export is not an external posting. See [Tally's XML structure and validation guidance](https://help.tallysolutions.com/sample-xml/).

## Integrations and live-payment state

Zoho Books, WhatsApp Cloud API, Razorpay/Cashfree Payment Links, Account Aggregator APIs and the PDF/OCR service are **not connected** in this release. Their server actions reject requests. Overdue-invoice reminders are text drafts with no transmission, invoice attachment or payment link.

`PLATFORM_PAYMENTS_ENABLED`, `PLATFORM_TEST_PAYMENTS_ENABLED`, `PLATFORM_LAUNCH_REVIEWED` and `RAZORPAY_PARTNER_APPROVED` remain false. Nothing in the reconciliation endpoints changes these flags or makes gateway calls.

When integrated, use each organisation's own authorised merchant connection. Official merchant-scoped Razorpay OAuth is preferred to collecting merchant API secrets. Cashfree credentials, if required for the chosen integration, belong in a per-organisation encrypted server vault. No collection can route through an Omsetra bank account. OAuth authorisation does not itself prove a merchant is activated for a payment method.

## Four-week delivery sequence

This is a scope sequence, not a promise that unconfigured third-party accounts can be activated within four weeks.

| Stage | Work and acceptance criteria |
| --- | --- |
| Week 1 — reviewable manual MVP | This release: owner workspaces, bounded CSV imports, matching, mandatory review, append-only audit and XML draft/data exports. Validate with representative anonymized bank and invoice fixtures; complete support/contact arrangements before broad financial-data onboarding. |
| Week 2 — ingestion and team controls | Expand tested bank-specific adapters and XML report variants, and consider isolated OCR. A Python/FastAPI parser needs separate authenticated hosting, bounded files, malware/XXE protections, numeric/date validation, human review of uncertain OCR and a defined raw-document deletion policy. It cannot be deployed as a normal Python server inside the current Sites Worker. For staff/CA teams, add explicit memberships/roles and tested PostgreSQL RLS if migrating the backend. |
| Week 3 — accounting sync | Register Zoho OAuth, select the correct regional API domain/organisation, encrypt and rotate tokens, import open invoices, and implement idempotent reviewed receipt writes with a sync outbox. Validate Tally vouchers in a real test company. Add multi-invoice splits, reversals and durable audit/export pagination. |
| Week 4 — collections and release review | Verify WhatsApp Business, approved templates and recipient opt-in. Generate links solely through the business's authorised gateway connection after partner/merchant activation. Add explicit send preview/approval, provider message IDs, webhook verification, retry limits and opt-out handling. Finalize retention/deletion, support, security testing, monitoring and recovery before separately authorizing any live payments. |

The recommended Python/PostgreSQL stack is a future deployment choice, not silently provisioned infrastructure. This first slice reuses the existing Next-compatible TypeScript app, hosting authentication and D1 to ship the manual workflow without introducing unconfigured services or new financial credentials.

Reference integration guidance: [Zoho Books OAuth](https://www.zoho.com/books/api/v3/oauth/), [Razorpay OAuth](https://razorpay.com/docs/partners/technology-partners/onboard-businesses/integrate-oauth/integration-steps), and [official tax-credit verification guidance](https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/know-tan-details-faq).

Parser libraries: Mozilla PDF.js, SheetJS CE (official 0.20.3 distribution), fast-xml-parser. Runtime parsing assets are self-hosted. Tests: `node --test tests/import-preview.test.mjs` plus existing security/reconciliation suite. Native DSP report XML/custom Sales voucher types require a tabular export; they are not guessed.
