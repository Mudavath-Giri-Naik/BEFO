-- BEFO · 0008 Row Level Security policies, storage buckets/policies and grants.
-- Model: anon → only the public API (0007). Authenticated → reads filtered by RLS; writes to
-- configuration tables by owners (and managers where the matrix allows); everything else through
-- security-definer functions that check role + tenant and write audit_log.

create or replace function public.is_member_of(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.tenant_id = t and m.user_id = auth.uid()
                   and m.removed_at is null and m.approval_state = 'approved')
$$;

create or replace function public.my_member_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select id from public.members where user_id = auth.uid()
$$;

-- identity
create policy profiles_own_select on public.profiles for select to authenticated using (user_id = auth.uid());
create policy profiles_own_update on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy platform_admins_self on public.platform_admins for select to authenticated using (user_id = auth.uid());
create policy platform_settings_admin on public.platform_settings for select to authenticated using (public.is_platform_admin());

-- tenancy
create policy tenants_read on public.tenants for select to authenticated using (public.is_staff(id) or public.is_member_of(id));
create policy tenants_owner_update on public.tenants for update to authenticated using (public.is_owner(id)) with check (public.is_owner(id));
create policy tenant_settings_read on public.tenant_settings for select to authenticated using (public.is_staff(tenant_id) or public.is_member_of(tenant_id));
create policy tenant_settings_owner_update on public.tenant_settings for update to authenticated using (public.is_owner(tenant_id)) with check (public.is_owner(tenant_id));
create policy tenant_staff_read on public.tenant_staff for select to authenticated using (public.is_staff(tenant_id) or user_id = auth.uid());
create policy tenant_usage_read on public.tenant_usage for select to authenticated using (public.is_owner(tenant_id));
create policy audit_log_owner on public.audit_log for select to authenticated using (public.is_owner(tenant_id));

-- place profile & photos (owner edits; staff reads)
create policy place_profiles_read on public.place_profiles for select to authenticated using (public.is_staff(tenant_id));
create policy place_profiles_owner_update on public.place_profiles for update to authenticated using (public.is_owner(tenant_id)) with check (public.is_owner(tenant_id));
create policy place_photos_read on public.place_photos for select to authenticated using (public.is_staff(tenant_id));
create policy place_photos_owner_write on public.place_photos for all to authenticated using (public.is_owner(tenant_id)) with check (public.is_owner(tenant_id));
create policy moderation_events_owner on public.moderation_events for select to authenticated using (public.is_owner(tenant_id) or public.is_platform_admin());
create policy place_reports_admin on public.place_reports for select to authenticated using (public.is_platform_admin());

-- rooms (owner configures; staff and residents read)
create policy room_types_read on public.room_types for select to authenticated using (public.is_staff(tenant_id) or public.is_member_of(tenant_id));
create policy room_types_owner_write on public.room_types for all to authenticated using (public.is_owner(tenant_id)) with check (public.is_owner(tenant_id));
create policy floors_read on public.floors for select to authenticated using (public.is_staff(tenant_id) or public.is_member_of(tenant_id));
create policy floors_owner_write on public.floors for all to authenticated using (public.is_owner(tenant_id)) with check (public.is_owner(tenant_id));
create policy rooms_read on public.rooms for select to authenticated using (public.is_staff(tenant_id) or public.is_member_of(tenant_id));
create policy rooms_owner_write on public.rooms for all to authenticated using (public.is_owner(tenant_id)) with check (public.is_owner(tenant_id));
create policy bed_assignments_read on public.bed_assignments for select to authenticated
  using (public.is_staff(tenant_id) or member_id in (select public.my_member_ids()));

-- menu (owner + manager edit; members read)
create policy dishes_read on public.dishes for select to authenticated using (public.is_staff(tenant_id));
create policy dishes_staff_write on public.dishes for all to authenticated
  using (public.is_staff(tenant_id, array['owner', 'manager'])) with check (public.is_staff(tenant_id, array['owner', 'manager']));
create policy menu_templates_read on public.menu_templates for select to authenticated using (public.is_staff(tenant_id) or public.is_member_of(tenant_id));
create policy menu_templates_staff_write on public.menu_templates for all to authenticated
  using (public.is_staff(tenant_id, array['owner', 'manager'])) with check (public.is_staff(tenant_id, array['owner', 'manager']));
create policy menu_overrides_read on public.menu_overrides for select to authenticated using (public.is_staff(tenant_id) or public.is_member_of(tenant_id));
create policy menu_overrides_staff_write on public.menu_overrides for all to authenticated
  using (public.is_staff(tenant_id, array['owner', 'manager'])) with check (public.is_staff(tenant_id, array['owner', 'manager']));

