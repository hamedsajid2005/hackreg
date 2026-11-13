# Environment variables

Two destinations, because the app runs in two places:

- **Next.js** (Vercel) — everything in `.env.local` / Vercel Project Settings.
- **Supabase Edge Functions** — the secrets you set with `supabase secrets set`.

Variables marked *server-only* must never be prefixed with `NEXT_PUBLIC_`.

## Next.js

| Variable | Public? | Required | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | ✅ | Publishable anon key (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | **no** | ✅ | Server reads/writes for organizer pages, server actions, receipt route |
| `NEXT_PUBLIC_SITE_URL` | yes | ✅ | Canonical URL for metadata/OG |
| `NEXT_PUBLIC_PAYMENT_PROVIDER` | yes | – | `razorpay` (default) or `icici`; display only — the real choice is `event_settings.payment_provider` |
| `SITE_URL` | no | – | Used by the receipt generator if it needs an absolute URL |

The organizer portal, exports and receipt download all need
`SUPABASE_SERVICE_ROLE_KEY`. Without it they fail loudly rather than silently
degrading.

## Edge Functions

Set with:

```bash
supabase secrets set \
  SITE_URL="https://zelvation.yourdomain.com" \
  SUPABASE_ANON_KEY="<anon key>" \
  RAZORPAY_KEY_ID="rzp_test_…" \
  RAZORPAY_KEY_SECRET="…" \
  RAZORPAY_WEBHOOK_SECRET="…" \
  RAZORPAY_ENABLE_UPI_QR="false" \
  RESEND_API_KEY="re_…" \
  RESEND_FROM_EMAIL="Zelvation <registrations@yourdomain.com>"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by the
Supabase runtime — do not set them manually.

| Variable | Required | Purpose |
| --- | --- | --- |
| `SITE_URL` | ✅ | Absolute URL used to embed the logo in emails and PDFs; also the CORS origin |
| `SUPABASE_ANON_KEY` | ✅ | Only used by `resend-confirmation-email` to verify the organizer's JWT |
| `RAZORPAY_KEY_ID` | ✅ (razorpay) | Public key id returned to checkout |
| `RAZORPAY_KEY_SECRET` | ✅ (razorpay) | Server-side Basic auth for order creation |
| `RAZORPAY_WEBHOOK_SECRET` | ✅ (razorpay) | HMAC-SHA256 verification of `x-razorpay-signature` |
| `RAZORPAY_ENABLE_UPI_QR` | – | `true` (default for this deployment) creates a single-use dynamic UPI QR per order. Requires the `upi_qr` on-demand feature to be activated on your Razorpay account — see `docs/PAYMENT-PROVIDERS.md` |
| `RESEND_API_KEY` | ✅ | Transactional email |
| `RESEND_FROM_EMAIL` | ✅ | Verified sender, e.g. `Zelvation <registrations@yourdomain.com>` |
| `ICICI_MERCHANT_ID`, `ICICI_API_KEY`, `ICICI_API_SECRET`, `ICICI_BASE_URL`, `ICICI_WEBHOOK_SECRET` | – | Only when switching to ICICI; the adapter refuses to run until all five are present |

## Generating secrets

```bash
# Razorpay webhook secret (any strong random string; paste the same value
# into the Razorpay dashboard when you create the webhook)
openssl rand -hex 32
```

## Rotation

- Rotate `SUPABASE_SERVICE_ROLE_KEY` in Supabase, then update Vercel and the
  function secrets.
- Rotate Razorpay keys from the dashboard; update both Vercel (`NEXT_PUBLIC_`
  is not used for the secret) and the function secrets. Existing paid
  registrations are unaffected — historical payment rows keep their references.
