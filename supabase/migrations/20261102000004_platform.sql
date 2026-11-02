-- BEFO · 0004 notifications, jobs queue, passkeys/card, SMS log.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete cascade,
  type text not null check (type in ('join_request_new', 'join_request_decided', 'payment_claim_new', 'payment_claim_decided',
    'member_expiring', 'capture_ready', 'bill_expected_missing', 'payout_due', 'document_expiring', 'availability_check',
    'weekly_close', 'backup_stale', 'listing_decided', 'listing_submitted', 'report_new', 'welcome')),
  title text not null,
  body text,
  data jsonb not null default '{}',
  url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.push_subscriptions enable row level security;

create table public.notification_prefs (
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  channel text not null check (channel in ('inapp', 'push', 'email')),
  enabled boolean not null default true,
  primary key (user_id, type, channel)
);
alter table public.notification_prefs enable row level security;

create table public.jobs (
  id bigint generated always as identity primary key,
  tenant_id uuid references public.tenants (id) on delete cascade,
  type text not null check (type in ('notify', 'ai_extract', 'ai_voice', 'claim_extract', 'statement_parse', 'import',
    'pdf', 'weekly_close', 'availability_check', 'reminders', 'payouts')),
  payload jsonb not null default '{}',
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed', 'dead')),
  attempts int not null default 0,
  max_attempts int not null default 5,
  run_at timestamptz not null default now(),
  locked_by text,
  locked_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
alter table public.jobs enable row level security;
create index jobs_ready_idx on public.jobs (type, run_at) where status = 'queued';

-- Workers (service role only) claim jobs with SKIP LOCKED so several can run safely.
create or replace function public.claim_jobs(p_type text, p_worker text, p_limit int default 5)
returns setof public.jobs language plpgsql security definer set search_path = '' as $$
begin
  return query
  update public.jobs j set status = 'running', locked_by = p_worker, locked_at = now(), attempts = j.attempts + 1
   where j.id in (
     select id from public.jobs
      where type = p_type and status = 'queued' and run_at <= now()
      order by run_at limit p_limit for update skip locked)
  returning j.*;
end $$;

create or replace function public.finish_job(p_id bigint, p_ok boolean, p_error text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare j public.jobs;
begin
  select * into j from public.jobs where id = p_id for update;
  if p_ok then
    update public.jobs set status = 'done', finished_at = now(), error = null where id = p_id;
  elsif j.attempts >= j.max_attempts then
    update public.jobs set status = 'dead', finished_at = now(), error = left(p_error, 2000) where id = p_id;
  else  -- exponential backoff: 30s, 2m, 8m, 32m…
    update public.jobs set status = 'queued', locked_by = null, error = left(p_error, 2000),
      run_at = now() + make_interval(secs => 30 * power(4, j.attempts - 1)) where id = p_id;
  end if;
end $$;

-- In-app notification + queue push/email delivery.
create or replace function public.notify_user(p_user uuid, p_tenant uuid, p_type text, p_title text, p_body text, p_url text, p_data jsonb default '{}')
returns void language plpgsql security definer set search_path = '' as $$
declare nid uuid;
begin
  if p_user is null then return; end if;
  insert into public.notifications (user_id, tenant_id, type, title, body, url, data)
  values (p_user, p_tenant, p_type, p_title, p_body, p_url, coalesce(p_data, '{}')) returning id into nid;
  insert into public.jobs (tenant_id, type, payload) values (p_tenant, 'notify', jsonb_build_object('notification_id', nid));
end $$;

create or replace function public.notify_staff(p_tenant uuid, p_type text, p_title text, p_body text, p_url text, p_data jsonb default '{}', p_owner_only boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  for s in select user_id from public.tenant_staff
            where tenant_id = p_tenant and removed_at is null and user_id is not null
              and (not p_owner_only or role = 'owner' or can_see_money) loop
    perform public.notify_user(s.user_id, p_tenant, p_type, p_title, p_body, p_url, p_data);
  end loop;
end $$;

-- ───────────────────────── passkeys / card ─────────────────────────

create table public.passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  credential_id text not null unique,
  public_key bytea not null,
  counter bigint not null default 0,
  transports text[] not null default '{}',
  device_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
alter table public.passkeys enable row level security;
create unique index passkeys_one_active on public.passkeys (user_id) where revoked_at is null;

create table public.webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge text not null,
  kind text not null check (kind in ('register', 'unlock')),
  expires_at timestamptz not null default now() + interval '2 minutes',
  used_at timestamptz
);
alter table public.webauthn_challenges enable row level security;

create table public.card_unlocks (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  passkey_id uuid references public.passkeys (id),
  tenant_id uuid references public.tenants (id) on delete cascade,
  member_id uuid references public.members (id) on delete cascade,
  unprotected boolean not null default false,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.card_unlocks enable row level security;
create index card_unlocks_member_idx on public.card_unlocks (tenant_id, member_id, created_at desc);

create table public.sms_log (
  id bigint generated always as identity primary key,
  phone_hash text not null,          -- sha256 of E.164, never the number itself
  phone_masked text not null,
  status text not null check (status in ('sent', 'blocked_rate', 'blocked_cap', 'failed', 'console')),
  provider text not null,
  error text,
  created_at timestamptz not null default now()
);
alter table public.sms_log enable row level security;
create index sms_log_phone_idx on public.sms_log (phone_hash, created_at desc);
create index sms_log_day_idx on public.sms_log (created_at);

-- Used by the sms-hook Edge Function (service role). Enforces 3/hour, 10/day per phone and the daily cap.
create or replace function public.sms_allowed(p_phone text) returns text
language plpgsql security definer set search_path = '' as $$
declare h text := encode(extensions.digest(coalesce(public.normalize_phone(p_phone), p_phone), 'sha256'), 'hex');
declare cap int := coalesce((select (value #>> '{}')::int from public.platform_settings where key = 'sms_daily_cap'), 300);
begin
  if (select count(*) from public.sms_log where phone_hash = h and status in ('sent', 'console') and created_at > now() - interval '1 hour') >= 3 then
    return 'blocked_rate';
  end if;
  if (select count(*) from public.sms_log where phone_hash = h and status in ('sent', 'console') and created_at > now() - interval '1 day') >= 10 then
    return 'blocked_rate';
  end if;
  if (select count(*) from public.sms_log where status = 'sent' and created_at >= (public.tenant_today())::timestamp at time zone 'Asia/Kolkata') >= cap then
    return 'blocked_cap';
  end if;
  return 'ok';
end $$;

create or replace function public.sms_record(p_phone text, p_status text, p_provider text, p_error text default null) returns void
language sql security definer set search_path = '' as $$
  insert into public.sms_log (phone_hash, phone_masked, status, provider, error)
  values (encode(extensions.digest(coalesce(public.normalize_phone(p_phone), p_phone), 'sha256'), 'hex'),
          public.mask_phone(p_phone), p_status, p_provider, left(p_error, 500))
$$;