-- people & billing
create policy plans_read on public.plans for select to authenticated using (public.is_staff(tenant_id) or public.is_member_of(tenant_id));
create policy plans_owner_write on public.plans for all to authenticated using (public.is_owner(tenant_id)) with check (public.is_owner(tenant_id));
create policy members_read on public.members for select to authenticated using (public.is_staff(tenant_id) or user_id = auth.uid());
create policy join_requests_read on public.join_requests for select to authenticated using (public.is_staff(tenant_id) or user_id = auth.uid());
create policy field_definitions_read on public.field_definitions for select to authenticated using (public.is_staff(tenant_id) or public.is_member_of(tenant_id));
create policy field_definitions_owner_write on public.field_definitions for all to authenticated using (public.is_owner(tenant_id)) with check (public.is_owner(tenant_id));
create policy notices_read on public.notices for select to authenticated
  using (public.is_staff(tenant_id) or (public.is_member_of(tenant_id) and deleted_at is null and publish_at <= now() and (expires_at is null or expires_at > now())));
create policy notices_staff_write on public.notices for all to authenticated
  using (public.is_staff(tenant_id, array['owner', 'manager'])) with check (public.is_staff(tenant_id, array['owner', 'manager']));
create policy charges_read on public.charges for select to authenticated
  using (public.is_staff(tenant_id) or member_id in (select public.my_member_ids()));
create policy payment_claims_read on public.payment_claims for select to authenticated
  using (public.is_staff(tenant_id) or member_id in (select public.my_member_ids()));
create policy payments_read on public.payments for select to authenticated
  using (public.is_staff(tenant_id) or member_id in (select public.my_member_ids()));

-- finance: owner, or manager with can_see_money
create policy accounts_money on public.accounts for select to authenticated using (public.can_see_money(tenant_id));
create policy accounts_owner_write on public.accounts for all to authenticated using (public.is_owner(tenant_id)) with check (public.is_owner(tenant_id));
create policy categories_money on public.categories for select to authenticated using (public.can_see_money(tenant_id));
create policy categories_owner_write on public.categories for all to authenticated using (public.is_owner(tenant_id)) with check (public.is_owner(tenant_id));
create policy parties_money on public.parties for select to authenticated using (public.can_see_money(tenant_id));
create policy party_aliases_money on public.party_aliases for select to authenticated using (public.can_see_money(tenant_id));
create policy transactions_money on public.transactions for select to authenticated using (public.can_see_money(tenant_id));
create policy finance_summary_money on public.finance_month_summary for select to authenticated using (public.can_see_money(tenant_id));

-- platform
create policy notifications_own on public.notifications for select to authenticated using (user_id = auth.uid());
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notification_prefs_own on public.notification_prefs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy passkeys_own on public.passkeys for select to authenticated using (user_id = auth.uid());
create policy card_unlocks_read on public.card_unlocks for select to authenticated using (user_id = auth.uid() or public.is_staff(tenant_id));
-- deliberately no policies (service role / definer functions only):
--   system_events, rate_limits, member_unique_values, jobs, webauthn_challenges, sms_log

-- ───────────────────────── grants ─────────────────────────

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to authenticated;           -- filtered by RLS
grant insert, update, delete on public.place_photos, public.room_types, public.floors, public.rooms, public.dishes,
  public.menu_templates, public.menu_overrides, public.plans, public.field_definitions, public.notices,
  public.accounts, public.categories, public.push_subscriptions, public.notification_prefs to authenticated;
grant update (full_name, language) on public.profiles to authenticated;
grant update (name, logo_path, brand_color, city, contact_phone, timezone, support_access_until) on public.tenants to authenticated;
grant update (member_label_singular, member_label_plural, modules, join_policy, grace_days, expiring_soon_days, default_language,
  reminder_templates, upi_ids, payment_instructions, weekly_close_day, weekly_close_time) on public.tenant_settings to authenticated;
grant update (headline, about, audience, visibility, address_full, area, landmarks, lat, lng, address_public_level, contact_mode,
  public_phone, rules, rules_structured, amenities, food_info, meal_timings, seat_capacity, cover_photo_id) on public.place_profiles to authenticated;

-- public API (anon + authenticated)
grant select on public.public_place_cards to anon, authenticated;
grant execute on function
  public.search_places(text, text, text, text, text, bigint, bigint, text[], text, boolean, double precision, double precision, double precision, text, int, int),
  public.public_room_types(text), public.public_menu(text, date), public.public_place_detail(text), public.public_join_info(text),
  public.public_place_meta(text), public.public_stats(), public.public_suggest(text), public.public_cities(), public.public_sitemap(),
  public.report_place(text, text, text),
  public._coarse(double precision), public._availability_state(int, timestamptz), public.tenant_today(text)
to anon, authenticated;

