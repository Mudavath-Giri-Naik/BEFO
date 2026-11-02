-- BEFO · 0009 owner "Today" screen: the 10-second summary, computed in SQL (never by the client or an LLM).

create or replace function public.owner_today(p_tenant uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare t public.tenants; today date; m0 date; money boolean; out jsonb;
begin
  if not public.is_staff(p_tenant) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into t from public.tenants where id = p_tenant;
  today := public.tenant_today(t.timezone);
  m0 := date_trunc('month', today)::date;
  money := public.can_see_money(p_tenant);
  select jsonb_build_object(
    'today', today,
    'collected_month_paise', (select coalesce(sum(amount_paise), 0) from public.payments
                               where tenant_id = p_tenant and voided_at is null and kind in ('subscription', 'extension', 'charge') and paid_on >= m0),
    'members_active', (select count(*) from public.member_overview where tenant_id = p_tenant and sub_status in ('active', 'expiring_soon')),
    'members_total', (select count(*) from public.members where tenant_id = p_tenant and removed_at is null and approval_state = 'approved'
                        and (left_on is null or left_on > today)),
    'expiring_soon', (select count(*) from public.member_overview where tenant_id = p_tenant and sub_status = 'expiring_soon'),
    'overdue', (select count(*) from public.member_overview where tenant_id = p_tenant and sub_status in ('expired', 'no_payment')),
    'pending_paise', (select coalesce(sum(coalesce(pl.price_paise, 0)), 0) from public.member_overview mo
                       left join public.plans pl on pl.id = mo.plan_id
                      where mo.tenant_id = p_tenant and mo.sub_status in ('expired', 'no_payment')),
    'claims_waiting', (select count(*) from public.payment_claims where tenant_id = p_tenant and status in ('submitted', 'needs_info')),
    'requests_waiting', (select count(*) from public.join_requests where tenant_id = p_tenant and status = 'pending'),
    'beds_total', p.beds_total, 'beds_free', p.beds_free, 'availability_updated_at', p.availability_updated_at,
    'listing', p.moderation_status, 'visibility', p.visibility,
    'can_see_money', money,
    'expense_month_paise', case when money then coalesce((select expense_paise from public.finance_month_summary where tenant_id = p_tenant and month = m0), 0) end
  ) into out
  from public.place_profiles p where p.tenant_id = p_tenant;
  return out;
end $$;

-- Owner/manager row actions used by the Members screen.
create or replace function public.update_member(p_member uuid, p_name text default null, p_plan_id uuid default null, p_notes text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.members;
begin
  select * into m from public.members where id = p_member;
  if m.id is null or not public.is_staff(m.tenant_id, array['owner', 'manager']) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_plan_id is not null and not exists (select 1 from public.plans where id = p_plan_id and tenant_id = m.tenant_id) then
    raise exception 'cross_tenant_reference' using errcode = 'P0001';
  end if;
  update public.members set name = coalesce(nullif(btrim(p_name), ''), name), plan_id = coalesce(p_plan_id, plan_id), notes = coalesce(p_notes, notes)
   where id = p_member;
  perform public.write_audit(m.tenant_id, 'update', 'member', p_member::text, jsonb_build_object('name', p_name, 'plan_id', p_plan_id));
end $$;

revoke all on function public.owner_today(uuid), public.update_member(uuid, text, uuid, text) from public, anon;
grant execute on function public.owner_today(uuid), public.update_member(uuid, text, uuid, text) to authenticated;
