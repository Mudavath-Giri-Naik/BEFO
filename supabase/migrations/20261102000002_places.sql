-- BEFO · 0002 public place profile (marketplace), rooms and beds, menus, moderation.

create table public.place_profiles (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  headline text check (char_length(headline) <= 140),
  about text check (char_length(about) <= 3000),
  audience text not null default 'any' check (audience in ('boys', 'girls', 'coed', 'any')),
  visibility text not null default 'private' check (visibility in ('private', 'listed')),
  moderation_status text not null default 'draft'
    check (moderation_status in ('draft', 'pending', 'approved', 'rejected', 'suspended')),
  moderation_note text,
  verified_level text not null default 'none' check (verified_level in ('none', 'verified')),
  verified_at timestamptz,
  verified_by uuid,
  address_full text check (char_length(address_full) <= 400),
  area text not null default '' check (char_length(area) <= 80),
  landmarks jsonb not null default '[]',          -- ["MVGR College", "Chintalavalasa"]
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  geog extensions.geography(point, 4326)
    generated always as (
      case when lat is not null and lng is not null
        then extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography end) stored,
  address_public_level text not null default 'area_only' check (address_public_level in ('area_only', 'full')),
  contact_mode text not null default 'request_only' check (contact_mode in ('request_only', 'show_phone')),
  public_phone text check (public_phone is null or public_phone ~ '^\+91[6-9][0-9]{9}$'),
  rules text check (char_length(rules) <= 3000),
  rules_structured jsonb not null default '{}',   -- {curfew:"22:00", visitors:"...", notice_days:30}
  amenities text[] not null default '{}',
  food_info jsonb not null default '{}',          -- {veg_type:"veg|nonveg|both", meals:["breakfast",...]}
  meal_timings jsonb not null default '{}',       -- {breakfast:"07:30-09:30", ...}
  seat_capacity int check (seat_capacity is null or seat_capacity > 0), -- mess "seats"
  cover_photo_id uuid,
  availability_updated_at timestamptz,
  min_price_paise bigint check (min_price_paise is null or min_price_paise >= 0),
  beds_total int,
  beds_free int,
  search tsvector,
  submitted_at timestamptz,
  approved_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.place_profiles enable row level security;
create index place_profiles_public_idx on public.place_profiles (moderation_status, visibility);
create index place_profiles_geog_idx on public.place_profiles using gist (geog);
create index place_profiles_search_idx on public.place_profiles using gin (search);
create index place_profiles_area_trgm on public.place_profiles using gin (area extensions.gin_trgm_ops);
create index place_profiles_amenities_idx on public.place_profiles using gin (amenities);
create index place_profiles_price_idx on public.place_profiles (min_price_paise);
create trigger place_profiles_updated before update on public.place_profiles for each row execute function public.set_updated_at();

-- Owners edit their profile directly (RLS), but moderation/verification/cached fields are protected.
create or replace function public.place_profiles_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public._trusted() then return new; end if;
  if tg_op = 'UPDATE' then
    if new.moderation_status is distinct from old.moderation_status
       or new.moderation_note is distinct from old.moderation_note
       or new.verified_level is distinct from old.verified_level
       or new.verified_at is distinct from old.verified_at
       or new.verified_by is distinct from old.verified_by
       or new.submitted_at is distinct from old.submitted_at
       or new.approved_at is distinct from old.approved_at
       or new.beds_total is distinct from old.beds_total
       or new.beds_free is distinct from old.beds_free
       or new.min_price_paise is distinct from old.min_price_paise
       or new.availability_updated_at is distinct from old.availability_updated_at then
      raise exception 'protected_column' using errcode = 'P0001',
        hint = 'Use Submit for listing or the availability check instead.';
    end if;
  end if;
  return new;
end $$;
create trigger place_profiles_guard before update on public.place_profiles for each row execute function public.place_profiles_guard();
create trigger place_profiles_tid before update on public.place_profiles for each row execute function public.tenant_id_immutable();

create table public.place_photos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  path text not null,
  sort int not null default 0,
  alt text check (char_length(alt) <= 140),
  kind text not null default 'other' check (kind in ('room', 'common', 'food', 'building', 'other')),
  created_at timestamptz not null default now()
);
alter table public.place_photos enable row level security;
create index place_photos_tenant_idx on public.place_photos (tenant_id, sort);
create trigger place_photos_tid before update on public.place_photos for each row execute function public.tenant_id_immutable();

create or replace function public.place_photos_cap() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.place_photos p where p.tenant_id = new.tenant_id) >= 12 then
    raise exception 'photo_limit' using errcode = 'P0001', hint = 'A place can have at most 12 photos.';
  end if;
  return new;
