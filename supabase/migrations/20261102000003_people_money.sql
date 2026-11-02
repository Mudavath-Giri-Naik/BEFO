-- BEFO · 0003 people and billing, join requests, custom fields, claims, payments and the ledger core.

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  price_paise bigint not null check (price_paise >= 0),
  period_unit text not null default 'month' check (period_unit in ('day', 'week', 'month')),
  period_count int not null default 1 check (period_count between 1 and 24),
  due_rule text not null default 'from_payment_date' check (due_rule in ('from_payment_date', 'from_previous_due')),
  description text check (char_length(description) <= 400),
  public boolean not null default true,
  is_default boolean not null default false,
  sort int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.plans enable row level security;
create index plans_tenant_idx on public.plans (tenant_id, sort);
create unique index plans_one_default on public.plans (tenant_id) where is_default and archived_at is null;
create trigger plans_tid before update on public.plans for each row execute function public.tenant_id_immutable();

create table public.members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  phone text not null check (phone ~ '^\+91[6-9][0-9]{9}$'),
  name text not null check (char_length(name) between 1 and 120),
  user_id uuid references auth.users (id),
  plan_id uuid references public.plans (id),
  code text not null check (code ~ '^[A-Z0-9]{4,6}$'),
  approval_state text not null default 'approved' check (approval_state in ('approved', 'pending', 'rejected')),
  created_via text not null default 'manual' check (created_via in ('import', 'request', 'manual')),
  joined_on date not null default public.tenant_today(),
  billing_start date,
  left_on date,
  photo_path text,
  photo_locked boolean not null default false,
  custom jsonb not null default '{}',
  consented_at timestamptz,
  profile_completed_at timestamptz,
  paused_at timestamptz,
  removed_at timestamptz,
  phone_history jsonb not null default '[]',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, phone),
  unique (tenant_id, code)
);
alter table public.members enable row level security;
create unique index members_user_uq on public.members (tenant_id, user_id) where user_id is not null;
create index members_tenant_idx on public.members (tenant_id, created_at desc);
create index members_user_idx on public.members (user_id) where user_id is not null;
create index members_name_trgm on public.members using gin (name extensions.gin_trgm_ops);
create trigger members_updated before update on public.members for each row execute function public.set_updated_at();
create trigger members_tid before update on public.members for each row execute function public.tenant_id_immutable();

-- Short member code used as the UPI note reference (e.g. K7P2). No 0/O/1/I.
create or replace function public.new_member_code(t uuid) returns text
language plpgsql volatile set search_path = '' as $$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; c text; i int;
begin
  for attempt in 1..20 loop
    c := '';
    for i in 1..(case when attempt < 10 then 4 else 5 end) loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    if not exists (select 1 from public.members m where m.tenant_id = t and m.code = c) then return c; end if;
  end loop;
  raise exception 'could_not_allocate_code';
end $$;

create or replace function public.members_defaults() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.phone := coalesce(public.normalize_phone(new.phone), new.phone);
  if new.code is null then new.code := public.new_member_code(new.tenant_id); end if;
  if new.plan_id is not null and not exists (select 1 from public.plans p where p.id = new.plan_id and p.tenant_id = new.tenant_id) then
    raise exception 'cross_tenant_reference' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger members_defaults before insert or update of phone, plan_id on public.members for each row execute function public.members_defaults();

-- Member cap per tenant.
create or replace function public.members_cap() returns trigger
language plpgsql set search_path = '' as $$
declare cap int; n int;
begin
  select max_members into cap from public.tenants where id = new.tenant_id;
  select count(*) into n from public.members where tenant_id = new.tenant_id and removed_at is null and approval_state = 'approved';
  if n >= cap then
    raise exception 'member_cap_reached' using errcode = 'P0001', hint = 'This place has reached its member limit.';
  end if;
  return new;
end $$;
create trigger members_cap before insert on public.members for each row execute function public.members_cap();

