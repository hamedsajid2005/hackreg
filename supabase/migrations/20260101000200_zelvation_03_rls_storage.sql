-- =====================================================================
-- ZELVATION REGISTRATION PORTAL — 03 RLS + STORAGE
--
-- Principles
--   • participants never touch the database directly (all writes go through
--     Edge Functions using the service role)
--   • only allow-listed organizers can read registration data
--   • public read is limited to non-sensitive event settings
--   • receipts live in a private bucket, served via short-lived signed URLs
-- =====================================================================

alter table zelvation.event_settings          enable row level security;
alter table zelvation.registrations           enable row level security;
alter table zelvation.registration_members    enable row level security;
alter table zelvation.registration_payments   enable row level security;
alter table zelvation.registration_emails     enable row level security;
alter table zelvation.organizer_users         enable row level security;
alter table zelvation.registration_audit_logs enable row level security;

-- Force RLS for table owners too, so a stray anon connection cannot bypass.
alter table zelvation.registrations        force row level security;
alter table zelvation.registration_members force row level security;
alter table zelvation.registration_payments force row level security;

-- ---------------------------------------------------------------------
-- event_settings: readable by everyone (the landing page needs fees/contact)
-- ---------------------------------------------------------------------
drop policy if exists event_settings_public_read on zelvation.event_settings;
create policy event_settings_public_read
  on zelvation.event_settings for select
  to anon, authenticated
  using (true);

drop policy if exists event_settings_organizer_write on zelvation.event_settings;
create policy event_settings_organizer_write
  on zelvation.event_settings for update
  to authenticated
  using (zelvation.is_organizer())
  with check (zelvation.is_organizer());

-- ---------------------------------------------------------------------
-- Registration tables: organizer read-only. No insert/update/delete policy is
-- created at all — therefore only the service role (Edge Functions) can write.
-- ---------------------------------------------------------------------
drop policy if exists registrations_organizer_read on zelvation.registrations;
create policy registrations_organizer_read
  on zelvation.registrations for select
  to authenticated
  using (zelvation.is_organizer());

drop policy if exists members_organizer_read on zelvation.registration_members;
create policy members_organizer_read
  on zelvation.registration_members for select
  to authenticated
  using (zelvation.is_organizer());

drop policy if exists payments_organizer_read on zelvation.registration_payments;
create policy payments_organizer_read
  on zelvation.registration_payments for select
  to authenticated
  using (zelvation.is_organizer());

drop policy if exists emails_organizer_read on zelvation.registration_emails;
create policy emails_organizer_read
  on zelvation.registration_emails for select
  to authenticated
  using (zelvation.is_organizer());

drop policy if exists audit_organizer_read on zelvation.registration_audit_logs;
create policy audit_organizer_read
  on zelvation.registration_audit_logs for select
  to authenticated
  using (zelvation.is_organizer());

-- ---------------------------------------------------------------------
-- organizer_users: an authenticated user may read only their own allow-list row
-- (the dashboard needs this to confirm the role). Nobody can self-promote.
-- ---------------------------------------------------------------------
drop policy if exists organizer_users_self_read on zelvation.organizer_users;
create policy organizer_users_self_read
  on zelvation.organizer_users for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Schema privileges
-- ---------------------------------------------------------------------
grant usage on schema zelvation to anon, authenticated, service_role;

grant select on zelvation.event_settings to anon, authenticated;
grant select on zelvation.organizer_users to authenticated;
grant select on zelvation.registrations,
                zelvation.registration_members,
                zelvation.registration_payments,
                zelvation.registration_emails,
                zelvation.registration_audit_logs
  to authenticated;

grant all on all tables    in schema zelvation to service_role;
grant all on all sequences in schema zelvation to service_role;
grant all on all functions in schema zelvation to service_role;

alter default privileges in schema zelvation grant all on tables to service_role;
alter default privileges in schema zelvation grant all on sequences to service_role;

-- ---------------------------------------------------------------------
-- Storage: private bucket for generated receipts
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('zelvation-receipts', 'zelvation-receipts', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['application/pdf'];

-- Organizers may read receipts; participants receive signed URLs from the app.
drop policy if exists receipts_organizer_read on storage.objects;
create policy receipts_organizer_read
  on storage.objects for select
  to authenticated
  using (bucket_id = 'zelvation-receipts' and zelvation.is_organizer());

-- Writes to the bucket happen only with the service role from Edge Functions.
