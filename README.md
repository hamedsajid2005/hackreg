# ZELVATION — Team Registration Portal

Registration website for **ZELVATION**, the hackathon organised by
**ZELVORA TECHNOLOGIES PVT. LTD.**

This is a **standalone project**. It has its own frontend codebase, its own
deployment, and its own database schema (`zelvation`). It does not read from,
write to, or modify the existing Zelvation submission / AI-evaluation platform,
even though both may share one Supabase project.

```
Landing page → multi-step registration → server-priced payment order →
signed gateway webhook → team ID + PDF receipt + confirmation email →
organizer dashboard with exports
```

---

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui conventions, Lucide icons |
| Backend | Supabase PostgreSQL (dedicated `zelvation` schema), Supabase Edge Functions (Deno), Supabase Auth, Supabase Storage, Row Level Security |
| Payments | Razorpay (server-side orders, dynamic UPI QR, HMAC-signed webhooks) + ICICI adapter ready for merchant credentials |
| Email | Resend (HTML template, PDF attachment, delivery records) |
| PDF | `pdf-lib` inside the Edge Function, stored in a private bucket |
| Exports | `xlsx` (4-sheet workbook) + CSV, generated server-side from live rows |
| Validation | Zod (client + server), React Hook Form for the organizer settings form |
| Hosting | Vercel (frontend) + Supabase (data, functions, storage) |

No separate Express/FastAPI service is introduced — the Supabase Edge Functions
*are* the backend.

---

## Quick start

```bash
# 1. dependencies
npm install

# 2. environment
cp .env.example .env.local     # then fill in the values (see docs/ENVIRONMENT.md)

# 3. database
supabase link --project-ref <your-project-ref>
supabase db push               # applies supabase/migrations/*.sql

# 4. edge functions
supabase functions deploy create-registration
supabase functions deploy payment-webhook --no-verify-jwt
supabase functions deploy payment-status --no-verify-jwt
supabase functions deploy registration-details --no-verify-jwt
supabase functions deploy registration-receipt --no-verify-jwt
supabase functions deploy resend-confirmation-email
supabase secrets set --env-file .env.local   # or set the individual secrets

# 5. create the first organizer (SQL editor — there is no public signup)
#    see docs/DEPLOYMENT.md § Create an organizer account

# 6. run
npm run dev
```

`npm run typecheck` and `npm run lint` are both clean on this codebase.

---

## What is implemented

**Public site** — header, hero with live registration status, about, four tracks,
how-it-works, pricing (auto-computed from organizer settings), FAQ accordion,
contact, footer, privacy policy, terms. Brand palette derived from the official
logo (cyan `#06F4ED` → azure `#00A4C2` on a near-black canvas, because the logo
artwork sits on a black plate).

**Registration** — three-step wizard (team → members → review) with dynamic
member forms driven by team size, Zod validation on both sides, duplicate
registration protection, a full review screen with the fee breakdown, and a
payment stage with dynamic UPI QR + hosted checkout + live status polling.

**Payments** — the browser never decides the amount. The Edge Function reads the
trusted `event_settings` row, recomputes the fee, creates the gateway order, and
stores the exact amount/currency with the order. Confirmation happens only from a
signature-verified webhook, processed idempotently through a `SECURITY DEFINER`
Postgres function that locks the payment row, re-checks the amount, and assigns a
sequence-backed team ID (`ZYL001`, `ZYL002`, …).

**Confirmation** — private tokenised page (never a sequential team ID in the URL)
showing verified data, a print-friendly receipt, and a signed-URL PDF download.
Receipts live in a private bucket.

**Email** — Resend HTML email with the logo, team ID, members, track, amount,
payment reference, timestamp and the PDF attached. Delivery state, timestamp,
provider reference and errors are recorded; repeated webhooks never send twice;
organizers can resend failures; a failed email never reverses a payment.

**Organizer portal** — `/organizer`, Supabase Auth + allow-list
(`zelvation.organizer_users`), no public signup. Overview stats (total/paid/
pending/failed, participants, confirmed revenue, team-size and track
distribution), searchable + filterable + paginated registration list, full
registration detail with payment attempts and email records, settings editor
(open/close registration, deadline, fees, tax, contact details, announcement,
event dates/venue), and real Excel/CSV exports. Every sensitive action is written
to `zelvation.registration_audit_logs`.

---

## Verification status

| Check | Result |
| --- | --- |
| `tsc --noEmit` | passes |
| `next lint` | passes, no warnings |
| SQL migrations | written; **not yet applied** — needs your Supabase project |
| Edge Functions | written; **not yet deployed** — needs your project + secrets |
| Razorpay flow | code complete; **cannot be tested without test-mode keys** |
| Resend | code complete; **cannot be tested without an API key and verified domain** |
| `next build` | not run in the authoring sandbox (its memory cap kills the compiler). Run it on Vercel or locally — nothing in the code depends on the sandbox. |

Nothing payment-related is faked. Without keys, checkout returns a clear
"not configured" error rather than a simulated success.

---

## What still needs you

1. **Supabase project URL + keys** (and confirmation that adding a `zelvation`
   schema to the API's exposed schemas is acceptable).
2. **Razorpay test-mode** `key_id`, `key_secret`, `webhook_secret`, and
   activation of the **`upi_qr` on-demand feature** (dynamic UPI QR is the primary
   payment path you chose; it must be enabled by Razorpay support).
3. **Resend** API key and a verified sending domain.
4. **Event facts** — dates, venue, deadline, contact email/phone, any tax. The
   site ships with these blank ("To be announced") and editable in Settings; no
   dates, prizes, sponsors or contact details were invented.
5. **ICICI** — merchant credentials and the API contract if you want that
   gateway instead of Razorpay.

---

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — components, request flows, security model
- [`docs/DATABASE.md`](docs/DATABASE.md) — tables, constraints, functions, RLS policies
- [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) — every environment variable
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Supabase + Vercel + webhook setup
- [`docs/TESTING.md`](docs/TESTING.md) — the full test matrix and how to run each case
- [`docs/PAYMENT-PROVIDERS.md`](docs/PAYMENT-PROVIDERS.md) — Razorpay flow, ICICI requirements
- [`docs/PHASES.md`](docs/PHASES.md) — what was built in each phase, files touched, open items

## Brand asset

`public/zelvora-logo.png` is the uploaded official logo, byte-for-byte unmodified.
To swap in a new official file, replace that one file — every usage (header,
footer, confirmation page, receipt PDF, email, organizer login) reads from it.