create table public.bed_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  room_id uuid not null references public.rooms (id),
  member_id uuid not null references public.members (id),
  bed_label text,
  from_date date not null default public.tenant_today(),
  to_date date,
  created_at timestamptz not null default now(),
  check (to_date is null or to_date >= from_date)
);
alter table public.bed_assignments enable row level security;
create unique index bed_assignments_one_open on public.bed_assignments (member_id) where to_date is null;
create index bed_assignments_room_idx on public.bed_assignments (tenant_id, room_id) where to_date is null;
create trigger bed_assignments_tid before update on public.bed_assignments for each row execute function public.tenant_id_immutable();

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  name text not null check (char_length(name) between 1 and 120),
  phone text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'waitlisted', 'withdrawn', 'expired')),
  message text check (char_length(message) <= 500),
  preferred_room_type_id uuid references public.room_types (id),
  preferred_plan_id uuid references public.plans (id),
  move_in_date date,
  visit_on date,
  adult_confirmed boolean not null check (adult_confirmed),
  consent_at timestamptz not null,
  member_id uuid references public.members (id),
  decision_by uuid,
  decision_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now()
);
alter table public.join_requests enable row level security;
create unique index join_requests_one_open on public.join_requests (tenant_id, user_id) where status in ('pending', 'waitlisted');
create index join_requests_tenant_idx on public.join_requests (tenant_id, status, created_at desc);
create index join_requests_user_idx on public.join_requests (user_id, created_at desc);

create table public.field_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,39}$'),
  label text not null check (char_length(label) between 1 and 60),
  label_te text,
  type text not null check (type in ('text', 'number', 'select', 'date', 'phone', 'yesno', 'textarea')),
  options text[] not null default '{}',
  required boolean not null default false,
  unique_in_tenant boolean not null default false,
  collect_from text not null default 'member' check (collect_from in ('member', 'owner')),
  member_can_edit boolean not null default false,
  show_on_card boolean not null default false,
  show_in_list boolean not null default false,
  sort int not null default 0,
  archived_at timestamptz,
  unique (tenant_id, key)
);
alter table public.field_definitions enable row level security;
create trigger field_definitions_tid before update on public.field_definitions for each row execute function public.tenant_id_immutable();

create or replace function public.field_definitions_card_cap() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.show_on_card and new.archived_at is null and (
    select count(*) from public.field_definitions f
     where f.tenant_id = new.tenant_id and f.show_on_card and f.archived_at is null and f.id <> new.id) >= 3 then
    raise exception 'card_field_limit' using errcode = 'P0001', hint = 'At most 3 fields can show on the ID card.';
  end if;
  return new;
end $$;
create trigger field_definitions_card_cap before insert or update on public.field_definitions for each row execute function public.field_definitions_card_cap();

create table public.member_unique_values (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  field_key text not null,
  value_norm text not null,
  member_id uuid not null references public.members (id) on delete cascade,
  primary key (tenant_id, field_key, value_norm)
);
alter table public.member_unique_values enable row level security;

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text check (char_length(body) <= 4000),
  pinned boolean not null default false,
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.notices enable row level security;
create index notices_tenant_idx on public.notices (tenant_id, publish_at desc);
create trigger notices_tid before update on public.notices for each row execute function public.tenant_id_immutable();

-- ───────────────────────── ledger core ─────────────────────────

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind text not null check (kind in ('cash', 'upi_bank')),
  label text not null,
  upi_vpa text,
  opening_balance_paise bigint not null default 0,
  opening_on date not null default public.tenant_today(),
  is_default boolean not null default false,
  archived_at timestamptz
);
alter table public.accounts enable row level security;
create index accounts_tenant_idx on public.accounts (tenant_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  parent_id uuid references public.categories (id),
  kind text not null check (kind in ('income', 'expense', 'investment', 'liability')),
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,39}$'),
  label text not null,
  label_te text,
  icon text,
  color text,
  system boolean not null default false,
  preset_key text,
  sort int not null default 0,
  archived_at timestamptz,
  unique (tenant_id, key)
);
alter table public.categories enable row level security;

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  kind text not null default 'vendor' check (kind in ('vendor', 'utility', 'landlord', 'other')),
  default_category_id uuid references public.categories (id),
  trust_count int not null default 0,
  auto_confirm boolean not null default false,
  gstin text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.parties enable row level security;
