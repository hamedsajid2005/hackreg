# Phase report

What was built in each phase, the files it touched, the migrations and
environment variables it needs, how to test it, and what remains open.

---

## Phase 1 — Project setup, branding, landing page

**Implemented**
- Next.js 14 App Router + TypeScript + Tailwind + shadcn-style UI primitives.
- Brand palette derived from the official logo (`#06F4ED` cyan, `#01F6D3` teal,
  `#00A4C2` azure) on a near-black canvas, chosen because the logo artwork is
  authored on a black plate — this keeps the mark legible without altering it.
- `Sora` (display) + `Inter` (body) via `next/font`, smooth scrolling, scroll
  reveals, reduced-motion support, accessible focus rings, skip link.
- Landing page: header (logo, nav, status pill, Register Now), hero (event name,
  tagline, description, live registration status, event info), about, four
  tracks, how-it-works, pricing, FAQ accordion, contact, footer.
- Privacy policy and terms pages that read the organizer's settings.
- 404 page; security headers; SEO metadata and OG image.

**Files** — `package.json`, `tsconfig.json`, `next.config.mjs`,
`tailwind.config.ts`, `src/app/{layout,page,globals.css,not-found}.tsx`,
`src/app/privacy/page.tsx`, `src/app/terms/page.tsx`,
`src/components/{logo,site-header,site-footer,reveal}.tsx`,
`src/components/landing/*`, `src/components/ui/*`,
`src/lib/{config,constants,types,utils,pricing,event-settings}.ts`.

**Migrations** — none. **Env** — `NEXT_PUBLIC_SITE_URL` (optional at this stage).

**Test** — `npm run dev`, open `/`. Toggle `registrations_open` in
`zelvation.event_settings` and reload to see the CTA and status change.

**Open** — none.

---

## Phase 2 — Registration form, members, validation, dynamic pricing

**Implemented**
- Three-step wizard: team → members → review, with a stepper and back/forward
  editing at every stage.
- Team size 2/3/4 regenerates the member forms automatically; existing entries
  are preserved when the size changes.
- Member 1 is always the team leader (read-only role, leader badge, drives the
  primary contact and the confirmation email).
- Zod schemas shared by client and server; cross-field rules (member count,
  duplicate emails/phones inside a team, no empty records).
- Indian mobile validation (`^[6-9]\d{9}$`), email normalisation, team-name
  pattern, 35-state selector.
- Review screen with full team + member summary and the fee breakdown; terms
  acceptance gate; the pay button carries the computed total.
- Pricing computed from `event_settings` (no hard-coded ₹ values in the UI).

**Files** — `src/app/register/page.tsx`,
`src/components/registration/registration-wizard.tsx`,
`src/components/ui/{button,input,label,card}.tsx`,
`src/lib/validation/registration.ts`, `src/lib/api.ts`.

**Migrations** — none yet. **Env** — none.

**Test** — `/register`: change team size, confirm forms resize; try invalid email
and phone; confirm the review total matches the pricing section.

**Open** — none.

---

## Phase 3 — Database, migrations, Edge Functions, RLS

**Implemented**
- Dedicated `zelvation` schema with seven tables, all constraints, indexes and
  triggers described in `docs/DATABASE.md`.
- `team_id_seq` + `next_team_id()`, `confirm_payment()`,
  `mark_payment_status()`, `attach_receipt()`, `is_organizer()`.
- RLS enabled on every table, `FORCE`d on participant tables; no participant
  write policies at all — the service role is the only write path.
- Private `zelvation-receipts` bucket with an organizer read policy.
- `create-registration` and `payment-status` Edge Functions with server-side
  validation, duplicate protection, rate limiting and audit logging.
- Supabase clients: browser (anon), server (cookies/RLS), admin (service role).

