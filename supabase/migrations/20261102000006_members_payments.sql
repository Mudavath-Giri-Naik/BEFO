-- BEFO · 0006 joining, members, claims ("I paid"), payments, member_overview.

-- ───────────────────────── member_overview ─────────────────────────
-- security_invoker: callers only see rows their RLS allows.
create view public.member_overview with (security_invoker = true) as
select
  m.id as member_id, m.tenant_id, m.name, m.phone, m.code, m.user_id, m.plan_id, m.approval_state, m.created_via,
  m.joined_on, m.billing_start, m.left_on, m.paused_at, m.removed_at, m.photo_path, m.photo_locked, m.custom,
  p.last_paid_on,
  coalesce(p.due, m.billing_start) as due_on,
  coalesce(p.due, m.billing_start) - public.tenant_today(t.timezone) as days_left,
  case
    when m.removed_at is not null then 'removed'
    when m.left_on is not null and m.left_on <= public.tenant_today(t.timezone) then 'former'
    when m.paused_at is not null then 'paused'
    when coalesce(p.n, 0) = 0 or coalesce(p.due, m.billing_start) is null then 'no_payment'
    when public.tenant_today(t.timezone) > coalesce(p.due, m.billing_start) + s.grace_days then 'expired'
    when coalesce(p.due, m.billing_start) - public.tenant_today(t.timezone) <= s.expiring_soon_days then 'expiring_soon'
    else 'active'
  end as sub_status,
  coalesce((select sum(c.amount_paise) from public.charges c where c.member_id = m.id and c.status = 'open'), 0)::bigint as open_charges_paise,
  coalesce((select sum(case when y.kind = 'deposit' then y.amount_paise else -y.amount_paise end) from public.payments y
             where y.member_id = m.id and y.voided_at is null and y.kind in ('deposit', 'deposit_refund')), 0)::bigint as deposit_held_paise,
  (select r.label from public.bed_assignments b join public.rooms r on r.id = b.room_id where b.member_id = m.id and b.to_date is null limit 1) as room_label,
  exists (select 1 from public.payment_claims pc where pc.member_id = m.id and pc.status in ('submitted', 'needs_info')) as open_claim
from public.members m
join public.tenants t on t.id = m.tenant_id
join public.tenant_settings s on s.tenant_id = m.tenant_id
left join lateral (
  select max(y.period_end) as due, max(y.paid_on) as last_paid_on, count(*) as n
    from public.payments y
   where y.member_id = m.id and y.voided_at is null and y.kind in ('subscription', 'extension')
) p on true;

-- ───────────────────────── joining ─────────────────────────