create index parties_tenant_idx on public.parties (tenant_id, name);

create table public.party_aliases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  alias_norm text,
  vpa text,
  party_id uuid references public.parties (id) on delete cascade,
  member_id uuid references public.members (id) on delete cascade,
  employee_id uuid,
  created_at timestamptz not null default now(),
  check (alias_norm is not null or vpa is not null)
);
alter table public.party_aliases enable row level security;
create index party_aliases_lookup on public.party_aliases (tenant_id, vpa);
create index party_aliases_alias on public.party_aliases (tenant_id, alias_norm);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  kind text not null check (kind in ('member_payment', 'expense', 'salary', 'advance', 'investment', 'deposit_in',
    'deposit_out', 'transfer', 'adjustment', 'owner_draw', 'other_income')),
  account_id uuid references public.accounts (id),
  category_id uuid references public.categories (id),
  party_id uuid references public.parties (id),
  member_id uuid references public.members (id),
  employee_id uuid,
  amount_paise bigint not null check (amount_paise > 0),
  occurred_on date not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'void')),
  source text not null default 'manual' check (source in ('manual', 'capture', 'claim', 'statement', 'recurring', 'system', 'import')),
  capture_id uuid,
  claim_id uuid,
  payable_id uuid,
  utr text,
  confidence numeric(4, 3),
  dedupe_key text,
  tags text[] not null default '{}',
  reversed_of uuid references public.transactions (id),
  voided_at timestamptz,
  void_reason text,
  month_closed boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
create index transactions_tenant_date on public.transactions (tenant_id, occurred_on desc);
create index transactions_tenant_status on public.transactions (tenant_id, status);
create index transactions_tenant_utr on public.transactions (tenant_id, utr) where utr is not null;
create trigger transactions_tid before update on public.transactions for each row execute function public.tenant_id_immutable();

-- Append-only ledger: rows are never deleted; amounts never change once confirmed.
create or replace function public.transactions_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'ledger_append_only' using errcode = 'P0001', hint = 'Void the transaction instead.';
  end if;
  if old.status = 'confirmed' and (new.amount_paise <> old.amount_paise or new.direction <> old.direction or new.kind <> old.kind) then
    raise exception 'confirmed_is_immutable' using errcode = 'P0001', hint = 'Void it and record a new one.';
  end if;
  if old.status = 'void' and new.status <> 'void' then
    raise exception 'void_is_final' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger transactions_guard before update or delete on public.transactions for each row execute function public.transactions_guard();

create table public.finance_month_summary (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  month date not null, -- first day of month
  income_paise bigint not null default 0,
  expense_paise bigint not null default 0,
  investment_paise bigint not null default 0,
  deposits_paise bigint not null default 0,
  by_category jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (tenant_id, month)
);
alter table public.finance_month_summary enable row level security;