**Files** — `supabase/migrations/20260101000000_zelvation_01_schema.sql`,
`…_02_functions.sql`, `…_03_rls_storage.sql`, `supabase/config.toml`,
`supabase/functions/_shared/{http,db,validation,pricing}.ts`,
`supabase/functions/create-registration/index.ts`,
`supabase/functions/payment-status/index.ts`,
`src/lib/supabase/{client,server,admin}.ts`, `src/lib/registrations.ts`.

**Migrations** — all three. **Env** — `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`.

**Test** — `supabase db push`, then the SQL checks in `docs/DEPLOYMENT.md §1`;
`docs/TESTING.md` R1–R13.

**Open** — migrations not yet applied to your project (needs your project ref).

---

## Phase 4 — Payment gateway + dynamic UPI QR

**Implemented**
- Provider adapter interface with a complete `RazorpayProvider` (server-side
  order creation, single-use dynamic UPI QR, HMAC webhook verification with
  constant-time comparison) and an `IciciProvider` that refuses to run until
  credentials and the API contract exist.
- `create-registration` creates the order with the server-computed amount,
  stores amount + currency with the order, and returns only the checkout data —
  never a team ID.
- Payment stage UI: amount, QR with expiry countdown, hosted checkout, live
  status polling, "New order" for expired/failed orders, safe resume via
  `/register?resume=<token>`.

**Files** — `supabase/functions/_shared/providers.ts`,
`src/components/registration/registration-wizard.tsx` (payment stage),
`docs/PAYMENT-PROVIDERS.md`.

**Migrations** — `registration_payments` (from phase 3).
**Env** — `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_ENABLE_UPI_QR`.

**Test** — `docs/TESTING.md` P1–P10.

**Decision (confirmed with the organiser)** — dynamic UPI QR is the **primary**
payment path. Consequence: QR settlements carry `order_id: null`, and
`upi_qr` is an on-demand Razorpay feature that must be activated on the account.
The payment page now leads with the QR, and confirmation does not depend on any
single webhook event (see Phase 5 reconciliation).

**Open** — needs Razorpay test keys and `upi_qr` activation. ICICI needs merchant
onboarding (see `docs/PAYMENT-PROVIDERS.md`).

---

## Phase 5 — Webhook verification + team ID generation

**Implemented**
- `payment-webhook` verifies the signature over the raw body, resolves the order
  (including by `qr_code_id` for UPI QR), and confirms through
  `zelvation.confirm_payment`.
- `confirm_payment` locks the payment row, rejects amount/currency mismatches,
  is idempotent on replay, and assigns `ZYL001…` from a Postgres sequence with a
  unique constraint behind it.
- Failure/expiry events mark the order without ever downgrading a success.
- Every webhook is recorded in the audit log.
- **QR reconciliation:** `payment-status` also queries
  `GET /v1/payments/qr_codes/:id/payments` while a QR-backed registration is
  pending, and confirms any captured payment through the same idempotent
  function. A missing or delayed webhook therefore cannot strand a paid team.
- Post-confirmation side effects (receipt + email) live in one shared
  `finalize.ts` used by both the webhook and the reconciliation path.

**Files** — `supabase/functions/payment-webhook/index.ts`,
`supabase/functions/_shared/providers.ts`,
`supabase/migrations/…_02_functions.sql`.

**Test** — the replay recipe in `docs/TESTING.md §2` (run twice → same team ID,
no duplicate email); C1–C4.

**Open** — none in code; needs a live webhook to observe.

---

## Phase 6 — PDF receipt + confirmation email

**Implemented**
- A4 branded PDF via `pdf-lib` (logo, event, organiser, team ID, team, size,
  leader, members table, track, amount, payment reference, status, timestamp,
  confirmation statement). Amounts render as `INR 499.00` because pdf-lib's
  standard fonts have no ₹ glyph — deliberate, not a bug.
- Uploaded to the private bucket; path stored on the payment row; served through
  a 120-second signed URL (`/api/receipt/[token]`) and a print-friendly HTML
  receipt (`/receipt/[token]`).
