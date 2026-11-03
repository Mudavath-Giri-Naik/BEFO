-- BEFO · 0010 fixes from the hosted Supabase advisors.

-- Security (security_definer_view): public_place_cards was a definer view readable by anon. Nobody reads it
-- directly; only the security definer public API functions do, and inside them an invoker view runs as the
-- function owner, so results are unchanged. Clients now go through the functions only.
alter view public.public_place_cards set (security_invoker = true);
revoke all on public.public_place_cards from anon, authenticated;

-- Performance (auth_rls_initplan): evaluate auth.uid() once per statement, not once per row.
alter policy profiles_own_select on public.profiles using (user_id = (select auth.uid()));
alter policy profiles_own_update on public.profiles using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy platform_admins_self on public.platform_admins using (user_id = (select auth.uid()));
alter policy tenant_staff_read on public.tenant_staff using (public.is_staff(tenant_id) or user_id = (select auth.uid()));
alter policy members_read on public.members using (public.is_staff(tenant_id) or user_id = (select auth.uid()));
alter policy join_requests_read on public.join_requests using (public.is_staff(tenant_id) or user_id = (select auth.uid()));
alter policy notifications_own on public.notifications using (user_id = (select auth.uid()));
alter policy push_subscriptions_own on public.push_subscriptions using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy notification_prefs_own on public.notification_prefs using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy passkeys_own on public.passkeys using (user_id = (select auth.uid()));
alter policy card_unlocks_read on public.card_unlocks using (user_id = (select auth.uid()) or public.is_staff(tenant_id));
