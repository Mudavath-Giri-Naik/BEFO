-- BEFO · 0007 public marketplace API. anon can ONLY use what is in this file.
-- Every output has an explicit column list. Only approved + listed places of open tenants are visible.
-- area_only places expose a coordinate coarsened to a ~300 m grid and no street address.

create or replace function public._coarse(v double precision) returns double precision
language sql immutable set search_path = '' as $$
  select round((v / 0.003)::numeric) * 0.003
$$;

create or replace function public._availability_state(total int, updated timestamptz) returns text
language sql stable set search_path = '' as $$
  select case
    when total is null then 'none'
    when updated is null or updated < now() - make_interval(days => coalesce(
      (select (value #>> '{}')::int from public.platform_settings where key = 'availability_stale_days'), 14)) then 'ask'
    else 'live' end
$$;

-- The one allow-listed security-definer view (schema lint knows about it).
create view public.public_place_cards with (security_invoker = false) as
select
  t.slug, t.name, t.business_type, t.city,
  p.audience, p.area, p.headline, p.amenities,
  p.food_info ->> 'veg_type' as veg_type,
  p.min_price_paise,
  case when public._availability_state(p.beds_total, p.availability_updated_at) = 'live' then p.beds_free end as beds_free,
  case public._availability_state(p.beds_total, p.availability_updated_at)
    when 'none' then 'none' when 'ask' then 'ask'
    else case when p.beds_free > 0 then 'free' else 'full' end end as availability,
  case when public._availability_state(p.beds_total, p.availability_updated_at) = 'live' then p.availability_updated_at end as availability_updated_at,
  p.verified_level = 'verified' as verified,
  coalesce((select ph.path from public.place_photos ph where ph.id = p.cover_photo_id and ph.tenant_id = t.id),
           (select ph.path from public.place_photos ph where ph.tenant_id = t.id order by ph.sort, ph.created_at limit 1)) as cover_path,
  case when p.address_public_level = 'full' then p.lat else public._coarse(p.lat) end as lat,
  case when p.address_public_level = 'full' then p.lng else public._coarse(p.lng) end as lng,
  p.updated_at
from public.tenants t
join public.place_profiles p on p.tenant_id = t.id
where p.moderation_status = 'approved' and p.visibility = 'listed' and t.status in ('trial', 'active');

create or replace function public.search_places(
  p_q text default null, p_type text default null, p_audience text default null, p_city text default null,
  p_area text default null, p_min_price bigint default null, p_max_price bigint default null,
  p_amenities text[] default null, p_veg text default null, p_only_available boolean default false,
  p_lat double precision default null, p_lng double precision default null, p_radius_km double precision default null,
  p_sort text default 'relevance', p_cursor int default 0, p_limit int default 20
) returns table (
  slug text, name text, business_type text, city text, audience text, area text, headline text, amenities text[],
  veg_type text, min_price_paise bigint, beds_free int, availability text, availability_updated_at timestamptz,
  verified boolean, cover_path text, lat double precision, lng double precision, distance_km double precision, next_cursor int
)
language plpgsql stable security definer set search_path = '' as $$
declare lim int := least(greatest(coalesce(p_limit, 20), 1), 24);
declare off int := greatest(coalesce(p_cursor, 0), 0);
declare q text := nullif(btrim(p_q), '');
declare origin extensions.geography := case when p_lat is not null and p_lng is not null
  then extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography end;
begin
  return query
  with base as (
    select c.*,
      case when origin is null or c.lat is null then null
        else round((extensions.st_distance(origin, extensions.st_setsrid(extensions.st_makepoint(c.lng, c.lat), 4326)::extensions.geography) / 1000)::numeric, 1)::double precision end as dist,
      (case when q is null then 0 else
        ts_rank(pp.search, websearch_to_tsquery('simple', q))
        + extensions.word_similarity(lower(q), lower(c.name || ' ' || c.area || ' ' || c.city)) end) as rank
    from public.public_place_cards c
    join public.tenants t on t.slug = c.slug
    join public.place_profiles pp on pp.tenant_id = t.id
    where (p_type is null or c.business_type = p_type)
      and (p_audience is null or c.audience = p_audience or (p_audience in ('boys', 'girls') and c.audience = 'any'))
      and (p_city is null or lower(c.city) = lower(p_city))
      and (p_area is null or extensions.word_similarity(lower(p_area), lower(c.area)) > 0.4)
      and (p_min_price is null or c.min_price_paise >= p_min_price)
      and (p_max_price is null or c.min_price_paise <= p_max_price)
      and (p_amenities is null or c.amenities @> p_amenities)
      and (p_veg is null or (p_veg = 'veg' and c.veg_type = 'veg') or (p_veg = 'nonveg' and c.veg_type in ('nonveg', 'both')))
      and (not coalesce(p_only_available, false) or c.availability = 'free')
      and (q is null or pp.search @@ websearch_to_tsquery('simple', q)
           or extensions.word_similarity(lower(q), lower(c.name || ' ' || c.area || ' ' || c.city)) > 0.35)
  )
  select b.slug, b.name, b.business_type, b.city, b.audience, b.area, b.headline, b.amenities, b.veg_type, b.min_price_paise,
         b.beds_free, b.availability, b.availability_updated_at, b.verified, b.cover_path, b.lat, b.lng, b.dist,
         case when count(*) over () > off + lim then off + lim end
    from base b
   where (p_radius_km is null or b.dist is null or b.dist <= p_radius_km)
   order by
     case when p_sort = 'nearest' then b.dist end asc nulls last,
     case when p_sort = 'price_asc' then b.min_price_paise end asc nulls last,
     case when p_sort = 'beds_free' then b.beds_free end desc nulls last,
     case when p_sort = 'recent' then b.updated_at end desc,
     b.rank desc, b.verified desc, (b.availability = 'free') desc, b.updated_at desc, b.slug
   offset off limit lim;
end $$;

create or replace function public.public_room_types(p_slug text)
returns table (id uuid, name text, beds_per_room int, ac boolean, attached_bath boolean, monthly_price_paise bigint,
               deposit_paise bigint, description text, beds_total int, beds_free int)
language sql stable security definer set search_path = '' as $$
  select rt.id, rt.name, rt.beds_per_room, rt.ac, rt.attached_bath, rt.monthly_price_paise, rt.deposit_paise, rt.description,
    case when public._availability_state(p.beds_total, p.availability_updated_at) = 'live' then cap.total end,
    case when public._availability_state(p.beds_total, p.availability_updated_at) = 'live' then greatest(cap.total - cap.used, 0) end
  from public.public_place_cards c
  join public.tenants t on t.slug = c.slug
  join public.place_profiles p on p.tenant_id = t.id
  join public.room_types rt on rt.tenant_id = t.id and rt.active
  left join lateral (
    select sum(r.capacity - r.blocked_beds)::int as total,
           (select count(*)::int from public.bed_assignments b join public.rooms r2 on r2.id = b.room_id
             where r2.room_type_id = rt.id and r2.active and b.to_date is null) as used
      from public.rooms r where r.room_type_id = rt.id and r.active
  ) cap on true
  where c.slug = p_slug
  order by rt.sort, rt.monthly_price_paise
$$;

create or replace function public.public_menu(p_slug text, p_date date default null) returns jsonb
language sql stable security definer set search_path = '' as $$
  with t as (
    select x.id, coalesce(p_date, public.tenant_today(x.timezone)) as d
      from public.tenants x
     where x.slug = p_slug and exists (select 1 from public.public_place_cards c where c.slug = p_slug)
  ),
  meals as (select unnest(array['breakfast', 'lunch', 'snacks', 'dinner']) as meal, generate_series(1, 4) as ord)
  select case when not exists (select 1 from t) then null else jsonb_build_object(
    'date', (select d from t),
    'meals', coalesce((
      select jsonb_agg(jsonb_build_object(
               'meal', ml.meal,
               'items', coalesce(o.items, mt.items),
               'closed', coalesce(o.closed, false),
               'note', o.note,
               'veg_type', mt.veg_type,
               'special', o.id is not null) order by ml.ord)
        from meals ml cross join t
        left join public.menu_templates mt on mt.tenant_id = t.id and mt.meal = ml.meal and mt.weekday = extract(dow from t.d)::int
        left join public.menu_overrides o on o.tenant_id = t.id and o.meal = ml.meal and o.date = t.d
       where mt.id is not null or o.id is not null), '[]')) end
$$;

create or replace function public.public_place_detail(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'slug', c.slug, 'name', c.name, 'business_type', c.business_type, 'city', c.city, 'area', c.area,
    'audience', c.audience, 'headline', c.headline, 'about', p.about, 'amenities', c.amenities,
    'landmarks', p.landmarks, 'rules', p.rules, 'rules_structured', p.rules_structured,
    'food_info', p.food_info, 'meal_timings', p.meal_timings,
    'verified', c.verified, 'verified_at', p.verified_at,
    'min_price_paise', c.min_price_paise, 'beds_free', c.beds_free, 'availability', c.availability,
    'availability_updated_at', c.availability_updated_at,
    'address_public_level', p.address_public_level,
    'address', case when p.address_public_level = 'full' then p.address_full end,
    'lat', c.lat, 'lng', c.lng,
    'phone', case when p.contact_mode = 'show_phone' then p.public_phone end,
    'brand_color', t.brand_color, 'logo_path', t.logo_path,
    'updated_at', p.updated_at,
    'photos', coalesce((select jsonb_agg(jsonb_build_object('path', ph.path, 'alt', ph.alt, 'kind', ph.kind) order by ph.sort, ph.created_at)
                          from public.place_photos ph where ph.tenant_id = t.id), '[]'),
    'plans', coalesce((select jsonb_agg(jsonb_build_object('id', pl.id, 'name', pl.name, 'price_paise', pl.price_paise,
                          'period_unit', pl.period_unit, 'period_count', pl.period_count, 'description', pl.description) order by pl.sort, pl.price_paise)
                        from public.plans pl where pl.tenant_id = t.id and pl.public and pl.archived_at is null), '[]'),
    'room_types', coalesce((select jsonb_agg(to_jsonb(r)) from public.public_room_types(p_slug) r), '[]'),
    'menu_today', public.public_menu(p_slug, null),
    'menu_week', coalesce((select jsonb_agg(jsonb_build_object('weekday', mt.weekday, 'meal', mt.meal, 'items', mt.items, 'veg_type', mt.veg_type)
                              order by mt.weekday, array_position(array['breakfast', 'lunch', 'snacks', 'dinner'], mt.meal))
                            from public.menu_templates mt where mt.tenant_id = t.id), '[]'))
  from public.public_place_cards c
  join public.tenants t on t.slug = c.slug
  join public.place_profiles p on p.tenant_id = t.id
  where c.slug = p_slug
$$;

-- Minimal info for the QR join page; works for private (unlisted) places of open tenants too.
create or replace function public.public_join_info(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'slug', t.slug, 'name', t.name, 'business_type', t.business_type, 'audience', p.audience, 'area', p.area, 'city', t.city,
    'brand_color', t.brand_color,
    'listed', p.moderation_status = 'approved' and p.visibility = 'listed',
    'room_types', coalesce((select jsonb_agg(jsonb_build_object('id', rt.id, 'name', rt.name, 'monthly_price_paise', rt.monthly_price_paise) order by rt.sort)
                             from public.room_types rt where rt.tenant_id = t.id and rt.active), '[]'),
    'plans', coalesce((select jsonb_agg(jsonb_build_object('id', pl.id, 'name', pl.name, 'price_paise', pl.price_paise) order by pl.sort)
                        from public.plans pl where pl.tenant_id = t.id and pl.public and pl.archived_at is null), '[]'))
  from public.tenants t join public.place_profiles p on p.tenant_id = t.id
  where t.slug = p_slug and t.status in ('trial', 'active') and p.moderation_status <> 'suspended'
$$;

create or replace function public.public_place_meta(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'slug', c.slug, 'name', c.name, 'business_type', c.business_type, 'city', c.city, 'area', c.area,
    'title', c.name || ' · ' || case c.business_type when 'hostel' then
        case c.audience when 'boys' then 'Boys hostel' when 'girls' then 'Girls hostel' when 'coed' then 'Co-living' else 'Hostel' end
      when 'mess' then 'Mess' when 'tiffin' then 'Tiffin service' else 'Place' end || ' in ' || coalesce(nullif(c.area, ''), c.city),
    'description', coalesce(c.headline, '') ||
      case when c.min_price_paise is not null then ' From ₹' || (c.min_price_paise / 100)::text || '/month.' else '' end ||
      case c.availability when 'free' then ' ' || c.beds_free || ' beds free now.' else '' end,
    'image_path', c.cover_path, 'lat', c.lat, 'lng', c.lng, 'min_price_paise', c.min_price_paise,
    'schema_type', case when c.business_type in ('mess', 'tiffin') then 'FoodEstablishment' else 'LodgingBusiness' end,
    'updated_at', c.updated_at)
  from public.public_place_cards c where c.slug = p_slug
$$;

create or replace function public.public_stats() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'places', count(*),
    'beds_free', coalesce(sum(beds_free) filter (where availability = 'free'), 0),
    'cities', count(distinct lower(city)),
    'messes', count(*) filter (where business_type in ('mess', 'tiffin')),
    'hostels', count(*) filter (where business_type = 'hostel'))
  from public.public_place_cards
$$;

create or replace function public.public_suggest(p_q text) returns table (label text, kind text, city text)
language sql stable security definer set search_path = '' as $$
  with src as (
    select distinct c.city as label, 'city' as kind, c.city from public.public_place_cards c where c.city <> ''
    union select distinct c.area, 'area', c.city from public.public_place_cards c where c.area <> ''
    union select distinct lm, 'landmark', c.city from public.public_place_cards c
      join public.tenants t on t.slug = c.slug join public.place_profiles p on p.tenant_id = t.id,
      jsonb_array_elements_text(p.landmarks) lm
  )
  select s.label, s.kind, s.city from src s
   where char_length(coalesce(p_q, '')) >= 2
     and (s.label ilike '%' || replace(replace(p_q, '%', ''), '_', '') || '%' or extensions.word_similarity(lower(p_q), lower(s.label)) > 0.4)
   order by (s.label ilike replace(replace(p_q, '%', ''), '_', '') || '%') desc, extensions.word_similarity(lower(p_q), lower(s.label)) desc, s.label
   limit 8
$$;

create or replace function public.public_cities() returns table (city text, places bigint, hostels bigint, messes bigint, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.city, count(*), count(*) filter (where c.business_type = 'hostel'),
         count(*) filter (where c.business_type in ('mess', 'tiffin')), max(c.updated_at)
    from public.public_place_cards c where c.city <> '' group by c.city order by count(*) desc
$$;

create or replace function public.public_sitemap() returns table (path text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select '/p/' || slug, updated_at from public.public_place_cards
  union all
  select '/c/' || lower(replace(city, ' ', '-')), max(updated_at) from public.public_place_cards where city <> '' group by city
$$;
