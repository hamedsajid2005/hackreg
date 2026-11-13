# Database

Schema: **`zelvation`** (not `public`). Migrations live in `supabase/migrations/`
and must be applied in filename order.

```
20260101000000_zelvation_01_schema.sql      tables, indexes, triggers
20260101000100_zelvation_02_functions.sql   team_id sequence, confirm_payment, helpers
20260101000200_zelvation_03_rls_storage.sql RLS policies, grants, private bucket
```

## Tables

### `zelvation.event_settings` — one row, `id = 'main'`

| Column | Notes |
| --- | --- |
| `event_name`, `organiser_name`, `tagline` | branding |
| `registrations_open` | master switch |
| `registration_deadline` | auto-closes after this timestamp |
| `event_start`, `event_end`, `venue` | null until confirmed — never invented |
| `contact_email`, `contact_phone`, `contact_address` | published on the site when set |
| `announcement` | banner on the landing page |
| `tax_percent`, `tax_label` | 0 = no tax line shown |
| `currency` | default `INR` |
| `fee_2_members_paise`, `fee_3_members_paise`, `fee_4_members_paise` | 29900 / 49900 / 69900 |
| `payment_provider` | `razorpay` \| `icici` |
| `updated_at`, `updated_by` | audit |

### `zelvation.registrations`

`id uuid` · `team_id text unique` (null until paid) · `team_name` ·
`team_size smallint 2–4` · `college` · `city` · `state` · `track` ·
`status` (`pending_payment`/`confirmed`/`cancelled`) · `access_token uuid unique`
· `amount_paise` · `currency` · `leader_name` · `leader_email` · `leader_phone` ·
`payment_expires_at` · `created_at` · `updated_at` · `confirmed_at`

Constraints: `team_id ~ '^ZYL[0-9]{3,}$'`;
`confirmed_needs_team_id` (`status <> 'confirmed' OR team_id IS NOT NULL`).

Unique indexes (among rows where `status <> 'cancelled'`): `lower(team_name)`,
`lower(leader_email)` — duplicate-registration protection.

### `zelvation.registration_members`

`registration_id` → cascade · `position 1–4` · `full_name` · `email` · `phone`
(`^[6-9][0-9]{9}$`) · `college` · `role` · `is_leader`.
`unique (registration_id, position)` and a partial unique index allowing only one
leader per registration.

### `zelvation.registration_payments`

`registration_id` · `provider` · `provider_order_id` · `provider_payment_id` ·
`amount_paise` · `currency` · `status`
(`pending`/`successful`/`failed`/`cancelled`/`expired`) · `method` ·
`qr_code_id` · `qr_image_url` · `receipt_url` (private storage path) ·
`raw_payload jsonb` · `verified_at` · `expires_at`.

Unique: `(provider, provider_order_id)` and `provider_payment_id` — the database
guarantees one confirmation per gateway order.

### `zelvation.registration_emails`

`registration_id` · `recipient` · `template` · `status`
(`pending`/`sent`/`failed`) · `attempts` · `provider_message_id` · `error` ·
`sent_at`. `unique (registration_id, template)` — repeated webhooks update this
row instead of sending again.

### `zelvation.organizer_users`

`user_id` → `auth.users` · `email` · `full_name` · `role` (`admin`/`viewer`) ·
`is_active`. Rows are inserted manually from the SQL editor; there is no public
signup and no self-promotion policy.

### `zelvation.registration_audit_logs`

`actor_id` · `actor_email` · `action` · `entity` · `entity_id` · `metadata jsonb`
· `ip` · `created_at`. Written for: registration created, payment confirmed,
payment failed/expired, retry order created, settings updated, registration
window opened/closed, email resent, receipt downloaded, export created, and every
webhook received.

## Functions

| Function | Purpose |
| --- | --- |
| `zelvation.next_team_id()` | `'ZYL' || lpad(nextval('zelvation.team_id_seq'), 3, '0')` — atomic, gap-tolerant, no duplicates under concurrency |
| `zelvation.confirm_payment(order, payment, amount, currency, method, raw)` | Locks the payment row, verifies amount/currency, idempotent replay returns the same team ID, assigns the ID once, writes an audit row |
| `zelvation.mark_payment_status(order, status, reason, raw)` | failed / cancelled / expired; refuses to downgrade a successful payment |
| `zelvation.attach_receipt(order, path)` | stores the private storage path |
| `zelvation.is_organizer()` | `EXISTS (… organizer_users WHERE user_id = auth.uid() AND is_active)` |

All are `SECURITY DEFINER` with a pinned `search_path`; `EXECUTE` is revoked from
`PUBLIC` and granted to `service_role` (except `is_organizer`, which
`authenticated` needs for RLS).

## RLS summary

| Table | anon | authenticated | service_role |
| --- | --- | --- | --- |
| `event_settings` | SELECT | SELECT + UPDATE (organizers) | all |
| `registrations` | — | SELECT (organizers) | all |
| `registration_members` | — | SELECT (organizers) | all |
| `registration_payments` | — | SELECT (organizers) | all |
| `registration_emails` | — | SELECT (organizers) | all |
| `organizer_users` | — | SELECT own row only | all |
| `registration_audit_logs` | — | SELECT (organizers) | all |

There is deliberately **no** insert/update/delete policy for participants on any
registration table: the only write path is the service role inside an Edge
Function.

## Storage

Bucket `zelvation-receipts` — **private**, 5 MB limit, `application/pdf` only.
Participants reach a receipt through a 120-second signed URL minted server-side
(`/api/receipt/[token]`); organizers can read the bucket directly through the
`receipts_organizer_read` policy.

## Rolling back

The migrations only create objects inside `zelvation` plus one storage bucket:

```sql
drop schema zelvation cascade;
delete from storage.objects where bucket_id = 'zelvation-receipts';
delete from storage.buckets where id = 'zelvation-receipts';
```