create or replace function public.refresh_finance_month(t uuid, m date) returns void
language sql security definer set search_path = '' as $$
  insert into public.finance_month_summary (tenant_id, month, income_paise, expense_paise, investment_paise, deposits_paise, by_category, updated_at)
  select t, date_trunc('month', m)::date,
    coalesce(sum(case when kind in ('member_payment', 'other_income') then (case when direction = 'in' then amount_paise else -amount_paise end) end), 0),
    coalesce(sum(case when kind in ('expense', 'salary') then (case when direction = 'out' then amount_paise else -amount_paise end) end), 0),
    coalesce(sum(case when kind = 'investment' then (case when direction = 'out' then amount_paise else -amount_paise end) end), 0),
    coalesce(sum(case when kind = 'deposit_in' then amount_paise when kind = 'deposit_out' then -amount_paise end), 0),
    coalesce((select jsonb_object_agg(k, v) from (
       select c.key k, sum(case when x.direction = 'out' then x.amount_paise else -x.amount_paise end) v
         from public.transactions x join public.categories c on c.id = x.category_id
        where x.tenant_id = t and x.status = 'confirmed' and x.kind in ('expense', 'salary', 'investment')
          and x.occurred_on >= date_trunc('month', m)::date and x.occurred_on < (date_trunc('month', m) + interval '1 month')::date
        group by c.key) s), '{}'),
    now()
  from public.transactions
  where tenant_id = t and status = 'confirmed'
    and occurred_on >= date_trunc('month', m)::date and occurred_on < (date_trunc('month', m) + interval '1 month')::date
  on conflict (tenant_id, month) do update set
    income_paise = excluded.income_paise, expense_paise = excluded.expense_paise,
    investment_paise = excluded.investment_paise, deposits_paise = excluded.deposits_paise,
    by_category = excluded.by_category, updated_at = now()
$$;

create or replace function public.transactions_summary_trg() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.refresh_finance_month(new.tenant_id, new.occurred_on);
  if tg_op = 'UPDATE' and old.occurred_on is distinct from new.occurred_on then
    perform public.refresh_finance_month(old.tenant_id, old.occurred_on);
  end if;
  return null;
end $$;
create trigger transactions_summary after insert or update on public.transactions for each row execute function public.transactions_summary_trg();

-- ───────────────────────── member money ─────────────────────────

create table public.charges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  member_id uuid not null references public.members (id),
  kind text not null check (kind in ('deposit', 'fee', 'penalty', 'other')),
  amount_paise bigint not null check (amount_paise > 0),
  description text,
  due_on date,
  status text not null default 'open' check (status in ('open', 'paid', 'waived')),
  paid_payment_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  waived_by uuid,
  waived_at timestamptz
);
alter table public.charges enable row level security;
create index charges_tenant_idx on public.charges (tenant_id, member_id, status);

create table public.payment_claims (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  member_id uuid not null references public.members (id),
  amount_paise bigint not null check (amount_paise > 0),
  method text not null check (method in ('upi', 'cash', 'bank', 'other')),
  reference text check (char_length(reference) <= 40),
  paid_at_claimed timestamptz not null default now(),
  screenshot_path text,
  screenshot_sha256 text,
  ai_extract jsonb,
  checks jsonb not null default '{}',
  status text not null default 'submitted' check (status in ('submitted', 'confirmed', 'rejected', 'needs_info', 'stale')),
  decided_by uuid,
  decided_at timestamptz,
  decision_note text,
  transaction_id uuid references public.transactions (id),
  created_at timestamptz not null default now()
);
alter table public.payment_claims enable row level security;
create index payment_claims_tenant_idx on public.payment_claims (tenant_id, status, created_at desc);
create index payment_claims_member_idx on public.payment_claims (member_id, created_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  member_id uuid not null references public.members (id),
  kind text not null check (kind in ('subscription', 'extension', 'charge', 'deposit', 'deposit_refund')),
  amount_paise bigint not null check (amount_paise > 0),
  paid_on date not null,
  method text not null default 'cash' check (method in ('upi', 'cash', 'bank', 'other')),
  period_start date,
  period_end date,
  charge_id uuid references public.charges (id),
  transaction_id uuid not null references public.transactions (id),
  source text not null default 'manual' check (source in ('manual', 'claim', 'import', 'statement')),
  claim_id uuid references public.payment_claims (id),
  note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid,
  void_reason text,
  check ((kind in ('subscription', 'extension')) = (period_start is not null and period_end is not null))
);
alter table public.payments enable row level security;
create index payments_member_idx on public.payments (tenant_id, member_id, period_end desc) where voided_at is null;
create index payments_tenant_date on public.payments (tenant_id, paid_on desc);
