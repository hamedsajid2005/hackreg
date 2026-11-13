# Deployment

## 0. Prerequisites

- A Supabase project (may be the one shared with the evaluation platform).
- A Vercel account (or any Next.js-compatible host).
- A Razorpay account in **test mode**.
- A Resend account with a verified sending domain.

## 1. Database

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Then in **Dashboard → Project Settings → API → Exposed schemas**, add
`zelvation` (keep `public`). This only exposes a new schema; it does not modify
existing tables.

Verify:

```sql
select id, event_name, registrations_open, fee_2_members_paise from zelvation.event_settings;
select nextval('zelvation.team_id_seq');   -- sanity check, returns 1 the first time
```

> The `nextval` sanity check consumes ID 1. If you want the first real team to be
> `ZYL001`, run `select setval('zelvation.team_id_seq', 0);` afterwards.

## 2. Storage

The migration creates the private bucket `zelvation-receipts` with a 5 MB limit
and `application/pdf` restriction. Confirm it exists under **Storage** and that
"Public bucket" is **off**.

## 3. Edge Functions

```bash
supabase functions deploy create-registration
supabase functions deploy payment-webhook        --no-verify-jwt
supabase functions deploy payment-status         --no-verify-jwt
supabase functions deploy registration-details   --no-verify-jwt
supabase functions deploy registration-receipt   --no-verify-jwt
supabase functions deploy resend-confirmation-email
```

`--no-verify-jwt` is required for the participant-facing functions because they
are called with the anon key (not a user session). They are still protected: the
secret `access_token` is required, and the webhook is authenticated by HMAC
signature. `resend-confirmation-email` keeps JWT verification on by default and
additionally checks the organizer allow-list.

Set the secrets (see `docs/ENVIRONMENT.md`).

## 4. Frontend (Vercel)

1. Import the repository as a new Vercel project — **separate from the existing
   evaluation platform deployment**.
2. Framework preset: Next.js. Build `npm run build`, output `.next`.
3. Add the environment variables from `docs/ENVIRONMENT.md` (Production,
   Preview and Development).
4. Deploy.

## 5. Razorpay webhook

Dashboard → Settings → Webhooks → Add:

- **URL** `https://<your-domain>/` → actually the function URL:
  `https://<project-ref>.supabase.co/functions/v1/payment-webhook`
- **Secret** — the same value as `RAZORPAY_WEBHOOK_SECRET`
- **Active events**: `payment.captured`, `payment.failed`, `order.paid`,
  `qr_code.credited`, `qr_code.closed`

Send a test event; the response should be `{"ok":true,…}` and an audit row
`webhook.*` should appear.

## 5b. Enable dynamic UPI QR (primary payment path)

1. Ask Razorpay support to activate the **`upi_qr`** on-demand feature for your
   account (the API returns an error until it is enabled).
2. Set `RAZORPAY_ENABLE_UPI_QR=true` in the function secrets.
3. Make one test payment by scanning the generated QR, and confirm the audit log
   shows `payment.captured` (webhook) **or** `payment.reconciled_from_qr`
   (server-side reconciliation). Either is sufficient — both are implemented.

If the feature is not yet active, set the flag to `false`. Checkout still accepts
UPI apps, cards and netbanking, so registration is never blocked.

## 6. Create an organizer account

There is no public signup. Two steps:

1. **Dashboard → Authentication → Users → Add user** (email + password, confirm
   the email). Copy the user's UUID.
2. Run in the SQL editor:

```sql
insert into zelvation.organizer_users (user_id, email, full_name, role)
values ('<user-uuid>', 'organizer@zelvora.com', 'Organizer Name', 'admin')
on conflict (user_id) do update set is_active = true;
```

Sign in at `/organizer/login`. A user who authenticates but is not in
`organizer_users` is redirected back with a clear message.

## 7. Configure the event

`/organizer/settings`:

- Registration window (open/closed, deadline)
- Event dates + venue (leave blank until confirmed)
- Fees (₹299 / ₹499 / ₹699 by default), tax percentage and label
- Contact email, phone, address (blank = hidden on the site)
- Announcement banner
- Payment provider

Nothing is pre-filled with invented dates, prizes, sponsors or contact details.

## 8. Go live with payments

1. Switch Razorpay from test to live keys; update Vercel (no secret is public —
   only `NEXT_PUBLIC_PAYMENT_PROVIDER`) and the function secrets.
2. Re-create the webhook with the live-mode secret.
3. Make a real ₹1 test by temporarily setting the 2-member fee to 1 in Settings,
   verify the whole chain (webhook → team ID → receipt → email), then restore the
   fee. Historical rows keep the amount that was actually charged.

## 9. Post-deploy checklist

- [ ] `https://<domain>/` renders with the logo and "Registrations open"
- [ ] `/register` completes a test-mode payment end to end
- [ ] `/confirmation/<token>` shows the verified data; `/api/receipt/<token>`
      downloads a PDF
- [ ] Confirmation email arrives with the PDF attached
- [ ] Replaying the webhook does not create a second team ID or a second email
- [ ] `/organizer` shows correct counts; exports download real rows
- [ ] Closing registration hides the CTA on the public site
