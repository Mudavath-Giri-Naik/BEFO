-- BEFO · 0001 foundation: extensions, helper functions, identity + tenancy tables.
-- Rules: every public table has RLS; money is *_paise bigint; dates via tenant_today();
-- security definer functions always `set search_path = ''` and fully qualify names.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists postgis with schema extensions;
do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;
end $$;

-- ───────────────────────── pure helpers ─────────────────────────

-- Mirrors src/lib/phone.ts normalizePhone(). Returns '+91XXXXXXXXXX' or null.
create or replace function public.normalize_phone(p text) returns text
language plpgsql immutable set search_path = '' as $$
declare d text;
begin
  if p is null or btrim(p) = '' then return null; end if;
  if p ~* 'e[+-]?[0-9]' then return null; end if;           -- Excel scientific notation
  if p ~ '[^0-9 ()+.\-]' then return null; end if;
  d := regexp_replace(p, '[^0-9]', '', 'g');
  if length(d) = 13 and left(d, 3) = '091' then d := substr(d, 2); end if;
  if length(d) = 12 and left(d, 2) = '91' then d := substr(d, 3);
  elsif length(d) = 11 and left(d, 1) = '0' then d := substr(d, 2); end if;
  if length(d) <> 10 or d !~ '^[6-9]' then return null; end if;
  return '+91' || d;
end $$;

create or replace function public.mask_phone(p text) returns text
language sql immutable set search_path = '' as $$
  select case when p is null then null
    else '+91 ' || substr(right(regexp_replace(p, '[^0-9]', '', 'g'), 10), 1, 2) || '•••••'
         || right(regexp_replace(p, '[^0-9]', '', 'g'), 3) end
$$;

-- Today in a timezone (default Asia/Kolkata). ALL date logic goes through this.
create or replace function public.tenant_today(tz text default 'Asia/Kolkata') returns date
language sql stable set search_path = '' as $$
  select (now() at time zone coalesce(tz, 'Asia/Kolkata'))::date
$$;

create or replace function public.is_reserved_slug(s text) returns boolean
language sql immutable set search_path = '' as $$
  select s = any (array['admin','app','api','me','login','logout','signup','explore','hostels','messes','p','c','j',
    'compare','demo','help','privacy','terms','about','for-owners','list-your-place','settings','static','assets',
    'www','mail','support','befo','root','null','undefined','new','edit'])
$$;

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

-- Functions that legitimately change protected columns set this flag for the transaction.
create or replace function public._trusted() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(current_setting('befo.trusted', true), '') = 'on'
$$;
create or replace function public._trust() returns void
language sql volatile set search_path = '' as $$
  select set_config('befo.trusted', 'on', true)
$$;

-- ───────────────────────── identity ─────────────────────────

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  email text,
  phone text,                      -- verified only; mirrors auth.users
  language text not null default 'en' check (language in ('en', 'te')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- Keep profiles in sync with auth.users (name/email from Google; phone only when confirmed).
create or replace function public.sync_profile_from_auth() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    case when new.phone_confirmed_at is not null then public.normalize_phone(new.phone) end
  )
  on conflict (user_id) do update set
    email = excluded.email,
    phone = excluded.phone,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);
  return new;
end $$;
create trigger on_auth_user_changed after insert or update of phone, phone_confirmed_at, email, raw_user_meta_data
  on auth.users for each row execute function public.sync_profile_from_auth();

-- The confirmed phone of the caller. Raises when missing: a Google account without a confirmed
-- phone can never link to members, staff or imports (§11.5).
create or replace function public.verified_phone() returns text
language plpgsql stable security definer set search_path = '' as $$
declare p text;
begin
  select public.normalize_phone(u.phone) into p from auth.users u
   where u.id = auth.uid() and u.phone_confirmed_at is not null;
  if p is null then
    raise exception 'phone_not_verified' using errcode = 'P0001', hint = 'Verify your mobile number first.';
  end if;
  return p;
end $$;

-- ───────────────────────── platform ─────────────────────────

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;

create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins a where a.user_id = auth.uid())
$$;

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;
insert into public.platform_settings (key, value) values
  ('default_max_members', '100'), ('sms_daily_cap', '300'),
  ('ai_daily_docs_per_tenant', '60'), ('ai_monthly_docs_per_tenant', '1000'),
  ('availability_stale_days', '14'), ('max_place_photos', '12');

create table public.system_events (
  id bigint generated always as identity primary key,
  kind text not null,
  tenant_id uuid,
  data jsonb not null default '{}',            -- never put full phones / OTPs / keys here
  created_at timestamptz not null default now()
);
alter table public.system_events enable row level security;
create index system_events_kind_idx on public.system_events (kind, created_at desc);

create table public.rate_limits (
  key text not null,
  bucket timestamptz not null,
  count int not null default 0,
  primary key (key, bucket)
);
alter table public.rate_limits enable row level security;

-- Fixed-window rate limiter. Raises 'rate_limited' when exceeded.
create or replace function public.rate_limit(p_key text, p_max int, p_window interval) returns void
language plpgsql security definer set search_path = '' as $$
declare b timestamptz := to_timestamp(floor(extract(epoch from now()) / extract(epoch from p_window)) * extract(epoch from p_window));
declare c int;
begin
  insert into public.rate_limits (key, bucket, count) values (p_key, b, 1)
  on conflict (key, bucket) do update set count = public.rate_limits.count + 1
  returning count into c;
  if c > p_max then
    raise exception 'rate_limited' using errcode = 'P0001', hint = 'Too many attempts. Please try again later.';
  end if;
