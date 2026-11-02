-- BEFO · 0005 tenant lifecycle, presets, staff, availability, listing moderation.

create or replace function public._untrust() returns void
language sql volatile set search_path = '' as $$
  select set_config('befo.trusted', '', true)
$$;

-- ───────────────────────── presets ─────────────────────────
-- SQL is the source of truth for DB defaults (categories, modules, labels, accounts).
-- src/presets/*.ts mirrors the UI-side defaults (amenities, fields, menu template).

create or replace function public.apply_preset(t uuid, p_type text) returns void
language plpgsql security definer set search_path = '' as $$
declare cats jsonb;
begin
  update public.tenant_settings set
    modules = case p_type
      when 'mess' then array['menu', 'notices', 'money', 'team', 'charges']
      when 'hostel' then array['rooms', 'charges', 'notices', 'money', 'team']
      when 'tiffin' then array['menu', 'notices', 'money']
      else array['notices', 'money', 'charges'] end,
    member_label_singular = case p_type when 'hostel' then 'Resident' when 'tiffin' then 'Subscriber' else 'Member' end,
    member_label_plural = case p_type when 'hostel' then 'Residents' when 'tiffin' then 'Subscribers' else 'Members' end,
    reminder_templates = jsonb_build_object(
      'before_3', 'Hi {name}, your {place} fee of {amount} is due on {due}. Pay to {upi} with note {code}. Thank you!',
      'due_day', 'Hi {name}, your {place} fee of {amount} is due today. Pay to {upi} with note {code}.',
      'after_2', 'Hi {name}, your {place} fee of {amount} was due on {due}. Please pay soon. Note: {code}.')
  where tenant_id = t;

  insert into public.accounts (tenant_id, kind, label, is_default) values
    (t, 'cash', 'Cash', true), (t, 'upi_bank', 'UPI / Bank', true);

  cats := case p_type
    when 'mess' then '[
      ["expense","vegetables","Vegetables","కూరగాయలు"],["expense","groceries","Groceries / provisions","కిరాణా సరుకులు"],
      ["expense","rice_grains","Rice & grains","బియ్యం & ధాన్యాలు"],["expense","milk_curd","Milk & curd","పాలు & పెరుగు"],
      ["expense","gas","Gas","గ్యాస్"],["expense","electricity","Electricity","కరెంట్"],["expense","water","Water","నీళ్లు"],
      ["expense","salaries","Salaries","జీతాలు"],["expense","rent","Rent","అద్దె"],["expense","repairs","Repairs & maintenance","మరమ్మతులు"],
      ["expense","packaging","Packaging / disposables","ప్యాకింగ్"],["expense","cleaning","Cleaning","శుభ్రత"],
      ["expense","transport","Transport","రవాణా"],["expense","licences","Licences & fees","లైసెన్సులు & ఫీజులు"],
      ["expense","marketing","Marketing","ప్రచారం"],["expense","internet","Internet","ఇంటర్నెట్"],["expense","other_expense","Other","ఇతర ఖర్చులు"],
      ["investment","kitchen_equipment","Kitchen equipment","వంటగది సామాను"],["investment","furniture","Furniture","ఫర్నిచర్"],
      ["investment","vehicles","Vehicles","వాహనాలు"]]'::jsonb
    when 'hostel' then '[
      ["expense","rent","Rent to landlord","భవనం అద్దె"],["expense","electricity","Electricity","కరెంట్"],["expense","water","Water","నీళ్లు"],
      ["expense","internet","Internet / Wi-Fi","ఇంటర్నెట్"],["expense","gas","Gas","గ్యాస్"],["expense","food_groceries","Food & groceries","ఆహారం & సరుకులు"],
      ["expense","housekeeping","Housekeeping","హౌస్‌కీపింగ్"],["expense","salaries","Salaries","జీతాలు"],
      ["expense","repairs","Repairs & maintenance","మరమ్మతులు"],["expense","laundry","Laundry","లాండ్రీ"],["expense","security","Security","సెక్యూరిటీ"],
      ["expense","marketing","Marketing","ప్రచారం"],["expense","licences","Licences","లైసెన్సులు"],["expense","other_expense","Other","ఇతర ఖర్చులు"],
      ["investment","furniture_fittings","Furniture & fittings","ఫర్నిచర్ & ఫిట్టింగ్స్"]]'::jsonb
    when 'tiffin' then '[
      ["expense","groceries","Groceries","కిరాణా సరుకులు"],["expense","vegetables","Vegetables","కూరగాయలు"],["expense","gas","Gas","గ్యాస్"],
      ["expense","packaging","Packaging","ప్యాకింగ్"],["expense","delivery_fuel","Delivery / fuel","డెలివరీ / పెట్రోల్"],
      ["expense","salaries","Salaries","జీతాలు"],["expense","rent","Rent","అద్దె"],["expense","electricity","Electricity","కరెంట్"],
      ["expense","other_expense","Other","ఇతర ఖర్చులు"],["investment","kitchen_equipment","Kitchen equipment","వంటగది సామాను"]]'::jsonb
    else '[
      ["expense","rent","Rent","అద్దె"],["expense","electricity","Electricity","కరెంట్"],["expense","water","Water","నీళ్లు"],
      ["expense","internet","Internet","ఇంటర్నెట్"],["expense","salaries","Salaries","జీతాలు"],["expense","repairs","Repairs & maintenance","మరమ్మతులు"],
      ["expense","marketing","Marketing","ప్రచారం"],["expense","other_expense","Other","ఇతర ఖర్చులు"],
      ["investment","furniture","Furniture","ఫర్నిచర్"]]'::jsonb
  end;
  cats := cats || '[
    ["income","fees","Fees","ఫీజులు"],["liability","deposits","Deposits (refundable)","డిపాజిట్లు"],
    ["income","late_fees","Late fees","ఆలస్య రుసుము"],["income","other_income","Other income","ఇతర ఆదాయం"]]'::jsonb;

  insert into public.categories (tenant_id, kind, key, label, label_te, system, preset_key, sort)
  select t, c ->> 0, c ->> 1, c ->> 2, c ->> 3, true, p_type, ord::int
    from jsonb_array_elements(cats) with ordinality as x(c, ord);
end $$;

-- ───────────────────────── tenant lifecycle ─────────────────────────

create or replace function public.slug_available(p_slug text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform public.rate_limit('slug:' || coalesce(auth.uid()::text, 'anon'), 60, interval '10 minutes');
  if p_slug is null or char_length(p_slug) not between 3 and 30 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or public.is_reserved_slug(p_slug) then
    return false;
  end if;
  return not exists (select 1 from public.tenants where slug = p_slug);
end $$;

create or replace function public.create_tenant(
  p_name text, p_slug text, p_type text, p_city text,
  p_audience text default 'any', p_plan_name text default null, p_plan_price_paise bigint default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me_phone text := public.verified_phone();
declare t uuid;
declare cap int := coalesce((select (value #>> '{}')::int from public.platform_settings where key = 'default_max_members'), 100);
begin
  perform public.rate_limit('create_tenant:' || auth.uid(), 3, interval '1 day');
  if p_type not in ('mess', 'hostel', 'tiffin', 'other') then raise exception 'invalid_business_type' using errcode = 'P0001'; end if;
  if not public.slug_available(p_slug) then
    raise exception 'slug_taken' using errcode = 'P0001', hint = 'This web address is taken. Try another.';
  end if;
  perform public._trust();
  insert into public.tenants (slug, name, business_type, city, contact_phone, created_by, max_members, trial_ends_at)
  values (p_slug, btrim(p_name), p_type, btrim(coalesce(p_city, '')), me_phone, auth.uid(), cap, now() + interval '90 days')
  returning id into t;
  insert into public.tenant_settings (tenant_id) values (t);
  insert into public.tenant_staff (tenant_id, phone, user_id, role, can_see_money) values (t, me_phone, auth.uid(), 'owner', true);
  insert into public.place_profiles (tenant_id, audience, address_public_level)
  values (t, coalesce(p_audience, 'any'),
          case when p_type = 'hostel' and p_audience in ('girls', 'coed') then 'area_only' else 'area_only' end);
  insert into public.tenant_usage (tenant_id) values (t);
  perform public.apply_preset(t, p_type);
  if p_plan_price_paise is not null then
    insert into public.plans (tenant_id, name, price_paise, due_rule, is_default)
    values (t, coalesce(nullif(btrim(p_plan_name), ''), 'Monthly'), p_plan_price_paise,
            case when p_type = 'hostel' then 'from_previous_due' else 'from_payment_date' end, true);
  end if;
  perform public._untrust();
  perform public.write_audit(t, 'create', 'tenant', t::text, jsonb_build_object('type', p_type));
  return jsonb_build_object('id', t, 'slug', p_slug);
end $$;

-- After login: attach imported member/staff rows that match the confirmed phone.
create or replace function public.link_my_memberships() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p text := public.verified_phone(); nm int; ns int;
begin
  update public.members set user_id = auth.uid()
   where phone = p and user_id is null and removed_at is null
     and not exists (select 1 from public.members m2 where m2.tenant_id = public.members.tenant_id and m2.user_id = auth.uid());
  get diagnostics nm = row_count;
  update public.tenant_staff set user_id = auth.uid() where phone = p and user_id is null and removed_at is null;
  get diagnostics ns = row_count;
  return jsonb_build_object('members_linked', nm, 'staff_linked', ns);
end $$;

-- What the signed-in person is: staff places, member places. Drives routing after login.
create or replace function public.my_context() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'is_platform_admin', public.is_platform_admin(),
    'staff', coalesce((select jsonb_agg(jsonb_build_object('tenant_id', t.id, 'slug', t.slug, 'name', t.name, 'type', t.business_type,
                 'role', s.role, 'can_see_money', s.role = 'owner' or s.can_see_money, 'status', t.status) order by t.name)
              from public.tenant_staff s join public.tenants t on t.id = s.tenant_id
             where s.user_id = auth.uid() and s.removed_at is null), '[]'),
    'memberships', coalesce((select jsonb_agg(jsonb_build_object('tenant_id', t.id, 'slug', t.slug, 'name', t.name, 'type', t.business_type,
                 'member_id', m.id, 'status', t.status) order by t.name)
              from public.members m join public.tenants t on t.id = m.tenant_id
             where m.user_id = auth.uid() and m.removed_at is null and m.approval_state = 'approved'), '[]'))
$$;

create or replace function public.invite_staff(p_tenant uuid, p_phone text, p_role text default 'manager', p_can_see_money boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare ph text := public.normalize_phone(p_phone); sid uuid; uid uuid;
begin
  if not public.is_owner(p_tenant) then raise exception 'forbidden' using errcode = '42501'; end if;
  if ph is null then raise exception 'invalid_phone' using errcode = 'P0001'; end if;
  if p_role not in ('owner', 'manager') then raise exception 'invalid_role' using errcode = 'P0001'; end if;
  select u.id into uid from auth.users u where public.normalize_phone(u.phone) = ph and u.phone_confirmed_at is not null limit 1;
  insert into public.tenant_staff (tenant_id, phone, user_id, role, can_see_money, invited_by)
  values (p_tenant, ph, uid, p_role, p_role = 'owner' or p_can_see_money, auth.uid())
  on conflict (tenant_id, phone) where removed_at is null
  do update set role = excluded.role, can_see_money = excluded.can_see_money
  returning id into sid;
  perform public.write_audit(p_tenant, 'invite', 'staff', sid::text, jsonb_build_object('role', p_role, 'phone', public.mask_phone(ph)));
  return sid;
end $$;

create or replace function public.remove_staff(p_staff uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.tenant_staff;
begin
  select * into s from public.tenant_staff where id = p_staff and removed_at is null;
  if s.id is null or not public.is_owner(s.tenant_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if s.role = 'owner' and (select count(*) from public.tenant_staff where tenant_id = s.tenant_id and role = 'owner' and removed_at is null) <= 1 then
    raise exception 'last_owner' using errcode = 'P0001', hint = 'A place must keep at least one owner.';
  end if;
  update public.tenant_staff set removed_at = now() where id = p_staff;
  perform public.write_audit(s.tenant_id, 'remove', 'staff', p_staff::text);
end $$;

-- ───────────────────────── availability (honest numbers) ─────────────────────────

create or replace function public.recompute_availability(t uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare total int; occ int; seats int; minp bigint; has_rooms boolean;
begin
  select exists (select 1 from public.rooms where tenant_id = t and active) into has_rooms;
  if has_rooms then
    select coalesce(sum(capacity - blocked_beds), 0) into total from public.rooms where tenant_id = t and active;
    select count(*) into occ from public.bed_assignments b join public.rooms r on r.id = b.room_id
     where b.tenant_id = t and b.to_date is null and r.active;
  else
    select seat_capacity into seats from public.place_profiles where tenant_id = t;
    if seats is not null then
      total := seats;
      select count(*) into occ from public.members
       where tenant_id = t and removed_at is null and approval_state = 'approved'
         and (left_on is null or left_on > public.tenant_today());
    end if;
  end if;
  select least(
    (select min(monthly_price_paise) from public.room_types where tenant_id = t and active),
    (select min(price_paise) from public.plans where tenant_id = t and public and archived_at is null and period_unit = 'month' and period_count = 1)
  ) into minp;
  perform public._trust();
  update public.place_profiles set
    beds_total = total,
    beds_free = case when total is null then null else greatest(total - coalesce(occ, 0), 0) end,
    min_price_paise = minp,
    availability_updated_at = case when total is null then null else now() end
  where tenant_id = t;
  perform public._untrust();
end $$;

create or replace function public.availability_trg() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.recompute_availability(coalesce(new.tenant_id, old.tenant_id));
  return null;
end $$;
create trigger rooms_availability after insert or update or delete on public.rooms for each row execute function public.availability_trg();
create trigger bed_assignments_availability after insert or update or delete on public.bed_assignments for each row execute function public.availability_trg();
create trigger room_types_availability after insert or update or delete on public.room_types for each row execute function public.availability_trg();
create trigger plans_availability after insert or update or delete on public.plans for each row execute function public.availability_trg();
create trigger members_availability after insert or update of removed_at, left_on, approval_state on public.members for each row execute function public.availability_trg();

create or replace function public.place_seat_capacity_trg() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.seat_capacity is distinct from old.seat_capacity then perform public.recompute_availability(new.tenant_id); end if;
  return null;
end $$;
create trigger place_profiles_seats after update of seat_capacity on public.place_profiles for each row execute function public.place_seat_capacity_trg();

-- Owner's weekly one-tap "availability is still correct ✔".
create or replace function public.confirm_availability(p_tenant uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff(p_tenant, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  perform public._trust();
  update public.place_profiles set availability_updated_at = now() where tenant_id = p_tenant and beds_total is not null;
  perform public._untrust();
  perform public.write_audit(p_tenant, 'confirm', 'availability', p_tenant::text);
end $$;

-- ───────────────────────── beds ─────────────────────────

create or replace function public.assign_bed(p_member uuid, p_room uuid, p_bed_label text default null, p_from date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare m public.members; r public.rooms; used int; aid uuid; d date;
begin
  select * into m from public.members where id = p_member;
  select * into r from public.rooms where id = p_room;
  if m.id is null or r.id is null or m.tenant_id <> r.tenant_id or not public.is_staff(m.tenant_id, array['owner', 'manager']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not r.active then raise exception 'room_inactive' using errcode = 'P0001'; end if;
  d := coalesce(p_from, public.tenant_today());
  select count(*) into used from public.bed_assignments where room_id = p_room and to_date is null and member_id <> p_member;
  if used >= r.capacity - r.blocked_beds then
    raise exception 'room_full' using errcode = 'P0001', hint = 'This room has no free bed.';
  end if;
  update public.bed_assignments set to_date = greatest(from_date, d - 1)
   where member_id = p_member and to_date is null;
  insert into public.bed_assignments (tenant_id, room_id, member_id, bed_label, from_date)
  values (m.tenant_id, p_room, p_member, p_bed_label, d) returning id into aid;
  perform public.write_audit(m.tenant_id, 'assign', 'bed', aid::text, jsonb_build_object('room', r.label, 'member', p_member));
  return aid;
end $$;

create or replace function public.check_out_member(p_member uuid, p_date date default null) returns void
language plpgsql security definer set search_path = '' as $$
declare m public.members; d date;
begin
  select * into m from public.members where id = p_member;
  if m.id is null or not public.is_staff(m.tenant_id, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  d := coalesce(p_date, public.tenant_today());
  update public.bed_assignments set to_date = greatest(from_date, d) where member_id = p_member and to_date is null;
  update public.members set left_on = d where id = p_member;
  perform public.write_audit(m.tenant_id, 'check_out', 'member', p_member::text, jsonb_build_object('date', d));
end $$;

-- ───────────────────────── listing moderation ─────────────────────────

create or replace function public.submit_for_listing(p_tenant uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.place_profiles; t public.tenants; missing text[] := '{}'; a record;
begin
  if not public.is_owner(p_tenant) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into p from public.place_profiles where tenant_id = p_tenant;
  select * into t from public.tenants where id = p_tenant;
  if coalesce(btrim(p.headline), '') = '' then missing := missing || 'headline'; end if;
  if coalesce(btrim(p.area), '') = '' or coalesce(btrim(t.city), '') = '' then missing := missing || 'area'; end if;
  if p.lat is null then missing := missing || 'location_pin'; end if;
  if not exists (select 1 from public.place_photos where tenant_id = p_tenant) then missing := missing || 'photos'; end if;
  if not exists (select 1 from public.room_types where tenant_id = p_tenant and active)
     and not exists (select 1 from public.plans where tenant_id = p_tenant and public and archived_at is null) then
    missing := missing || 'prices';
  end if;
  if array_length(missing, 1) > 0 then
    return jsonb_build_object('ok', false, 'missing', to_jsonb(missing));
  end if;
  perform public._trust();
  update public.place_profiles set moderation_status = 'pending', submitted_at = now(), visibility = 'listed', moderation_note = null
   where tenant_id = p_tenant;
  perform public._untrust();
  insert into public.moderation_events (tenant_id, actor, from_status, to_status) values (p_tenant, auth.uid(), p.moderation_status, 'pending');
  for a in select user_id from public.platform_admins loop
    perform public.notify_user(a.user_id, null, 'listing_submitted', 'New listing to review', t.name, '/admin/listings', jsonb_build_object('tenant_id', p_tenant));
  end loop;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.moderate_listing(p_tenant uuid, p_action text, p_note text default null, p_checklist jsonb default '{}')
returns void language plpgsql security definer set search_path = '' as $$
declare p public.place_profiles; new_status text; s record;
begin
  if not public.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into p from public.place_profiles where tenant_id = p_tenant;
  if p.tenant_id is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  perform public._trust();
  case p_action
    when 'approve' then
      new_status := 'approved';
      update public.place_profiles set moderation_status = 'approved', approved_at = now(), moderation_note = p_note where tenant_id = p_tenant;
    when 'reject' then
      if coalesce(btrim(p_note), '') = '' then raise exception 'reason_required' using errcode = 'P0001'; end if;
      new_status := 'rejected';
      update public.place_profiles set moderation_status = 'rejected', moderation_note = p_note where tenant_id = p_tenant;
    when 'suspend' then
      new_status := 'suspended';
      update public.place_profiles set moderation_status = 'suspended', moderation_note = p_note where tenant_id = p_tenant;
    when 'verify' then
      new_status := p.moderation_status;
      update public.place_profiles set verified_level = 'verified', verified_at = now(), verified_by = auth.uid() where tenant_id = p_tenant;
    when 'unverify' then
      new_status := p.moderation_status;
      update public.place_profiles set verified_level = 'none', verified_at = null, verified_by = null where tenant_id = p_tenant;
    else raise exception 'invalid_action' using errcode = 'P0001';
  end case;
  perform public._untrust();
  insert into public.moderation_events (tenant_id, actor, from_status, to_status, note, checklist)
  values (p_tenant, auth.uid(), p.moderation_status, new_status || case when p_action in ('verify', 'unverify') then ':' || p_action else '' end, p_note, coalesce(p_checklist, '{}'));
  for s in select user_id from public.tenant_staff where tenant_id = p_tenant and role = 'owner' and removed_at is null and user_id is not null loop
    perform public.notify_user(s.user_id, p_tenant, 'listing_decided',
      case p_action when 'approve' then 'Your place is live' when 'reject' then 'Listing needs changes'
                    when 'suspend' then 'Listing suspended' when 'verify' then 'Your place is verified' else 'Listing updated' end,
      p_note, '/app', jsonb_build_object('action', p_action));
  end loop;
end $$;

create or replace function public.admin_set_tenant_status(p_tenant uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_status not in ('trial', 'active', 'suspended', 'closed') then raise exception 'invalid_status' using errcode = 'P0001'; end if;
  perform public._trust();
  update public.tenants set status = p_status, closed_at = case when p_status = 'closed' then now() else closed_at end where id = p_tenant;
  perform public._untrust();
  perform public.write_audit(p_tenant, 'status', 'tenant', p_tenant::text, jsonb_build_object('status', p_status, 'note', p_note));
end $$;

create or replace function public.report_place(p_slug text, p_reason text, p_details text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare t uuid; a record; rid uuid;
begin
  perform public.rate_limit('report:' || coalesce(auth.uid()::text, 'anon:' || p_slug), case when auth.uid() is null then 20 else 5 end, interval '1 day');
  select id into t from public.tenants where slug = p_slug;
  if t is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  insert into public.place_reports (tenant_id, reason, details, reporter) values (t, p_reason, left(p_details, 1000), auth.uid())
  returning id into rid;
  for a in select user_id from public.platform_admins loop
    perform public.notify_user(a.user_id, null, 'report_new', 'A listing was reported', p_reason, '/admin/reports', jsonb_build_object('report_id', rid));
  end loop;
end $$;

create or replace function public.handle_report(p_report uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.place_reports;
begin
  if not public.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into r from public.place_reports where id = p_report;
  if p_action not in ('dismissed', 'warned', 'suspended') then raise exception 'invalid_action' using errcode = 'P0001'; end if;
  update public.place_reports set status = p_action, handled_by = auth.uid(), handled_at = now() where id = p_report;
  if p_action = 'suspended' then perform public.moderate_listing(r.tenant_id, 'suspend', 'Suspended after a report.'); end if;
end $$;
