-- =====================================================================
-- ZELVATION REGISTRATION PORTAL — 02 FUNCTIONS
-- Team ID generation + transaction-safe payment confirmation.
-- All functions are SECURITY DEFINER and executable only by service_role
-- (the Edge Functions), never by the browser.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Sequential team IDs: ZYL001, ZYL002, ZYL003 …
-- A Postgres sequence is atomic and gap-tolerant, so two concurrent payments
-- can never receive the same ID. The unique constraint on
-- registrations.team_id is the second line of defence.
-- ---------------------------------------------------------------------
create sequence if not exists zelvation.team_id_seq as bigint start with 1 increment by 1 no maxvalue;

create or replace function zelvation.next_team_id()
returns text
language sql
security definer
set search_path = zelvation, public
as $$
  select 'ZYL' || lpad(nextval('zelvation.team_id_seq')::text, 3, '0');
$$;

revoke all on function zelvation.next_team_id() from public;
grant execute on function zelvation.next_team_id() to service_role;

-- ---------------------------------------------------------------------
-- confirm_payment
--   • locks the payment row (FOR UPDATE) so concurrent webhooks serialise
--   • rejects an amount / currency mismatch instead of trusting the gateway
--   • is idempotent: a repeated webhook returns the SAME team ID
--   • issues a team ID only once, only for a verified payment
-- ---------------------------------------------------------------------
create or replace function zelvation.confirm_payment(
  p_order_id      text,
  p_payment_id    text,
  p_amount_paise  integer,
  p_currency      text,
  p_method        text default null,
  p_raw           jsonb default null
)
returns table (
  registration_id uuid,
  team_id         text,
  already_confirmed boolean,
  amount_paise    integer,
  currency        text,
  team_name       text,
  leader_name     text,
  leader_email    text,
  confirmed_at    timestamptz
)
language plpgsql
security definer
set search_path = zelvation, public
as $$
declare
  v_payment zelvation.registration_payments%rowtype;
  v_reg     zelvation.registrations%rowtype;
  v_team_id text;
  v_already boolean := false;
begin
  select * into v_payment
    from zelvation.registration_payments
   where provider_order_id = p_order_id
   for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- The gateway-reported amount must match what we stored when creating the order.
  if v_payment.amount_paise <> p_amount_paise or v_payment.currency <> p_currency then
    update zelvation.registration_payments
       set status = 'failed',
           raw_payload = coalesce(p_raw, '{}'::jsonb),
           updated_at = now()
     where id = v_payment.id;
    raise exception 'AMOUNT_MISMATCH: expected % % but gateway reported % %',
      v_payment.amount_paise, v_payment.currency, p_amount_paise, p_currency
      using errcode = 'P0003';
  end if;

  select * into v_reg
    from zelvation.registrations
   where id = v_payment.registration_id
   for update;

  if not found then
    raise exception 'REGISTRATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Idempotent replay: nothing changes, same team ID comes back.
  if v_payment.status = 'successful' and v_reg.status = 'confirmed' and v_reg.team_id is not null then
    return query
      select v_reg.id, v_reg.team_id, true, v_reg.amount_paise, v_reg.currency,
             v_reg.team_name, v_reg.leader_name, v_reg.leader_email, v_reg.confirmed_at;
    return;
  end if;

  if v_reg.status = 'cancelled' then
    raise exception 'REGISTRATION_CANCELLED' using errcode = 'P0004';
  end if;

  update zelvation.registration_payments
     set status = 'successful',
         provider_payment_id = coalesce(p_payment_id, provider_payment_id),
         method = coalesce(p_method, method),
         raw_payload = coalesce(p_raw, '{}'::jsonb),
         verified_at = coalesce(verified_at, now()),
         updated_at = now()
   where id = v_payment.id;

  if v_reg.team_id is null then
    v_team_id := zelvation.next_team_id();
  else
    v_team_id := v_reg.team_id;
    v_already := true;
  end if;

  update zelvation.registrations
     set team_id = v_team_id,
         status = 'confirmed',
         confirmed_at = coalesce(confirmed_at, now()),
         updated_at = now()
   where id = v_reg.id;

  insert into zelvation.registration_audit_logs (action, entity, entity_id, metadata)
  values (
    'payment.confirmed', 'registration', v_reg.id,
    jsonb_build_object(
      'order_id', p_order_id,
      'payment_id', p_payment_id,
      'team_id', v_team_id,
      'amount_paise', p_amount_paise,
      'currency', p_currency,
      'replayed', v_already
    )
  );

  return query
    select v_reg.id, v_team_id, v_already, v_payment.amount_paise, v_payment.currency,
           v_reg.team_name, v_reg.leader_name, v_reg.leader_email, now();
end;
$$;

revoke all on function zelvation.confirm_payment(text, text, integer, text, text, jsonb) from public;
grant execute on function zelvation.confirm_payment(text, text, integer, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------
-- mark_payment_status — failed / cancelled / expired transitions
-- Never downgrades a successful payment.
-- ---------------------------------------------------------------------
create or replace function zelvation.mark_payment_status(
  p_order_id text,
  p_status   text,
  p_reason   text default null,
  p_raw      jsonb default null
)
returns void
language plpgsql
security definer
set search_path = zelvation, public
as $$
declare
  v_payment zelvation.registration_payments%rowtype;
begin
  if p_status not in ('pending', 'failed', 'cancelled', 'expired') then
    raise exception 'INVALID_STATUS' using errcode = 'P0005';
  end if;

  select * into v_payment
    from zelvation.registration_payments
   where provider_order_id = p_order_id
   for update;

  if not found then
    return; -- unknown order: nothing to do, webhook stays harmless
  end if;

  if v_payment.status = 'successful' then
    return; -- never downgrade a verified payment
  end if;

  update zelvation.registration_payments
     set status = p_status,
         raw_payload = coalesce(p_raw, raw_payload),
         updated_at = now()
   where id = v_payment.id;

  insert into zelvation.registration_audit_logs (action, entity, entity_id, metadata)
  values (
    'payment.' || p_status, 'registration', v_payment.registration_id,
    jsonb_build_object('order_id', p_order_id, 'reason', p_reason)
  );
end;
$$;

revoke all on function zelvation.mark_payment_status(text, text, text, jsonb) from public;
grant execute on function zelvation.mark_payment_status(text, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------
-- attach_receipt — records the private storage path of the generated PDF
-- ---------------------------------------------------------------------
create or replace function zelvation.attach_receipt(p_order_id text, p_path text)
returns void
language sql
security definer
set search_path = zelvation, public
as $$
  update zelvation.registration_payments
     set receipt_url = p_path, updated_at = now()
   where provider_order_id = p_order_id;
$$;

revoke all on function zelvation.attach_receipt(text, text) from public;
grant execute on function zelvation.attach_receipt(text, text) to service_role;

-- ---------------------------------------------------------------------
-- is_organizer — used by every RLS policy on the organizer tables
-- ---------------------------------------------------------------------
create or replace function zelvation.is_organizer()
returns boolean
language sql
stable
security definer
set search_path = zelvation, public
as $$
  select exists (
    select 1 from zelvation.organizer_users
     where user_id = auth.uid() and is_active
  );
$$;

grant execute on function zelvation.is_organizer() to authenticated, anon;
