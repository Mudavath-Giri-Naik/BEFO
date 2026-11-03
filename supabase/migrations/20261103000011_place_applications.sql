-- BEFO · 0011 place applications: a business only exists after a platform admin approves it.
-- Owners apply (nothing is provisioned); admin_decide_application('approve') creates the tenant, staff,
-- profile, preset accounts/categories and the first plan in one transaction. create_tenant is removed.
-- Admins are recognised by e-mail too: platform_settings.admin_emails (set per project, not in git).

create table public.place_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  phone text not null,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null check (char_length(slug) between 3 and 30 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  business_type text not null check (business_type in ('mess', 'hostel', 'tiffin', 'other')),
  city text not null default '' check (char_length(city) <= 80),
  audience text not null default 'any' check (audience in ('boys', 'girls', 'coed', 'any')),
  plan_name text check (char_length(plan_name) <= 60),
  plan_price_paise bigint check (plan_price_paise is null or plan_price_paise > 0),
  note text check (char_length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  decision_note text check (char_length(decision_note) <= 1000),
  decided_by uuid references auth.users (id),
  decided_at timestamptz,
  tenant_id uuid references public.tenants (id) on delete set null,   -- set on approval
  created_at timestamptz not null default now()
);
create unique index place_applications_pending_slug on public.place_applications (slug) where status = 'pending';
create index place_applications_user on public.place_applications (user_id, created_at desc);
create index place_applications_status on public.place_applications (status, created_at);
create index place_applications_tenant on public.place_applications (tenant_id);
create index place_applications_decided_by on public.place_applications (decided_by);
alter table public.place_applications enable row level security;
create policy place_applications_read on public.place_applications for select to authenticated
  using (user_id = (select auth.uid()) or public.is_platform_admin());
grant select on public.place_applications to authenticated;
grant all on public.place_applications to service_role;

insert into public.platform_settings (key, value) values ('admin_emails', '[]') on conflict (key) do nothing;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in ('join_request_new', 'join_request_decided',
  'payment_claim_new', 'payment_claim_decided', 'member_expiring', 'capture_ready', 'bill_expected_missing', 'payout_due',
  'document_expiring', 'availability_check', 'weekly_close', 'backup_stale', 'listing_decided', 'listing_submitted', 'report_new',
  'welcome', 'application_new', 'application_approved', 'application_rejected'));