end $$;
create trigger place_photos_cap before insert on public.place_photos for each row execute function public.place_photos_cap();

create table public.room_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  beds_per_room int not null default 1 check (beds_per_room between 1 and 40),
  ac boolean not null default false,
  attached_bath boolean not null default false,
  monthly_price_paise bigint not null check (monthly_price_paise >= 0),
  deposit_paise bigint not null default 0 check (deposit_paise >= 0),
  description text check (char_length(description) <= 600),
  photo_ids uuid[] not null default '{}',
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.room_types enable row level security;
create index room_types_tenant_idx on public.room_types (tenant_id, sort);
create trigger room_types_tid before update on public.room_types for each row execute function public.tenant_id_immutable();

create table public.floors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  sort int not null default 0
);
alter table public.floors enable row level security;
create index floors_tenant_idx on public.floors (tenant_id, sort);
create trigger floors_tid before update on public.floors for each row execute function public.tenant_id_immutable();

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  floor_id uuid references public.floors (id) on delete set null,
  label text not null check (char_length(label) between 1 and 40),
  room_type_id uuid references public.room_types (id),
  capacity int not null check (capacity between 1 and 40),
  blocked_beds int not null default 0 check (blocked_beds >= 0),
  active boolean not null default true,
  notes text,
  check (blocked_beds <= capacity),
  unique (tenant_id, label)
);
alter table public.rooms enable row level security;
create index rooms_tenant_idx on public.rooms (tenant_id, room_type_id);
create trigger rooms_tid before update on public.rooms for each row execute function public.tenant_id_immutable();

-- Rooms/room types must belong to the same tenant as the row that references them.
create or replace function public.rooms_same_tenant() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.room_type_id is not null and not exists (select 1 from public.room_types rt where rt.id = new.room_type_id and rt.tenant_id = new.tenant_id) then
    raise exception 'cross_tenant_reference' using errcode = 'P0001';
  end if;
  if new.floor_id is not null and not exists (select 1 from public.floors f where f.id = new.floor_id and f.tenant_id = new.tenant_id) then
    raise exception 'cross_tenant_reference' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger rooms_same_tenant before insert or update on public.rooms for each row execute function public.rooms_same_tenant();

create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  name_te text,
  veg_type text not null default 'veg' check (veg_type in ('veg', 'egg', 'nonveg')),
  unique (tenant_id, name)
);
alter table public.dishes enable row level security;
create trigger dishes_tid before update on public.dishes for each row execute function public.tenant_id_immutable();

create table public.menu_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  meal text not null check (meal in ('breakfast', 'lunch', 'snacks', 'dinner')),
  weekday int not null check (weekday between 0 and 6),
  items text[] not null default '{}',
  veg_type text not null default 'veg' check (veg_type in ('veg', 'egg', 'nonveg', 'mixed')),
  notes text,
  unique (tenant_id, meal, weekday)
);
alter table public.menu_templates enable row level security;
create trigger menu_templates_tid before update on public.menu_templates for each row execute function public.tenant_id_immutable();

create table public.menu_overrides (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'snacks', 'dinner')),
  items text[] not null default '{}',
  closed boolean not null default false,
  note text,
  unique (tenant_id, date, meal)
);
alter table public.menu_overrides enable row level security;
create trigger menu_overrides_tid before update on public.menu_overrides for each row execute function public.tenant_id_immutable();

create table public.place_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  reason text not null check (reason in ('fake', 'wrong_price', 'wrong_availability', 'unsafe', 'scam', 'privacy', 'offensive', 'other')),
  details text check (char_length(details) <= 1000),
  reporter uuid,
  status text not null default 'open' check (status in ('open', 'dismissed', 'warned', 'suspended')),
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.place_reports enable row level security;
create index place_reports_status_idx on public.place_reports (status, created_at desc);

create table public.moderation_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  actor uuid,
  from_status text,
  to_status text not null,
  note text,
  checklist jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.moderation_events enable row level security;
create index moderation_events_tenant_idx on public.moderation_events (tenant_id, created_at desc);

-- Search document (trigger-maintained; array_to_string is not immutable so no generated column).
create or replace function public.place_profiles_search() returns trigger
language plpgsql set search_path = '' as $$
declare t record;
begin
  select name, city, business_type into t from public.tenants where id = new.tenant_id;
  new.search :=
    setweight(to_tsvector('simple', coalesce(t.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.area, '') || ' ' || coalesce(t.city, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce((select string_agg(x, ' ') from jsonb_array_elements_text(new.landmarks) x), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.headline, '') || ' ' || array_to_string(new.amenities, ' ') || ' ' || coalesce(t.business_type, '')), 'C');
  return new;
end $$;
create trigger place_profiles_search before insert or update on public.place_profiles for each row execute function public.place_profiles_search();