- Resend HTML email in the brand colours with the logo, team ID, details and the
  PDF attached; delivery status, timestamp, provider reference and errors stored
  in `registration_emails`; one row per registration per template, so repeated
  webhooks cannot send twice; organizer resend for failures; email failure never
  reverses a payment.
- Confirmation page reads verified data by secret token, never by team ID.

**Files** — `supabase/functions/_shared/{receipt,email}.ts`,
`supabase/functions/registration-receipt/index.ts`,
`supabase/functions/resend-confirmation-email/index.ts`,
`src/app/confirmation/[token]/page.tsx`, `src/app/receipt/[token]/page.tsx`,
`src/app/api/receipt/[token]/route.ts`,
`src/components/registration/{pending-watcher,print-button}.tsx`.

**Env** — `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SITE_URL`.

**Test** — C5–C9.

**Open** — needs a Resend key and a verified sending domain.

---

## Phase 7 — Organizer dashboard, management, exports

**Implemented**
- `/organizer` behind Supabase Auth + `zelvation.organizer_users` (no public
  signup); middleware, layout, server actions and route handlers all re-check
  authorization independently.
- Overview: total/paid/pending/failed, participants, confirmed revenue, team-size
  and track distributions, latest registrations, open/close toggle.
- Registrations: search (team ID, team name, leader name, email), filters (size,
  track, registration status, payment status, date range), pagination, detail
  view with members, payment attempts and email records, receipt download,
  resend email.
- Settings: registration window, deadline, event dates, venue, fees, tax, contact
  details, announcement, payment provider — React Hook Form + Zod, every save
  audited.
- Exports: 4-sheet XLSX workbook (Team Registrations, Member Details, Payments,
  Email Records), CSV per dataset, filtered variants; generated server-side from
  live rows, with formula-injection protection and an audit entry per export.

**Files** — `src/app/organizer/login/page.tsx`,
`src/app/organizer/(dashboard)/{layout,page}.tsx`,
`…/registrations/page.tsx`, `…/registrations/[id]/page.tsx`,
`…/settings/page.tsx`, `src/app/organizer/actions.ts`,
`src/app/api/organizer/export/route.ts`,
`src/components/organizer/*`, `src/lib/{auth,export}.ts`.

**Test** — O1–O15.

**Open** — none.

---

## Phase 8 — Security, integration, performance, deployment

**Implemented**
- Server-side validation on every input; amount always recomputed.
- Signature-verified, idempotent webhook; transaction-safe team IDs; unique
  constraints as the last line of defence.
- Private receipts, short-lived signed URLs, non-enumerable confirmation tokens.
- Safe error envelopes, no secrets in client bundles, security headers,
  `poweredByHeader: false`, CSP-adjacent hardening.
- Audit logging across participant and organizer actions.
- Rate limiting on registration creation; CSV injection protection; input
  sanitisation; parameterised queries throughout.
- Indexes for every search/filter field; paginated dashboard; exports capped.
- Deployment, environment, testing and provider documentation.

**Verified here**
- `tsc --noEmit` — clean.
- `next lint` — clean.
- Logo copied byte-for-byte from the upload; every usage reads that one file.

**Not verified here (needs your accounts)**
- `next build` — the authoring sandbox has a ~1.5 GB virtual-memory cap that
  kills the Next compiler. Run it locally or let Vercel do it.
- Migration application, Edge Function deployment, Razorpay test payments,
  Resend delivery, live webhook replay.

---

## Open items, in priority order

1. Supabase project ref + keys, and confirmation that exposing the `zelvation`
   schema is acceptable.
2. Razorpay test keys + webhook secret (+ UPI QR availability).
3. Resend key + verified domain.
4. Event facts (dates, venue, deadline, contact, any tax) — entered in Settings;
   nothing was invented.
5. ICICI credentials + API contract, if you prefer that gateway.
6. A real device pass on mobile Safari and Chrome for the checkout redirect and
   the Razorpay modal.