-- helpers used inside RLS policies / invoker views
grant execute on function public.is_staff(uuid, text[]), public.is_owner(uuid), public.can_see_money(uuid), public.is_member_of(uuid),
  public.my_member_ids(), public.is_platform_admin(), public.normalize_phone(text), public.mask_phone(text)
to authenticated;

-- signed-in actions (each function checks role + tenant itself)
grant execute on function
  public.verified_phone(), public.my_context(), public.link_my_memberships(), public.slug_available(text),
  public.create_tenant(text, text, text, text, text, text, bigint),
  public.invite_staff(uuid, text, text, boolean), public.remove_staff(uuid),
  public.confirm_availability(uuid), public.assign_bed(uuid, uuid, text, date), public.check_out_member(uuid, date),
  public.submit_for_listing(uuid), public.moderate_listing(uuid, text, text, jsonb), public.admin_set_tenant_status(uuid, text, text),
  public.handle_report(uuid, text),
  public.request_to_join(text, text, boolean, boolean, text, uuid, uuid, date, date), public.withdraw_request(uuid),
  public.decide_join_request(uuid, text, text, uuid, uuid, text, date), public.my_place_private_details(text),
  public.complete_profile(uuid, jsonb, text, boolean), public.add_member(uuid, text, text, uuid, date, jsonb),
  public.set_paused(uuid, boolean), public.remove_member(uuid), public.set_photo_lock(uuid, boolean),
  public.mark_paid(uuid, bigint, date, text, int, text, text), public.void_payment(uuid, text),
  public.submit_payment_claim(uuid, bigint, text, text, timestamptz, text, text),
  public.decide_payment_claim(uuid, text, text, bigint, int), public.mark_notifications_read(uuid[])
to authenticated;
grant select on public.member_overview to authenticated;

-- service role (Edge Functions, scripts) keeps full access
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- ───────────────────────── storage ─────────────────────────
-- Paths always start with the tenant id: {tenant_id}/... (members: {tenant_id}/{member_id}/...).
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
      ('member-photos', 'member-photos', false, 102400, array['image/webp', 'image/jpeg']),
      ('place-photos', 'place-photos', true, 307200, array['image/webp', 'image/jpeg']),
      ('tenant-logos', 'tenant-logos', true, 204800, array['image/webp', 'image/png', 'image/jpeg', 'image/svg+xml']),
      ('captures', 'captures', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
      ('claims', 'claims', false, 1048576, array['image/jpeg', 'image/png', 'image/webp']),
      ('statements', 'statements', false, 10485760, array['text/csv', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
      ('documents', 'documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
    on conflict (id) do nothing;
  end if;
end $$;

create or replace function public._path_tenant(p_name text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return split_part(p_name, '/', 1)::uuid;
exception when others then return null;
end $$;
create or replace function public._path_member(p_name text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return split_part(p_name, '/', 2)::uuid;
exception when others then return null;
end $$;
grant execute on function public._path_tenant(text), public._path_member(text) to authenticated;

do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    -- public buckets: reads are served by the CDN; writes by owners only
    execute $p$create policy befo_place_photos_write on storage.objects for all to authenticated
      using (bucket_id in ('place-photos', 'tenant-logos') and public.is_owner(public._path_tenant(name)))
      with check (bucket_id in ('place-photos', 'tenant-logos') and public.is_owner(public._path_tenant(name)))$p$;
    -- member selfies: the member uploads (until locked); staff and the member read
    execute $p$create policy befo_member_photos_read on storage.objects for select to authenticated
      using (bucket_id in ('member-photos', 'claims') and (public.is_staff(public._path_tenant(name))
             or public._path_member(name) in (select public.my_member_ids())))$p$;
    execute $p$create policy befo_member_photos_insert on storage.objects for insert to authenticated
      with check (bucket_id in ('member-photos', 'claims') and exists (
        select 1 from public.members m where m.id = public._path_member(name) and m.tenant_id = public._path_tenant(name)
          and m.user_id = auth.uid() and m.removed_at is null and (bucket_id = 'claims' or not m.photo_locked)))$p$;
    -- finance files: owner / can_see_money
    execute $p$create policy befo_finance_files on storage.objects for all to authenticated
      using (bucket_id in ('captures', 'statements', 'documents') and public.can_see_money(public._path_tenant(name)))
      with check (bucket_id in ('captures', 'statements', 'documents') and public.can_see_money(public._path_tenant(name)))$p$;
  end if;
end $$;

-- Postgres grants EXECUTE to PUBLIC on every new function by default, and a per-schema default
-- privilege cannot take that away. Remove it globally for functions created by this role, and
-- re-check anything created above. Every later migration must grant explicitly (schema lint checks).
alter default privileges revoke execute on functions from public;
revoke execute on function public._path_tenant(text), public._path_member(text) from public, anon;
