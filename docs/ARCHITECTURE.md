# Architecture

## 1. Isolation from the existing platform

The submission / AI-evaluation platform and this registration portal may share a
single Supabase project. Isolation is enforced three ways:

1. **Separate schema.** Every object created here lives in `zelvation`
   (`zelvation.registrations`, …). Nothing in `public` is created, altered or
   dropped, so an existing table with a name like `registrations` is untouched.
2. **Separate frontend and deployment.** This repository contains no code from
   the evaluation platform and is deployed as its own Vercel project.
3. **Separate authorization surface.** Registration tables are readable only by
   rows present in `zelvation.organizer_users`, via the
   `zelvation.is_organizer()` helper. Users of the evaluation platform have no
   path to this data.

> Before running the migrations on a shared project, confirm the API's exposed
> schemas include `zelvation` (Dashboard → Project Settings → API → Exposed
> schemas). Adding a schema does not modify existing ones.

## 2. Components

```
Browser (Next.js App Router)
  ├─ Landing / legal pages            ← server components, read event_settings
  ├─ /register  (client wizard)       → POST  create-registration (Edge Function)
  ├─ /confirmation/[token]            ← server component, admin read by secret token
  ├─ /receipt/[token]                 ← print-friendly HTML receipt
  └─ /api/receipt/[token]             ← 302 to a short-lived signed URL

Organizer (Supabase Auth session)
  ├─ /organizer/…                     ← server components, service-role reads
  ├─ /api/organizer/export            ← XLSX / CSV from live rows + audit entry
  └─ server actions                   ← settings, open/close, resend email

Supabase Edge Functions (Deno, service role)
  ├─ create-registration              ← validation + pricing + gateway order
  ├─ payment-webhook                  ← signature verify → confirm_payment
  ├─ payment-status                   ← polling for the checkout page
  ├─ registration-details             ← public-safe projection by secret token
  ├─ registration-receipt             ← (re)generate PDF + signed URL
  └─ resend-confirmation-email        ← organizer-only resend
```

## 3. Request flow — registration and payment

1. The wizard validates locally (Zod) and POSTs the team + members.
2. `create-registration` re-validates with its own Zod schema (Edge Functions do
   not import the Next bundle), checks the registration window, and rejects
   duplicate team names / leader emails.
3. It reads `zelvation.event_settings`, computes
   `fee = base[team_size] + round(base * tax_percent / 100)` **in paise**, and
   writes a `pending_payment` registration with that amount.
4. It creates the gateway order server-side with the same amount, stores
   `provider_order_id`, `amount_paise`, `currency`, and (when enabled) the
   dynamic UPI QR id + image URL.
5. The browser receives `{ access_token, order, qr, checkout_mode }` — never a
   team ID.
6. The participant pays. The gateway calls `payment-webhook`.
7. The webhook verifies the HMAC signature over the **raw body**, resolves our
   order (by `order_id`, or by `qr_code_id` for UPI QR payments), then calls
   `zelvation.confirm_payment(...)`.
8. `confirm_payment` locks the payment row, rejects an amount/currency mismatch,
   is idempotent on replay, assigns `ZYL00n` from `zelvation.team_id_seq`, flips
   the registration to `confirmed`, and writes an audit row.
9. The webhook generates the PDF receipt into the private bucket, then calls
   `deliverConfirmationEmail` (which upserts a single delivery row per
   registration).
10. The confirmation page and the checkout page poll `payment-status`; both read
    the database, never a redirect parameter.

## 4. Security model

**Trust boundaries**

- Browser input is untrusted: every field is validated server-side and the
  amount is always recomputed.
- A gateway redirect is never proof of payment; only the signed webhook is.
- A payment screenshot is never accepted as proof of anything.
- Sequential team IDs are never used as lookup keys. The confirmation page uses
  a `uuid` `access_token` (`gen_random_uuid()`), so IDs cannot be enumerated.

**Keys**

| Key | Where it lives |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser bundle (safe; RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | server components / server actions / route handlers only |
| Razorpay key secret, webhook secret | Edge Function secrets only |
| Resend API key | Edge Function secrets only |

No secret is ever referenced from a `"use client"` module. `src/lib/supabase/admin.ts`
is imported only by server files.

**Database**

- RLS is enabled on all seven tables, and `FORCE`d on the three participant
  tables.
- No INSERT/UPDATE/DELETE policy exists for participants on any registration
  table, so the anon and authenticated roles cannot write — only the service role
  (Edge Functions) can.
- `confirm_payment` and `next_team_id` are `SECURITY DEFINER` with
  `EXECUTE` revoked from `public` and granted to `service_role` only.
- Unique indexes: `provider_order_id`, `provider_payment_id`, `team_id`,
  `lower(team_name)` and `lower(leader_email)` among non-cancelled rows — the
  database, not the app, is the last line of defence against duplicates.

**Web**

- Input sanitisation of free text before persistence; parameterised queries
  throughout (Supabase client / RPC).
- CSV export neutralises spreadsheet formula injection (`= + - @` prefixes).
- Security headers in `next.config.mjs`; `/organizer/*` gated by middleware
  **and** re-checked in the layout and in every server action / route handler.
- Safe error envelopes: internal messages and gateway payloads are logged
  server-side, never returned to the browser.
- Rate limiting: 8 registration creations per IP per 10 minutes, counted from the
  audit log. For production put Cloudflare/WAF or Upstash in front as well.

## 5. Performance notes (500 participants / 125–250 teams)

- Indexed on `created_at`, `status`, `track`, `team_size`, `team_id`,
  `lower(team_name)`, `lower(leader_email)`.
- Organizer list is paginated (25/page) with `count: exact`; exports are capped
  at 5 000 rows.
- The landing page is statically rendered with `revalidate = 60` and reads a
  single settings row; there is no per-visitor database work.
- The logo is a single 59 KB PNG served through `next/image` (AVIF/WebP).
- No client-side polling except while a payment is pending (5 s interval, stops
  as soon as the row is confirmed).