-- A pending application reserves its web address.
create or replace function public.slug_available(p_slug text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform public.rate_limit('slug:' || coalesce(auth.uid()::text, 'anon'), 60, interval '10 minutes');
  if p_slug is null or char_length(p_slug) not between 3 and 30 or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or public.is_reserved_slug(p_slug) then
    return false;
  end if;
  return not exists (select 1 from public.tenants where slug = p_slug)
     and not exists (select 1 from public.place_applications where slug = p_slug and status = 'pending');
end $$;

-- Internal: everything a new business needs. Only admin_decide_application calls it.
create or replace function public._provision_tenant(
  p_owner uuid, p_owner_phone text, p_name text, p_slug text, p_type text, p_city text,
  p_audience text, p_plan_name text, p_plan_price_paise bigint
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare t uuid;
declare cap int := coalesce((select (value #>> '{}')::int from public.platform_settings where key = 'default_max_members'), 100);
begin
  if exists (select 1 from public.tenants where slug = p_slug) then
    raise exception 'slug_taken' using errcode = 'P0001', hint = 'This web address is taken. Ask the owner to apply again.';
  end if;
  perform public._trust();
  insert into public.tenants (slug, name, business_type, city, contact_phone, created_by, max_members, trial_ends_at)
  values (p_slug, btrim(p_name), p_type, btrim(coalesce(p_city, '')), p_owner_phone, p_owner, cap, now() + interval '90 days')
  returning id into t;
  insert into public.tenant_settings (tenant_id) values (t);
  insert into public.tenant_staff (tenant_id, phone, user_id, role, can_see_money) values (t, p_owner_phone, p_owner, 'owner', true);
  insert into public.place_profiles (tenant_id, audience, address_public_level) values (t, coalesce(p_audience, 'any'), 'area_only');
  insert into public.tenant_usage (tenant_id) values (t);
  perform public.apply_preset(t, p_type);
  if p_plan_price_paise is not null then
    insert into public.plans (tenant_id, name, price_paise, due_rule, is_default)
    values (t, coalesce(nullif(btrim(p_plan_name), ''), 'Monthly'), p_plan_price_paise,
            case when p_type = 'hostel' then 'from_previous_due' else 'from_payment_date' end, true);
  end if;
  perform public._untrust();
  perform public.write_audit(t, 'create', 'tenant', t::text, jsonb_build_object('type', p_type, 'owner', p_owner));
  return t;
end $$;

drop function public.create_tenant(text, text, text, text, text, text, bigint);

create or replace function public.apply_for_place(
  p_name text, p_slug text, p_type text, p_city text,
  p_audience text default 'any', p_plan_name text default null, p_plan_price_paise bigint default null, p_note text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me_phone text := public.verified_phone(); a uuid; adm record;
begin
  perform public.rate_limit('apply_for_place:' || auth.uid(), 5, interval '1 day');
  if p_type not in ('mess', 'hostel', 'tiffin', 'other') then raise exception 'invalid_business_type' using errcode = 'P0001'; end if;
  if char_length(btrim(coalesce(p_name, ''))) < 2 then raise exception 'name_required' using errcode = 'P0001'; end if;
  if (select count(*) from public.place_applications where user_id = auth.uid() and status = 'pending') >= 3 then
    raise exception 'too_many_pending' using errcode = 'P0001', hint = 'Wait until your other applications are reviewed.';
  end if;
  if not public.slug_available(p_slug) then
    raise exception 'slug_taken' using errcode = 'P0001', hint = 'This web address is taken. Try another.';
  end if;
  insert into public.place_applications (user_id, phone, name, slug, business_type, city, audience, plan_name, plan_price_paise, note)
  values (auth.uid(), me_phone, btrim(p_name), p_slug, p_type, btrim(coalesce(p_city, '')), coalesce(p_audience, 'any'),
          nullif(btrim(p_plan_name), ''), p_plan_price_paise, nullif(btrim(p_note), ''))
  returning id into a;
  for adm in select user_id from public.platform_admins loop
    perform public.notify_user(adm.user_id, null, 'application_new', 'New place to approve', btrim(p_name), '/admin/applications',
                               jsonb_build_object('application_id', a));
  end loop;
  perform public.write_audit(null, 'apply', 'place_application', a::text, jsonb_build_object('slug', p_slug, 'type', p_type));
  return a;
end $$;

create or replace function public.withdraw_application(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.place_applications set status = 'withdrawn' where id = p_id and user_id = auth.uid() and status = 'pending';
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  perform public.write_audit(null, 'withdraw', 'place_application', p_id::text);
end $$;

create or replace function public.admin_decide_application(p_id uuid, p_action text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare app public.place_applications; t uuid;
begin
  if not public.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into app from public.place_applications where id = p_id for update;
  if app.id is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  if app.status <> 'pending' then raise exception 'already_decided' using errcode = 'P0001'; end if;
  if p_action = 'approve' then
    t := public._provision_tenant(app.user_id, app.phone, app.name, app.slug, app.business_type, app.city, app.audience,
                                  app.plan_name, app.plan_price_paise);
    update public.place_applications set status = 'approved', tenant_id = t, decided_by = auth.uid(), decided_at = now(),
           decision_note = nullif(btrim(p_note), '') where id = p_id;
    perform public.notify_user(app.user_id, t, 'application_approved', 'Your place is approved', app.name, '/app/' || app.slug);
  elsif p_action = 'reject' then
    if coalesce(btrim(p_note), '') = '' then raise exception 'reason_required' using errcode = 'P0001'; end if;
    update public.place_applications set status = 'rejected', decided_by = auth.uid(), decided_at = now(), decision_note = btrim(p_note)
     where id = p_id;
    perform public.notify_user(app.user_id, null, 'application_rejected', 'Your application needs changes', btrim(p_note), '/list-your-place');
  else
    raise exception 'invalid_action' using errcode = 'P0001';
  end if;
  perform public.write_audit(t, p_action, 'place_application', p_id::text, jsonb_build_object('slug', app.slug));
  return jsonb_build_object('status', case p_action when 'approve' then 'approved' else 'rejected' end, 'tenant_id', t, 'slug', app.slug);
end $$;

-- ───────────────────────── admin read models (no member or finance detail) ─────────────────────────

create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'applications_pending', (select count(*) from public.place_applications where status = 'pending'),
    'places', (select count(*) from public.tenants where not is_demo),
    'places_running', (select count(*) from public.tenants where not is_demo and status in ('trial', 'active')),
    'places_suspended', (select count(*) from public.tenants where not is_demo and status = 'suspended'),
    'by_type', (select coalesce(jsonb_object_agg(business_type, n), '{}') from
                 (select business_type, count(*) n from public.tenants where not is_demo group by 1) x),
    'listings_pending', (select count(*) from public.place_profiles where moderation_status = 'pending'),
    'listings_live', (select count(*) from public.place_profiles where moderation_status = 'approved' and visibility = 'listed'),
    'reports_open', (select count(*) from public.place_reports where status = 'open'),
    'users', (select count(*) from auth.users),
    'users_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'members', (select count(*) from public.members where removed_at is null),
    'join_requests_pending', (select count(*) from public.join_requests where status = 'pending'));
end $$;

create or replace function public.admin_applications(p_status text default null)
returns table (id uuid, name text, slug text, business_type text, city text, audience text, plan_name text,
               plan_price_paise bigint, note text, status text, decision_note text, decided_at timestamptz,
               created_at timestamptz, phone text, applicant_name text, applicant_email text, tenant_slug text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select a.id, a.name, a.slug, a.business_type, a.city, a.audience, a.plan_name, a.plan_price_paise, a.note, a.status,
           a.decision_note, a.decided_at, a.created_at, a.phone, p.full_name, p.email, t.slug
      from public.place_applications a
      left join public.profiles p on p.user_id = a.user_id
      left join public.tenants t on t.id = a.tenant_id
     where p_status is null or a.status = p_status
     order by (a.status = 'pending') desc, a.created_at desc
     limit 200;
end $$;

create or replace function public.admin_places()
returns table (id uuid, slug text, name text, business_type text, city text, status text, created_at timestamptz,
               contact_phone text, owner_name text, owner_email text, moderation_status text, visibility text,
               verified_level text, members int, last_activity timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select t.id, t.slug, t.name, t.business_type, t.city, t.status, t.created_at, t.contact_phone,
           o.full_name, o.email, pp.moderation_status, pp.visibility, pp.verified_level,
           (select count(*)::int from public.members m where m.tenant_id = t.id and m.removed_at is null),
           (select max(al.created_at) from public.audit_log al where al.tenant_id = t.id)
      from public.tenants t
      left join public.place_profiles pp on pp.tenant_id = t.id
      left join lateral (select pr.full_name, pr.email from public.tenant_staff s join public.profiles pr on pr.user_id = s.user_id
                          where s.tenant_id = t.id and s.role = 'owner' and s.removed_at is null order by s.created_at limit 1) o on true
     where not t.is_demo
     order by (pp.moderation_status = 'pending') desc, t.created_at desc;
end $$;

-- ───────────────────────── login: admin by e-mail, applications in my_context ─────────────────────────

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
  -- confirmed e-mails listed in platform_settings.admin_emails become platform admins
  insert into public.platform_admins (user_id)
  select u.id from auth.users u join public.platform_settings s on s.key = 'admin_emails'
   where u.id = auth.uid() and u.email_confirmed_at is not null and s.value ? lower(u.email)
  on conflict (user_id) do nothing;
  return jsonb_build_object('members_linked', nm, 'staff_linked', ns);
end $$;

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
             where m.user_id = auth.uid() and m.removed_at is null and m.approval_state = 'approved'), '[]'),
    'applications', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'slug', a.slug, 'type', a.business_type,
                 'status', a.status, 'decision_note', a.decision_note, 'created_at', a.created_at) order by a.created_at desc)
              from (select * from public.place_applications where user_id = auth.uid() and status in ('pending', 'rejected')
                     order by created_at desc limit 5) a), '[]'))
$$;

revoke all on function public._provision_tenant(uuid, text, text, text, text, text, text, text, bigint) from public, anon, authenticated;
grant execute on function public.apply_for_place(text, text, text, text, text, text, bigint, text), public.withdraw_application(uuid),
  public.admin_decide_application(uuid, text, text), public.admin_overview(), public.admin_applications(text), public.admin_places()
  to authenticated;
grant execute on all functions in schema public to service_role;
