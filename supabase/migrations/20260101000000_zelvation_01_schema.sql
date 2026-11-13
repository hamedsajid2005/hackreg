-- =====================================================================
-- ZELVATION REGISTRATION PORTAL — 01 SCHEMA
-- Organised by Zelvora Technologies Pvt. Ltd.
--
-- IMPORTANT: this project shares a Supabase project with the existing
-- Zelvation submission / AI-evaluation platform. Everything here lives in a
-- dedicated `zelvation` schema so nothing can collide with, or modify, the
-- tables used by that platform. No existing object is touched.
--
-- Run order: 01_schema → 02_functions → 03_rls_storage
-- =====================================================================

create extension if not exists pgcrypto;

create schema if not exists zelvation;

comment on schema zelvation is
  'Zelvation team registration portal. Isolated from the submission/evaluation platform.';

-- ---------------------------------------------------------------------
-- event_settings — single row, organiser-editable configuration
-- No event dates, venue, prizes or contact details are invented; they are
-- null until an authorised organiser publishes them.
-- ---------------------------------------------------------------------
create table if not exists zelvation.event_settings (
  id                      text primary key default 'main' check (id = 'main'),
  event_name              text        not null default 'ZELVATION',
  organiser_name          text        not null default 'ZELVORA TECHNOLOGIES PVT. LTD.',
  tagline                 text        not null default 'Build. Innovate. Transform.',
  registrations_open      boolean     not null default true,
  registration_deadline   timestamptz,
  event_start             timestamptz,
  event_end               timestamptz,
  venue                   text,
  contact_email           text,
  contact_phone           text,
  contact_address         text,
  announcement            text,
  tax_percent             numeric(5,2) not null default 0 check (tax_percent >= 0 and tax_percent <= 100),
  tax_label               text,
  currency                text        not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  fee_2_members_paise     integer     not null default 29900 check (fee_2_members_paise >= 0),
  fee_3_members_paise     integer     not null default 49900 check (fee_3_members_paise >= 0),
  fee_4_members_paise     integer     not null default 69900 check (fee_4_members_paise >= 0),
  payment_provider        text        not null default 'razorpay'
                          check (payment_provider in ('razorpay', 'icici')),
  updated_at              timestamptz not null default now(),
  updated_by              uuid
);

insert into zelvation.event_settings (id) values ('main')
  on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- registrations — one row per team
-- team_id stays NULL until the payment gateway confirms payment.
-- ---------------------------------------------------------------------
create table if not exists zelvation.registrations (
  id                   uuid primary key default gen_random_uuid(),
  team_id              text unique,
  team_name            text        not null check (char_length(team_name) between 3 and 60),
  team_size            smallint    not null check (team_size between 2 and 4),
  college              text        not null check (char_length(college) between 2 and 140),
  city                 text        not null check (char_length(city) between 2 and 80),
  state                text        not null check (char_length(state) between 2 and 80),
  track                text        not null check (track in ('education', 'ai', 'healthcare', 'business')),
  status               text        not null default 'pending_payment'
                       check (status in ('pending_payment', 'confirmed', 'cancelled')),
  -- Private, unguessable key used by the confirmation page. Never the team ID.
  access_token         uuid        not null unique default gen_random_uuid(),
  amount_paise         integer     not null check (amount_paise >= 0),
  currency             text        not null default 'INR',
  leader_name          text        not null,
  leader_email         text        not null,
  leader_phone         text        not null,
  payment_expires_at   timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  confirmed_at         timestamptz,
  constraint team_id_format check (team_id is null or team_id ~ '^ZYL[0-9]{3,}$'),
  constraint confirmed_needs_team_id check (status <> 'confirmed' or team_id is not null)
);

comment on column zelvation.registrations.access_token is
  'Secret bearer key for the participant confirmation page. Not enumerable.';

-- Duplicate-registration protection (a cancelled registration frees the name).
create unique index if not exists registrations_team_name_unique
  on zelvation.registrations (lower(team_name)) where status <> 'cancelled';
create unique index if not exists registrations_leader_email_unique
  on zelvation.registrations (lower(leader_email)) where status <> 'cancelled';

-- Indexed search / filter fields used by the organizer dashboard.
create index if not exists registrations_created_at_idx on zelvation.registrations (created_at desc);
create index if not exists registrations_status_idx     on zelvation.registrations (status);
create index if not exists registrations_track_idx      on zelvation.registrations (track);
create index if not exists registrations_team_size_idx  on zelvation.registrations (team_size);
create index if not exists registrations_team_id_idx    on zelvation.registrations (team_id);
create index if not exists registrations_team_name_trgm_idx
  on zelvation.registrations (lower(team_name) text_pattern_ops);