create or replace function public.request_to_join(
  p_slug text, p_name text, p_adult boolean, p_consent boolean,
  p_message text default null, p_room_type_id uuid default null, p_plan_id uuid default null,
  p_move_in date default null, p_visit_on date default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me text := public.verified_phone();
declare t public.tenants; st public.tenant_settings; m public.members; rid uuid;
begin
  if not coalesce(p_adult, false) then raise exception 'adult_required' using errcode = 'P0001', hint = 'You must be 18 or older.'; end if;
  if not coalesce(p_consent, false) then raise exception 'consent_required' using errcode = 'P0001'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'name_required' using errcode = 'P0001'; end if;
  select * into t from public.tenants where slug = p_slug;
  if t.id is null or t.status not in ('trial', 'active') then raise exception 'place_unavailable' using errcode = 'P0001'; end if;
  select * into st from public.tenant_settings where tenant_id = t.id;

  select * into m from public.members where tenant_id = t.id and (phone = me or user_id = auth.uid()) and removed_at is null limit 1;
  if m.id is not null and m.approval_state = 'approved' then
    if m.user_id is null then
      update public.members set user_id = auth.uid() where id = m.id;
      perform public.write_audit(t.id, 'auto_approve', 'member', m.id::text, '{"via":"listed_phone"}');
      return jsonb_build_object('status', 'auto_approved', 'member_id', m.id);
    end if;
    return jsonb_build_object('status', 'already_member', 'member_id', m.id);
  end if;

  if st.join_policy = 'listed_only' then
    raise exception 'not_on_list' using errcode = 'P0001', hint = 'This place only accepts people already on its list. Contact the owner.';
  end if;
  perform public.rate_limit('join:' || auth.uid(), 5, interval '1 day');
  if p_room_type_id is not null and not exists (select 1 from public.room_types where id = p_room_type_id and tenant_id = t.id) then
    raise exception 'cross_tenant_reference' using errcode = 'P0001';
  end if;
  if p_plan_id is not null and not exists (select 1 from public.plans where id = p_plan_id and tenant_id = t.id) then
    raise exception 'cross_tenant_reference' using errcode = 'P0001';
  end if;
  begin
    insert into public.join_requests (tenant_id, user_id, name, phone, message, preferred_room_type_id, preferred_plan_id,
                                      move_in_date, visit_on, adult_confirmed, consent_at)
    values (t.id, auth.uid(), btrim(p_name), me, left(p_message, 500), p_room_type_id, p_plan_id, p_move_in, p_visit_on, true, now())
    returning id into rid;
  exception when unique_violation then
    raise exception 'request_open' using errcode = 'P0001', hint = 'You already have a request open for this place.';
  end;
  perform public.notify_staff(t.id, 'join_request_new', 'New join request', btrim(p_name), '/app/' || t.slug || '/inbox', jsonb_build_object('request_id', rid));
  return jsonb_build_object('status', 'pending', 'request_id', rid);
end $$;

create or replace function public.withdraw_request(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.join_requests set status = 'withdrawn'
   where id = p_request and user_id = auth.uid() and status in ('pending', 'waitlisted');
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
end $$;

create or replace function public.decide_join_request(
  p_request uuid, p_decision text, p_note text default null, p_plan_id uuid default null,
  p_room_id uuid default null, p_bed_label text default null, p_billing_start date default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.join_requests; t public.tenants; mid uuid; plan uuid;
begin
  select * into r from public.join_requests where id = p_request for update;
  if r.id is null or not public.is_staff(r.tenant_id, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if not public.tenant_is_open(r.tenant_id) then raise exception 'place_unavailable' using errcode = 'P0001'; end if;
  if r.status not in ('pending', 'waitlisted') then raise exception 'already_decided' using errcode = 'P0001'; end if;
  select * into t from public.tenants where id = r.tenant_id;

  if p_decision = 'approve' then
    plan := coalesce(p_plan_id, r.preferred_plan_id, (select id from public.plans where tenant_id = r.tenant_id and is_default and archived_at is null));
    if plan is not null and not exists (select 1 from public.plans where id = plan and tenant_id = r.tenant_id) then
      raise exception 'cross_tenant_reference' using errcode = 'P0001';
    end if;
    select id into mid from public.members where tenant_id = r.tenant_id and phone = r.phone;
    if mid is null then
      insert into public.members (tenant_id, phone, name, user_id, plan_id, created_via, approval_state, billing_start, joined_on)
      values (r.tenant_id, r.phone, r.name, r.user_id, plan, 'request', 'approved',
              coalesce(p_billing_start, r.move_in_date), coalesce(r.move_in_date, public.tenant_today()))
      returning id into mid;
    else
      update public.members set user_id = r.user_id, removed_at = null, left_on = null, approval_state = 'approved',
             plan_id = coalesce(plan, plan_id), billing_start = coalesce(p_billing_start, billing_start)
       where id = mid;
    end if;
    if p_room_id is not null then perform public.assign_bed(mid, p_room_id, p_bed_label, coalesce(r.move_in_date, public.tenant_today())); end if;
    update public.join_requests set status = 'approved', member_id = mid, decision_by = auth.uid(), decision_at = now(), decision_note = p_note where id = r.id;
    perform public.notify_user(r.user_id, r.tenant_id, 'join_request_decided', 'You are in: ' || t.name,
      'Finish your profile to get your ID card.', '/me', jsonb_build_object('decision', 'approve', 'tenant', t.slug));
  elsif p_decision in ('reject', 'waitlist') then
    if p_decision = 'reject' and coalesce(btrim(p_note), '') = '' then raise exception 'reason_required' using errcode = 'P0001'; end if;
    update public.join_requests set status = case p_decision when 'reject' then 'rejected' else 'waitlisted' end,
           decision_by = auth.uid(), decision_at = now(), decision_note = p_note where id = r.id;
    perform public.notify_user(r.user_id, r.tenant_id, 'join_request_decided',
      case p_decision when 'reject' then 'Request not accepted: ' else 'You are on the waitlist: ' end || t.name,
      p_note, '/me/requests', jsonb_build_object('decision', p_decision, 'tenant', t.slug));
  else
    raise exception 'invalid_decision' using errcode = 'P0001';
  end if;
  perform public.write_audit(r.tenant_id, p_decision, 'join_request', r.id::text, jsonb_build_object('note', p_note));
  return jsonb_build_object('status', p_decision, 'member_id', mid);
end $$;

-- Exact address, pin and phone: only for members of the place or people whose request was approved (§12.5).
create or replace function public.my_place_private_details(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('address_full', p.address_full, 'lat', p.lat, 'lng', p.lng,
                            'phone', coalesce(p.public_phone, t.contact_phone))
    from public.tenants t join public.place_profiles p on p.tenant_id = t.id
   where t.slug = p_slug and auth.uid() is not null
     and (exists (select 1 from public.members m where m.tenant_id = t.id and m.user_id = auth.uid() and m.removed_at is null and m.approval_state = 'approved')
       or exists (select 1 from public.join_requests j where j.tenant_id = t.id and j.user_id = auth.uid() and (j.status = 'approved' or j.visit_on is not null and j.decision_at is not null and j.status <> 'rejected'))
       or public.is_staff(t.id))
$$;

-- ───────────────────────── members ─────────────────────────

create or replace function public.validate_custom_sql(t uuid, p_custom jsonb, p_member uuid, p_from text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare f record; v jsonb; out jsonb := '{}';
begin
  for f in select * from public.field_definitions where tenant_id = t and archived_at is null and (p_from = 'owner' or collect_from = 'member') loop
    v := p_custom -> f.key;
    if v is null or v = 'null'::jsonb or (jsonb_typeof(v) = 'string' and btrim(v #>> '{}') = '') then
      if f.required then raise exception 'field_required:%', f.key using errcode = 'P0001', hint = f.label || ' is required.'; end if;
      continue;
    end if;
    if f.type = 'select' and not ((v #>> '{}') = any (f.options)) then
      raise exception 'field_invalid:%', f.key using errcode = 'P0001', hint = 'Pick one of the options for ' || f.label || '.';
    end if;
    if f.type = 'number' and jsonb_typeof(v) <> 'number' then
      raise exception 'field_invalid:%', f.key using errcode = 'P0001', hint = f.label || ' must be a number.';
    end if;
    if f.type = 'phone' and public.normalize_phone(v #>> '{}') is null then
      raise exception 'field_invalid:%', f.key using errcode = 'P0001', hint = f.label || ': enter a 10-digit mobile number.';
    end if;
    if f.type = 'yesno' and jsonb_typeof(v) <> 'boolean' then
      raise exception 'field_invalid:%', f.key using errcode = 'P0001';
    end if;
    if f.type in ('text', 'textarea', 'date') and jsonb_typeof(v) <> 'string' then
      raise exception 'field_invalid:%', f.key using errcode = 'P0001';
    end if;
    if f.unique_in_tenant then
      if exists (select 1 from public.member_unique_values u where u.tenant_id = t and u.field_key = f.key
                   and u.value_norm = lower(btrim(v #>> '{}')) and u.member_id <> p_member) then
        raise exception 'field_not_unique:%', f.key using errcode = 'P0001', hint = f.label || ' is already used by someone else.';
      end if;
    end if;
    out := out || jsonb_build_object(f.key, v);
  end loop;
  return out;
end $$;

-- Member onboarding: custom fields + selfie path + consent. Photo locks after the owner approves it.
create or replace function public.complete_profile(p_member uuid, p_custom jsonb, p_photo_path text, p_consent boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.members; clean jsonb; f record;
begin
  select * into m from public.members where id = p_member and user_id = auth.uid() and removed_at is null;
  if m.id is null then raise exception 'forbidden' using errcode = '42501'; end if;
  perform public.verified_phone();
  if not coalesce(p_consent, false) then raise exception 'consent_required' using errcode = 'P0001'; end if;
  if m.profile_completed_at is not null then
    -- after completion only member_can_edit fields may change
    select coalesce(jsonb_object_agg(key, value), '{}') into p_custom from jsonb_each(coalesce(p_custom, '{}'))
     where key in (select fd.key from public.field_definitions fd where fd.tenant_id = m.tenant_id and fd.member_can_edit and fd.archived_at is null);
    p_custom := m.custom || p_custom;
  end if;
  clean := public.validate_custom_sql(m.tenant_id, coalesce(p_custom, '{}'), m.id, 'member');
  update public.members set custom = m.custom || clean,
    photo_path = case when m.photo_locked then m.photo_path else coalesce(p_photo_path, m.photo_path) end,
    consented_at = coalesce(m.consented_at, now()), profile_completed_at = coalesce(m.profile_completed_at, now())
  where id = m.id;
  delete from public.member_unique_values where member_id = m.id;
  for f in select key from public.field_definitions where tenant_id = m.tenant_id and unique_in_tenant and archived_at is null loop
    if (m.custom || clean) ? f.key then
      insert into public.member_unique_values (tenant_id, field_key, value_norm, member_id)
      values (m.tenant_id, f.key, lower(btrim((m.custom || clean) ->> f.key)), m.id);
    end if;
  end loop;
end $$;

create or replace function public.add_member(p_tenant uuid, p_name text, p_phone text, p_plan_id uuid default null,
  p_billing_start date default null, p_custom jsonb default '{}') returns uuid
language plpgsql security definer set search_path = '' as $$
declare ph text := public.normalize_phone(p_phone); mid uuid; clean jsonb;
begin
  if not public.is_staff(p_tenant, array['owner', 'manager']) or not public.tenant_is_open(p_tenant) then raise exception 'forbidden' using errcode = '42501'; end if;
  if ph is null then raise exception 'invalid_phone' using errcode = 'P0001', hint = 'Enter a 10-digit mobile number.'; end if;
  insert into public.members (tenant_id, phone, name, plan_id, billing_start, created_via, approval_state)
  values (p_tenant, ph, btrim(p_name), coalesce(p_plan_id, (select id from public.plans where tenant_id = p_tenant and is_default and archived_at is null)),
          p_billing_start, 'manual', 'approved')
  returning id into mid;
  clean := public.validate_custom_sql(p_tenant, coalesce(p_custom, '{}'), mid, 'owner');
  update public.members set custom = clean where id = mid;
  -- link straight away if that person already has a verified account
  update public.members set user_id = u.id from auth.users u
   where public.members.id = mid and public.normalize_phone(u.phone) = ph and u.phone_confirmed_at is not null;
  perform public.write_audit(p_tenant, 'create', 'member', mid::text);
  return mid;
exception when unique_violation then
  raise exception 'phone_exists' using errcode = 'P0001', hint = 'Someone with this number is already on the list.';
end $$;

create or replace function public.set_paused(p_member uuid, p_paused boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.members;
begin
  select * into m from public.members where id = p_member;
  if m.id is null or not public.is_staff(m.tenant_id, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.members set paused_at = case when p_paused then now() end where id = p_member;
  perform public.write_audit(m.tenant_id, case when p_paused then 'pause' else 'resume' end, 'member', p_member::text);
end $$;

create or replace function public.remove_member(p_member uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.members;
begin
  select * into m from public.members where id = p_member;
  if m.id is null or not public.is_owner(m.tenant_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.bed_assignments set to_date = greatest(from_date, public.tenant_today()) where member_id = p_member and to_date is null;
  update public.members set removed_at = now() where id = p_member;
  perform public.write_audit(m.tenant_id, 'remove', 'member', p_member::text);
end $$;

create or replace function public.set_photo_lock(p_member uuid, p_locked boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.members;
begin
  select * into m from public.members where id = p_member;
  if m.id is null or not public.is_staff(m.tenant_id, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.members set photo_locked = p_locked where id = p_member;
  perform public.write_audit(m.tenant_id, case when p_locked then 'lock_photo' else 'unlock_photo' end, 'member', p_member::text);
end $$;

-- ───────────────────────── payments ─────────────────────────

-- Internal. Creates the ledger transaction and the payment together (one SQL function, one transaction).
create or replace function public._record_member_payment(
  p_member uuid, p_amount bigint, p_paid_on date, p_method text, p_kind text,
  p_periods int, p_source text, p_claim uuid, p_note text, p_utr text default null, p_charge uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare m public.members; pl public.plans; prev date; ps date; pe date; acct uuid; cat uuid; txid uuid; pid uuid; txkind text; dir text;
begin
  select * into m from public.members where id = p_member;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid_amount' using errcode = 'P0001'; end if;
  if p_paid_on > public.tenant_today() then raise exception 'future_date' using errcode = 'P0001', hint = 'The payment date cannot be in the future.'; end if;
  if p_kind in ('subscription', 'extension') then
    select * into pl from public.plans where id = m.plan_id;
    if pl.id is null then raise exception 'no_plan' using errcode = 'P0001', hint = 'Choose a plan for this person first.'; end if;
    select max(period_end) into prev from public.payments
     where member_id = m.id and voided_at is null and kind in ('subscription', 'extension');
    ps := case when pl.due_rule = 'from_payment_date' then p_paid_on else coalesce(prev, m.billing_start, p_paid_on) end;
    pe := (ps + make_interval(
            days => case pl.period_unit when 'day' then pl.period_count * greatest(p_periods, 1) when 'week' then 7 * pl.period_count * greatest(p_periods, 1) else 0 end,
            months => case when pl.period_unit = 'month' then pl.period_count * greatest(p_periods, 1) else 0 end))::date;
  end if;
  select id into acct from public.accounts where tenant_id = m.tenant_id and archived_at is null
     and kind = case when p_method = 'cash' then 'cash' else 'upi_bank' end order by is_default desc limit 1;
  select id into cat from public.categories where tenant_id = m.tenant_id
     and key = case when p_kind in ('deposit', 'deposit_refund') then 'deposits' else 'fees' end;
  txkind := case p_kind when 'deposit' then 'deposit_in' when 'deposit_refund' then 'deposit_out' else 'member_payment' end;
  dir := case when p_kind = 'deposit_refund' then 'out' else 'in' end;
  insert into public.transactions (tenant_id, direction, kind, account_id, category_id, member_id, amount_paise, occurred_on,
                                   description, status, source, claim_id, utr, created_by)
  values (m.tenant_id, dir, txkind, acct, cat, m.id, p_amount, p_paid_on, coalesce(p_note, m.name),
          'confirmed', case p_source when 'claim' then 'claim' when 'import' then 'import' else 'manual' end, p_claim, nullif(btrim(p_utr), ''), auth.uid())
  returning id into txid;
  insert into public.payments (tenant_id, member_id, kind, amount_paise, paid_on, method, period_start, period_end,
                               charge_id, transaction_id, source, claim_id, note, created_by)
  values (m.tenant_id, m.id, p_kind, p_amount, p_paid_on, p_method, ps, pe, p_charge, txid, p_source, p_claim, p_note, auth.uid())
  returning id into pid;
  if p_charge is not null then
    update public.charges set status = 'paid', paid_payment_id = pid where id = p_charge and member_id = m.id;
  end if;
  return pid;
end $$;

-- Owner/manager records money received directly (e.g. cash).
create or replace function public.mark_paid(p_member uuid, p_amount_paise bigint, p_paid_on date default null,
  p_method text default 'cash', p_periods int default 1, p_note text default null, p_kind text default 'subscription')
returns uuid language plpgsql security definer set search_path = '' as $$
declare m public.members; pid uuid;
begin
  select * into m from public.members where id = p_member;
  if m.id is null or not public.is_staff(m.tenant_id, array['owner', 'manager']) or not public.tenant_is_open(m.tenant_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if m.removed_at is not null then raise exception 'member_removed' using errcode = 'P0001'; end if;
  if p_kind not in ('subscription', 'extension', 'deposit') then raise exception 'invalid_kind' using errcode = 'P0001'; end if;
  pid := public._record_member_payment(p_member, p_amount_paise, coalesce(p_paid_on, public.tenant_today()), p_method, p_kind,
                                       p_periods, 'manual', null, p_note);
  perform public.write_audit(m.tenant_id, 'mark_paid', 'payment', pid::text, jsonb_build_object('amount_paise', p_amount_paise, 'method', p_method));
  perform public.notify_user(m.user_id, m.tenant_id, 'payment_claim_decided', 'Payment recorded', null, '/me/payments', jsonb_build_object('payment_id', pid));
  return pid;
end $$;

create or replace function public.void_payment(p_payment uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare y public.payments;
begin
  select * into y from public.payments where id = p_payment for update;
  if y.id is null or not public.is_owner(y.tenant_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if y.voided_at is not null then raise exception 'already_void' using errcode = 'P0001'; end if;
  if coalesce(btrim(p_reason), '') = '' then raise exception 'reason_required' using errcode = 'P0001'; end if;
  update public.payments set voided_at = now(), voided_by = auth.uid(), void_reason = p_reason where id = y.id;
  update public.transactions set status = 'void', voided_at = now(), void_reason = p_reason where id = y.transaction_id;
  if y.charge_id is not null then update public.charges set status = 'open', paid_payment_id = null where id = y.charge_id; end if;
  if y.claim_id is not null then update public.payment_claims set status = 'rejected', decision_note = 'Voided: ' || p_reason where id = y.claim_id; end if;
  perform public.write_audit(y.tenant_id, 'void', 'payment', y.id::text, jsonb_build_object('reason', p_reason, 'amount_paise', y.amount_paise));
end $$;

-- Customer taps "I paid".
create or replace function public.submit_payment_claim(p_member uuid, p_amount_paise bigint, p_method text,
  p_reference text default null, p_paid_at timestamptz default null, p_screenshot_path text default null, p_screenshot_sha256 text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare m public.members; pl public.plans; cid uuid; ref text := nullif(upper(btrim(p_reference)), ''); checks jsonb; t public.tenants;
begin
  perform public.verified_phone();
  select * into m from public.members where id = p_member and user_id = auth.uid() and removed_at is null and approval_state = 'approved';
  if m.id is null then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into t from public.tenants where id = m.tenant_id;
  if t.status not in ('trial', 'active') then raise exception 'place_unavailable' using errcode = 'P0001'; end if;
  perform public.rate_limit('claim:' || auth.uid(), 10, interval '1 day');
  if (select count(*) from public.payment_claims where member_id = m.id and status in ('submitted', 'needs_info')) >= 3 then
    raise exception 'too_many_open_claims' using errcode = 'P0001', hint = 'Wait for the owner to check your earlier payments.';
  end if;
  if p_method not in ('upi', 'cash', 'bank', 'other') then raise exception 'invalid_method' using errcode = 'P0001'; end if;
  if p_screenshot_path is not null and p_screenshot_path not like m.tenant_id::text || '/' || m.id::text || '/%' then
    raise exception 'invalid_path' using errcode = 'P0001';
  end if;
  select * into pl from public.plans where id = m.plan_id;
  checks := jsonb_build_object(
    'amount_match', pl.id is not null and p_amount_paise % nullif(pl.price_paise, 0) = 0,
    'date_ok', coalesce(p_paid_at, now()) between now() - interval '14 days' and now() + interval '10 minutes',
    'duplicate_utr', ref is not null and (
        exists (select 1 from public.transactions x where x.tenant_id = m.tenant_id and upper(x.utr) = ref and x.status <> 'void')
     or exists (select 1 from public.payment_claims c where c.tenant_id = m.tenant_id and upper(c.reference) = ref and c.status in ('submitted', 'needs_info', 'confirmed'))),
    'duplicate_image', p_screenshot_sha256 is not null and exists (
        select 1 from public.payment_claims c where c.tenant_id = m.tenant_id and c.screenshot_sha256 = p_screenshot_sha256),
    'payee_match', null);
  insert into public.payment_claims (tenant_id, member_id, amount_paise, method, reference, paid_at_claimed, screenshot_path, screenshot_sha256, checks)
  values (m.tenant_id, m.id, p_amount_paise, p_method, ref, coalesce(p_paid_at, now()), p_screenshot_path, p_screenshot_sha256, checks)
  returning id into cid;
  if p_screenshot_path is not null then
    insert into public.jobs (tenant_id, type, payload) values (m.tenant_id, 'claim_extract', jsonb_build_object('claim_id', cid));
  end if;
  perform public.notify_staff(m.tenant_id, 'payment_claim_new', m.name || ' says they paid', null,
                              '/app/' || t.slug || '/inbox', jsonb_build_object('claim_id', cid));
  return cid;
end $$;

-- Owner/manager confirms, rejects or asks for info. Confirm creates payment + transaction atomically.
create or replace function public.decide_payment_claim(p_claim uuid, p_decision text, p_note text default null,
  p_amount_paise bigint default null, p_periods int default 1) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.payment_claims; m public.members; pid uuid; txid uuid;
begin
  select * into c from public.payment_claims where id = p_claim for update;
  if c.id is null or not public.is_staff(c.tenant_id, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if c.status not in ('submitted', 'needs_info', 'stale') then raise exception 'already_decided' using errcode = 'P0001'; end if;
  select * into m from public.members where id = c.member_id;
  if p_decision = 'confirm' then
    pid := public._record_member_payment(m.id, coalesce(p_amount_paise, c.amount_paise),
             least((c.paid_at_claimed at time zone 'Asia/Kolkata')::date, public.tenant_today()),
             c.method, 'subscription', p_periods, 'claim', c.id, p_note, c.reference);
    select transaction_id into txid from public.payments where id = pid;
    update public.payment_claims set status = 'confirmed', decided_by = auth.uid(), decided_at = now(), decision_note = p_note, transaction_id = txid where id = c.id;
  elsif p_decision in ('reject', 'needs_info') then
    if coalesce(btrim(p_note), '') = '' then raise exception 'reason_required' using errcode = 'P0001', hint = 'Tell the person why.'; end if;
    update public.payment_claims set status = case p_decision when 'reject' then 'rejected' else 'needs_info' end,
           decided_by = auth.uid(), decided_at = now(), decision_note = p_note where id = c.id;
  else
    raise exception 'invalid_decision' using errcode = 'P0001';
  end if;
  perform public.write_audit(c.tenant_id, p_decision, 'payment_claim', c.id::text, jsonb_build_object('note', p_note, 'amount_paise', coalesce(p_amount_paise, c.amount_paise)));
  perform public.notify_user(m.user_id, c.tenant_id, 'payment_claim_decided',
    case p_decision when 'confirm' then 'Payment confirmed' when 'reject' then 'Payment not confirmed' else 'Owner needs more info' end,
    p_note, '/me/payments', jsonb_build_object('claim_id', c.id, 'decision', p_decision));
  return jsonb_build_object('status', p_decision, 'payment_id', pid);
end $$;

create or replace function public.expire_stale_claims() returns int
language sql security definer set search_path = '' as $$
  with u as (update public.payment_claims set status = 'stale'
              where status in ('submitted', 'needs_info') and created_at < now() - interval '14 days' returning 1)
  select count(*)::int from u
$$;

-- Notifications: mark read (own only).
create or replace function public.mark_notifications_read(p_ids uuid[] default null) returns void
language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now()
   where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids))
$$;
