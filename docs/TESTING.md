# Testing

Every case below is written against a **test-mode** deployment. Nothing here
fakes a payment: the success path always goes through the gateway.

Prerequisites: migrations applied, functions deployed, `RAZORPAY_*` test secrets
set, at least one organizer row, and `RAZORPAY_ENABLE_UPI_QR` matching your
account's capability.

## 1. Registration

| # | Case | How | Expected |
| --- | --- | --- | --- |
| R1 | 2 members ₹299 | Register a 2-member team | Review shows base ₹299, total ₹299; order created for `29900` paise |
| R2 | 3 members ₹499 | Team size 3 | ₹499 / `49900` |
| R3 | 4 members ₹699 | Team size 4 | ₹699 / `69900` |
| R4 | Member count mismatch | DevTools → edit the POST body so `team_size: 4` with 2 members | `422 member_count_mismatch`; nothing inserted |
| R5 | Invalid email | Enter `abc@` | Inline error; blocked client-side and server-side |
| R6 | Invalid mobile | Enter `12345` or `5123456789` | Rejected (must be `^[6-9]\d{9}$`) |
| R7 | Missing information | Leave city/state/track blank | Step does not advance; errors on the fields |
| R8 | Duplicate team name | Register the same team name twice | `409 duplicate_registration` |
| R9 | Duplicate leader email | Same leader email, different team name | `409` with the leader-email message |
| R10 | Duplicate member email inside a team | Two members with one email | Blocked before the order is created |
| R11 | Closed registration | Settings → close → open `/register` | "Registrations are closed"; direct API call returns `423` |
| R12 | Price tampering | POST with `amount: 100` | Ignored — the server uses the settings table |
| R13 | Rate limit | 9 registrations from one IP in 10 min | `429 rate_limited` |

## 2. Payments

| # | Case | How | Expected |
| --- | --- | --- | --- |
| P1 | Successful | Test card `4111 1111 1111 1111`, any future expiry, any CVV | Confirmation page shows a team ID; receipt + email arrive |
| P2 | Failed | Test card `4000 0000 0000 0002` | Checkout reports failure; `registration_payments.status = 'failed'`; no team ID |
| P3 | Pending / abandoned | Open checkout, close it | Registration stays `pending_payment`; status page keeps polling |
| P4 | Cancelled | Close the modal | No confirmation; "New order" available |
| P5 | Expired QR | Enable QR, wait past `close_by` | Countdown hits zero; "New order" creates a fresh QR |
| P6 | Retry after failure | `/register?resume=<access_token>` or "New order" | Old pending order marked `expired`, new order created, same registration |
| P7 | Amount tampering at the gateway | Create the order, then send a webhook with `amount: 100` | `AMOUNT_MISMATCH` → payment marked `failed`, registration **not** confirmed |
| P8 | Invalid signature | Send a webhook with a wrong `x-razorpay-signature` | `401 invalid_signature`, nothing written |
| P9 | Missing signature | Send without the header | `401` |
| P10 | Unknown order | Webhook with an unknown `order_id` | `200 {unresolved:true}`, no side effects |
| P11 | QR paid, webhook suppressed | With `RAZORPAY_ENABLE_UPI_QR=true`, pay a QR, then in the Razorpay dashboard **disable the webhook** and leave the confirmation page open | `payment-status` reconciles against `/v1/payments/qr_codes/:id/payments` and the page flips to confirmed within one poll — audit shows `payment.reconciled_from_qr` |
| P12 | QR scanned, not paid | Open the QR, scan, then abandon before paying | Nothing is confirmed; the page keeps waiting. A scan is never treated as payment |
| P13 | QR expiry | Leave the QR until `close_by` passes | Countdown reaches zero; "New order" issues a fresh QR; the old one is marked `expired` |

### Replaying a webhook locally

```bash
cat > /tmp/evt.json <<'JSON'
{"event":"payment.captured","payload":{"payment":{"entity":{
  "id":"pay_TEST0001","order_id":"order_REPLACE_ME","amount":49900,
  "currency":"INR","method":"upi"}}}}
JSON

SIG=$(openssl dgst -sha256 -hmac "$RAZORPAY_WEBHOOK_SECRET" -hex /tmp/evt.json | sed 's/^.* //')

curl -i -X POST "https://<ref>.supabase.co/functions/v1/payment-webhook" \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: $SIG" \
  --data-binary @/tmp/evt.json
```

Run it twice. First call returns `team_id: "ZYL00n"`, `already_confirmed: false`.
Second call returns the **same** team ID with `already_confirmed: true`, and
`registration_emails.attempts` does not increase.

For a UPI QR payment the same effect can be observed without any webhook at all:
pay the QR and poll the status endpoint — reconciliation confirms it (P11).