create index if not exists registrations_leader_email_idx
  on zelvation.registrations (lower(leader_email) text_pattern_ops);

-- ---------------------------------------------------------------------
-- registration_members — exactly team_size rows per registration
-- ---------------------------------------------------------------------
create table if not exists zelvation.registration_members (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references zelvation.registrations (id) on delete cascade,
  position        smallint not null check (position between 1 and 4),
  full_name       text not null check (char_length(full_name) between 3 and 80),
  email           text not null,
  phone           text not null check (phone ~ '^[6-9][0-9]{9}$'),
  college         text not null,
  role            text not null,
  is_leader       boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (registration_id, position)
);

create index if not exists registration_members_registration_idx
  on zelvation.registration_members (registration_id);
create index if not exists registration_members_email_idx
  on zelvation.registration_members (lower(email));
-- Only one leader per registration.
create unique index if not exists registration_members_one_leader
  on zelvation.registration_members (registration_id) where is_leader;

-- ---------------------------------------------------------------------
-- registration_payments — one row per payment attempt / gateway order
-- ---------------------------------------------------------------------
create table if not exists zelvation.registration_payments (
  id                   uuid primary key default gen_random_uuid(),
  registration_id      uuid not null references zelvation.registrations (id) on delete cascade,
  provider             text not null default 'razorpay' check (provider in ('razorpay', 'icici')),
  provider_order_id    text not null,
  provider_payment_id  text,
  amount_paise         integer not null check (amount_paise >= 0),
  currency             text not null default 'INR',
  status               text not null default 'pending'
                       check (status in ('pending', 'successful', 'failed', 'cancelled', 'expired')),
  method               text,
  qr_code_id           text,
  qr_image_url         text,
  receipt_url          text,
  raw_payload          jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  verified_at          timestamptz,
  expires_at           timestamptz
);

-- Gateway identifiers are unique: a repeated webhook can never create a second
-- confirmation or a second team ID.
create unique index if not exists registration_payments_order_unique
  on zelvation.registration_payments (provider, provider_order_id);
create unique index if not exists registration_payments_payment_unique
  on zelvation.registration_payments (provider_payment_id)
  where provider_payment_id is not null;
create index if not exists registration_payments_registration_idx
  on zelvation.registration_payments (registration_id);
create index if not exists registration_payments_status_idx
  on zelvation.registration_payments (status);

-- ---------------------------------------------------------------------
-- registration_emails — delivery state for every transactional email
-- ---------------------------------------------------------------------
create table if not exists zelvation.registration_emails (
  id                  uuid primary key default gen_random_uuid(),
  registration_id     uuid not null references zelvation.registrations (id) on delete cascade,
  recipient           text not null,
  template            text not null default 'registration_confirmed',
  status              text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts            smallint not null default 0,
  provider_message_id text,
  error               text,
  sent_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- One row per registration per template: repeated webhooks update, never insert.
  unique (registration_id, template)
);

create index if not exists registration_emails_registration_idx
  on zelvation.registration_emails (registration_id);

-- ---------------------------------------------------------------------
-- organizer_users — allow-list of organiser accounts (no public signup)
-- ---------------------------------------------------------------------
create table if not exists zelvation.organizer_users (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'admin' check (role in ('admin', 'viewer')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid
);

comment on table zelvation.organizer_users is
  'Organiser allow-list. Rows are created only from the SQL editor / service role.';

-- ---------------------------------------------------------------------
-- registration_audit_logs — who did what, when
-- ---------------------------------------------------------------------
create table if not exists zelvation.registration_audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid,
  actor_email text,
  action      text not null,
  entity      text,
  entity_id   uuid,
  metadata    jsonb not null default '{}'::jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);

create index if not exists registration_audit_logs_created_idx
  on zelvation.registration_audit_logs (created_at desc);
create index if not exists registration_audit_logs_entity_idx
  on zelvation.registration_audit_logs (entity, entity_id);

-- ---------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------
create or replace function zelvation.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists registrations_touch on zelvation.registrations;
create trigger registrations_touch before update on zelvation.registrations
  for each row execute function zelvation.touch_updated_at();

drop trigger if exists registration_payments_touch on zelvation.registration_payments;
create trigger registration_payments_touch before update on zelvation.registration_payments
  for each row execute function zelvation.touch_updated_at();

drop trigger if exists registration_emails_touch on zelvation.registration_emails;
create trigger registration_emails_touch before update on zelvation.registration_emails
  for each row execute function zelvation.touch_updated_at();

drop trigger if exists event_settings_touch on zelvation.event_settings;
create trigger event_settings_touch before update on zelvation.event_settings
  for each row execute function zelvation.touch_updated_at();