end $$;

-- ───────────────────────── tenancy ─────────────────────────

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (char_length(slug) between 3 and 30 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and not public.is_reserved_slug(slug)),
  name text not null check (char_length(name) between 2 and 120),
  business_type text not null check (business_type in ('mess', 'hostel', 'tiffin', 'other')),
  status text not null default 'trial' check (status in ('trial', 'active', 'suspended', 'closed')),
  plan_tier text not null default 'pilot',
  max_members int not null default 100 check (max_members > 0),
  trial_ends_at timestamptz,
  logo_path text,
  brand_color text not null default 'indigo'
    check (brand_color in ('indigo', 'leaf', 'turmeric', 'brick', 'teal', 'plum', 'slate', 'ocean')),
  city text not null default '',
  contact_phone text,
  timezone text not null default 'Asia/Kolkata',
  support_access_until timestamptz,
  is_demo boolean not null default false,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
alter table public.tenants enable row level security;

create or replace function public.tenants_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.slug is distinct from old.slug then
    raise exception 'slug_immutable' using errcode = 'P0001', hint = 'The web address of a place cannot change.';
  end if;
  if not public._trusted() and (
      new.status is distinct from old.status or new.plan_tier is distinct from old.plan_tier
      or new.max_members is distinct from old.max_members or new.is_demo is distinct from old.is_demo
      or new.trial_ends_at is distinct from old.trial_ends_at or new.created_by is distinct from old.created_by) then
    raise exception 'protected_column' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger tenants_guard before update on public.tenants for each row execute function public.tenants_guard();

create table public.tenant_settings (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  member_label_singular text not null default 'Member',
  member_label_plural text not null default 'Members',
  modules text[] not null default '{}'
    check (modules <@ array['rooms','charges','notices','menu','money','team']),
  join_policy text not null default 'approve_unlisted' check (join_policy in ('approve_unlisted', 'listed_only')),
  grace_days int not null default 0 check (grace_days between 0 and 60),
  expiring_soon_days int not null default 3 check (expiring_soon_days between 0 and 30),
  default_language text not null default 'en' check (default_language in ('en', 'te')),
  reminder_templates jsonb not null default '{}',
  upi_ids jsonb not null default '[]',
  payment_instructions text,
  weekly_close_day int not null default 5 check (weekly_close_day between 0 and 6),
  weekly_close_time time not null default '18:00',
  updated_at timestamptz not null default now()
);
alter table public.tenant_settings enable row level security;
create trigger tenant_settings_updated before update on public.tenant_settings for each row execute function public.set_updated_at();

create table public.tenant_staff (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  phone text not null check (phone ~ '^\+91[6-9][0-9]{9}$'),
  user_id uuid references auth.users (id),
  role text not null check (role in ('owner', 'manager')),
  can_see_money boolean not null default false,
  invited_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  removed_at timestamptz
);
alter table public.tenant_staff enable row level security;
create unique index tenant_staff_phone_uq on public.tenant_staff (tenant_id, phone) where removed_at is null;
create index tenant_staff_user_idx on public.tenant_staff (user_id) where removed_at is null;

-- Is the caller staff of tenant t (optionally with one of the given roles)?
create or replace function public.is_staff(t uuid, roles text[] default null) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tenant_staff s
     where s.tenant_id = t and s.user_id = auth.uid() and s.removed_at is null
       and (roles is null or s.role = any (roles)))
$$;

create or replace function public.is_owner(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_staff(t, array['owner'])
$$;

-- Finance/team visibility: owners, or managers with can_see_money.
create or replace function public.can_see_money(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tenant_staff s
     where s.tenant_id = t and s.user_id = auth.uid() and s.removed_at is null
       and (s.role = 'owner' or s.can_see_money))
$$;

-- Tenant must be operating (not suspended/closed) for staff/customer actions.
create or replace function public.tenant_is_open(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tenants x where x.id = t and x.status in ('trial', 'active'))
$$;

create table public.tenant_usage (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  members int not null default 0,
  photos int not null default 0,
  storage_bytes bigint not null default 0,
  ai_docs_day date,
  ai_docs_today int not null default 0,
  ai_month text,
  ai_docs_month int not null default 0,
  sms_month int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.tenant_usage enable row level security;

create table public.audit_log (
  id bigint generated always as identity primary key,
  tenant_id uuid references public.tenants (id) on delete cascade,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id text,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create index audit_log_tenant_idx on public.audit_log (tenant_id, created_at desc);

create or replace function public.write_audit(p_tenant uuid, p_action text, p_entity text, p_entity_id text, p_data jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (tenant_id, actor, action, entity, entity_id, data)
  values (p_tenant, auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_data, '{}'))
$$;

-- Generic audit trigger for owner-editable configuration tables.
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r record; t uuid;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  t := (to_jsonb(r) ->> 'tenant_id')::uuid;
  insert into public.audit_log (tenant_id, actor, action, entity, entity_id, data)
  values (t, auth.uid(), lower(tg_op), tg_table_name, to_jsonb(r) ->> 'id',
          case when tg_op = 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
               else to_jsonb(r) end);
  return null;
end $$;

-- tenant_id never changes on a row.
create or replace function public.tenant_id_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'tenant_id_immutable' using errcode = 'P0001';
  end if;
  return new;
end $$;