## 3. Confirmation

| # | Case | How | Expected |
| --- | --- | --- | --- |
| C1 | Team ID generated | After P1 | `ZYL001`-style ID, sequential, unique |
| C2 | No ID before payment | Inspect a pending row | `team_id IS NULL` |
| C3 | Concurrent payments | Two simultaneous successful payments | Two different IDs, no gap-related errors, no duplicates |
| C4 | Duplicate webhook | Replay P1 | No second ID, no second email |
| C5 | PDF receipt | "Download PDF receipt" | Branded A4 PDF, logo present, private storage, 120 s signed URL |
| C6 | Receipt privacy | Open the bucket object URL directly | Denied — bucket is private |
| C7 | Confirmation email | Check the leader inbox | Subject "Zelvation Registration Confirmed — Your Team ID", PDF attached |
| C8 | Duplicate email | Replay webhook | Still exactly one email |
| C9 | Email failure | Use an invalid `RESEND_API_KEY`, pay successfully | Payment stays `confirmed`; `registration_emails.status = 'failed'`; organizer can resend |
| C10 | Another team's data | Change the token in the URL | `404` — tokens are random UUIDs, team IDs are not lookup keys |

## 4. Organizer

| # | Case | How | Expected |
| --- | --- | --- | --- |
| O1 | Unauthenticated | Open `/organizer` signed out | Redirect to `/organizer/login` |
| O2 | Authenticated, not allow-listed | Sign in with a user absent from `organizer_users` | Redirect back with the "not on the allow-list" message |
| O3 | No public signup | Look for a register link | None exists |
| O4 | Dashboard counts | Compare with `select status, count(*) from zelvation.registrations group by 1;` | Matches |
| O5 | Revenue | Compare with `select sum(amount_paise) from zelvation.registrations where status='confirmed';` | Matches |
| O6 | Search | Search a team ID / team name / leader name / email | Correct single result |
| O7 | Filters | team size + track + status + payment status + date range | Combined filtering, pagination preserved |
| O8 | Detail view | Open a row | Members, payment attempts, email records, receipt links |
| O9 | Excel export | Export → Full workbook | 4 sheets with the specified columns, autofilter, readable widths |
| O10 | CSV exports | Teams / Members / Payments | Correct columns, UTF-8 BOM, formula-injection safe |
| O11 | Filtered export | Apply filters → Export | Only matching rows |
| O12 | Unauthorised export | `curl /api/organizer/export` with no session | `401` |
| O13 | Close registration | Toggle in Settings | Public CTA disabled, `/register` shows closed, API returns `423` |
| O14 | Audit trail | `select action, actor_email, created_at from zelvation.registration_audit_logs order by created_at desc limit 20;` | Settings changes, exports, resends, confirmations present |
| O15 | Resend email | Detail page → Resend | New attempt recorded; `attempts` increments |

## 5. Design / UX

- **Desktop ≥1280 px**, **tablet 768–1024 px**, **mobile 360–430 px**: no
  horizontal scroll, sticky header behaves, wizard remains usable.
- **Keyboard only**: tab through the header, wizard, FAQ accordion, organizer
  forms. Focus rings are visible on every interactive element.
- **Screen reader**: the wizard uses `fieldset`/`legend` per member, errors use
  `role="alert"`, the progress list marks `aria-current="step"`.
- **Colour contrast**: body text `#CBD5E1` on `#04070B`; primary buttons use
  near-black text on the cyan gradient.
- **Loading / error states**: "Creating secure order…", polling status text,
  inline field errors, toast on failure, a clear message when the gateway is not
  configured.
- **`prefers-reduced-motion`**: animations are disabled globally in `globals.css`.

## 6. Load sanity (500 participants / 250 teams)

```sql
-- 250 synthetic confirmed teams, then check the dashboard stays responsive
insert into zelvation.registrations
  (team_id, team_name, team_size, college, city, state, track, status,
   amount_paise, leader_name, leader_email, leader_phone, confirmed_at)
select 'ZYL' || lpad(g::text,3,'0'), 'Load Team '||g, 2 + (g % 3), 'Load College',
       'Hyderabad', 'Telangana', (array['education','ai','healthcare','business'])[1 + (g % 4)],
       'confirmed', 49900, 'Leader '||g, 'leader'||g||'@example.com',
       '90000000'||lpad(g::text,2,'0'), now()
from generate_series(1,250) g;

-- clean up afterwards
delete from zelvation.registrations where team_name like 'Load Team %';
```

With that data in place: the organizer list should render in well under a second
per page, exports should complete in a couple of seconds, and the landing page
should be unaffected (it reads only the settings row).
