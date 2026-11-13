# Payment providers

## Razorpay (implemented)

### Order creation (server only)

`supabase/functions/_shared/providers.ts → RazorpayProvider.createOrder`

```
POST https://api.razorpay.com/v1/orders
Authorization: Basic base64(key_id:key_secret)
{ amount: <paise>, currency: "INR", receipt, notes: { registration_id, team_name }, payment_capture: 1 }
```

The amount comes from `zelvation.event_settings` via `_shared/pricing.ts`, never
from the browser. The returned `order.id` is stored on
`registration_payments.provider_order_id` together with `amount_paise` and
`currency`.

### Dynamic UPI QR (the primary payment path)

> **Account prerequisite.** `type: "upi_qr"` is an **on-demand feature** on
> Razorpay — it must be activated for your account before QR creation will
> succeed ("raise a request with our Support team"). Until it is enabled, leave
> `RAZORPAY_ENABLE_UPI_QR=false`; the checkout page still accepts UPI apps,
> cards and netbanking, so registration is never blocked.

Enabled with `RAZORPAY_ENABLE_UPI_QR=true` **and** UPI QR activated:

```
POST https://api.razorpay.com/v1/payments/qr_codes
{ type: "upi_qr", usage: "single_use", fixed_amount: true,
  payment_amount: <paise>, currency, close_by: <now + 15 min>, notes: {...} }
```

Request body fields used: `type: "upi_qr"`, `usage: "single_use"`,
`fixed_amount: true`, `payment_amount` (paise), `close_by` (now + 15 min — the
API requires at least 2 minutes, and silently caps anything above 2 hours),
`notes: { registration_id, team_name }`.

The returned `image_url` is shown as the **primary panel** on the payment page
with the exact amount and an expiry countdown driven by the returned `close_by`.
`qr_code_id` is persisted so a QR payment can be matched back to our order. The
QR is single-use and amount-fixed: a static personal UPI QR is never used, and a
scan is never treated as payment success.

If QR creation fails (for example because the feature is not activated), checkout
still works — the failure is logged, not surfaced as a blocker.

#### Confirming a QR payment (two independent paths)

QR settlements arrive with **`order_id: null`**, so neither the webhook nor the
polling endpoint can rely on an order reference. Both paths therefore resolve the
order through `qr_code_id`:

1. **Webhook** — `payment.captured` carrying `qr_code_id` (or
   `qr_code.credited`, which we audit but never confirm on).
2. **Reconciliation** — while a registration is still `pending_payment`,
   `payment-status` calls
   `GET /v1/payments/qr_codes/:id/payments?from=<order created_at>` and, for any
   payment with `status: "captured"`, runs the same
   `zelvation.confirm_payment(...)` function the webhook uses.

Reconciliation means a delayed, misconfigured or missing webhook cannot leave a
paid team unconfirmed, and it is safe to run repeatedly: `confirm_payment` is
idempotent and rejects an amount mismatch. The browser only *triggers* the check;
the gateway is the source of truth.

### Checkout

Client-side Razorpay Checkout with `order_id`, `key`, `amount`, `currency` and
`theme.color = #06F4ED`. The `handler` callback only navigates to the
confirmation page — it does **not** confirm anything.

### Webhook verification

`POST /functions/v1/payment-webhook`

1. Raw body read with `req.text()` (never re-serialised — that would break HMAC).
2. `HMAC-SHA256(RAZORPAY_WEBHOOK_SECRET, rawBody)` compared in constant time with
   `x-razorpay-signature`. Failure → `401` and nothing is written.
3. Event mapping:

| Event | Action |
| --- | --- |
| `payment.captured`, `order.paid` | confirm (amount-checked) |
| `payment.failed` | mark the order `failed` |
| `qr_code.credited` | audit only — **no confirmation**; the matching `payment.captured` confirms |
| `qr_code.closed`, `qr_code.expired` | mark the order `expired` |
| anything else | audit only, `200` |

4. Order resolution: `payment.entity.order_id` → `payment.entity.notes.order_id`
   → `order.entity.id` → lookup by `qr_code_id` (UPI QR payments).
5. `zelvation.confirm_payment(...)` then receipt, then email.

Idempotency: the payment row is locked `FOR UPDATE`; a replay returns
`already_confirmed = true` with the same team ID, and the email layer upserts one
delivery row per registration.

> **Note on UPI QR confirmation.** Whether `payment.captured` fires for a QR
> payment, and whether it carries `order_id`, depends on your Razorpay account
> configuration. The handler covers both cases (it matches by `qr_code_id` when
> `order_id` is absent). Verify this once with a real test-mode QR payment before
> enabling `RAZORPAY_ENABLE_UPI_QR` in production. If your account does not emit
> a usable event, keep the flag `false` — hosted checkout supports UPI apps
> (Google Pay, PhonePe, Paytm) anyway.

### What to collect from Razorpay

- `RAZORPAY_KEY_ID` (`rzp_test_…` / `rzp_live_…`)
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET` (value you choose when creating the webhook)
- Confirmation that **UPI QR** is enabled (only if you want the QR panel)

---

## ICICI Bank merchant gateway (adapter ready, awaiting credentials)

`IciciProvider` implements the same `PaymentProvider` interface:

```ts
createOrder(input): Promise<ProviderOrder>
verifyWebhook(rawBody, headers): Promise<VerifiedEvent>
```

It is intentionally inert. It refuses to run with a clear 503 until **all** of the
following exist, and it never simulates a payment:

`ICICI_MERCHANT_ID`, `ICICI_API_KEY`, `ICICI_API_SECRET`, `ICICI_BASE_URL`,
`ICICI_WEBHOOK_SECRET`.

### What is needed from ICICI / your relationship manager

1. **Merchant onboarding** — MID, terminal/aggregator ID, and the environment
   (UAT sandbox + production base URLs).
2. **API specification** for the merchant payment gateway:
   - order / sale-request endpoint and payload
   - the exact request-signing scheme (hash algorithm, field ordering, key
     handling) and how the response signature is validated
   - hosted checkout / redirect flow parameters, if offered
   - UPI intent / dynamic QR support and the endpoint that returns a QR payload
     or image for a fixed amount
3. **Webhook (S2S) contract** — event names, payload shape, signature header
   name, hashing algorithm, retry policy, and the IP ranges to allow-list.
4. **Settlement + refund** endpoints, and whether partial refunds are supported.
5. **Test credentials** for the UAT environment, plus test cards/UPI handles.

Once those are in hand, the work is confined to `IciciProvider.createOrder` and
`IciciProvider.verifyWebhook` — nothing else in the app changes, because the
database, team-ID generation, receipt and email layers are provider-agnostic.
Set `event_settings.payment_provider = 'icici'` from the organizer Settings page
to switch.

---

## Money handling rules (both providers)

- All amounts are integer **paise** end to end; rupees exist only in the UI.
- The fee table lives in `zelvation.event_settings`; the server recomputes on
  every order. A client-supplied amount is ignored entirely.
- Tax is `round(base * tax_percent / 100)`, added only when `tax_percent > 0`.
- The webhook amount is compared with the stored `amount_paise`; a mismatch marks
  the payment `failed` and raises an audit record instead of confirming.
- Card numbers, CVVs, UPI PINs and netbanking credentials never reach our code —
  they are entered on the gateway's hosted surface.
