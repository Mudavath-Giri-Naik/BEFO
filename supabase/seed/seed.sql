-- BEFO dev seed: 3 demo tenants (mess, boys hostel, girls hostel) + 2 "other tenant" fixtures for
-- isolation tests. All names/numbers are fictional. Runs as the database owner (supabase db reset).
-- Fixed UUIDs so tests can refer to them. Tenant #1 (the real pilot) is created with scripts/create-tenant.ts.

select public._trust();

-- ── people (auth users). Phone numbers use the reserved-looking 9000000xxx range.
insert into auth.users (id, email, phone, phone_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-4000-a000-000000000001', 'owner.mess@example.com',   '919000000001', now(), '{"full_name":"Ravi Kumar"}'),
  ('00000000-0000-4000-a000-000000000002', 'owner.boys@example.com',   '919000000002', now(), '{"full_name":"Suresh Naidu"}'),
  ('00000000-0000-4000-a000-000000000003', 'owner.girls@example.com',  '919000000003', now(), '{"full_name":"Padma Rao"}'),
  ('00000000-0000-4000-a000-000000000004', 'owner.a@example.com',      '919000000004', now(), '{"full_name":"Other Owner A"}'),
  ('00000000-0000-4000-a000-000000000005', 'owner.b@example.com',      '919000000005', now(), '{"full_name":"Other Owner B"}'),
  ('00000000-0000-4000-a000-000000000006', 'manager.boys@example.com', '919000000006', now(), '{"full_name":"Kiran (manager)"}'),
  ('00000000-0000-4000-a000-000000000007', 'multi@example.com',        '919000000007', now(), '{"full_name":"Anil Varma"}'),
  ('00000000-0000-4000-a000-000000000008', 'student.girl@example.com', '919000000008', now(), '{"full_name":"Sravani P"}'),
  ('00000000-0000-4000-a000-000000000009', 'outsider@example.com',     '919000000009', now(), '{"full_name":"New Visitor"}'),
  ('00000000-0000-4000-a000-000000000010', 'nophone@example.com',      null,           null,  '{"full_name":"Google Only"}'),
  ('00000000-0000-4000-a000-000000000011', 'admin@example.com',        '919000000011', now(), '{"full_name":"Platform Admin"}');
insert into public.platform_admins (user_id) values ('00000000-0000-4000-a000-000000000011');

-- ── tenants
insert into public.tenants (id, slug, name, business_type, status, city, contact_phone, created_by, is_demo, max_members) values
  ('10000000-0000-4000-a000-000000000001', 'annapurna-mess', 'Annapurna Mess', 'mess', 'active', 'Vizianagaram', '+919000000001', '00000000-0000-4000-a000-000000000001', true, 300),
  ('10000000-0000-4000-a000-000000000002', 'sai-krishna-boys-hostel', 'Sai Krishna Boys Hostel', 'hostel', 'active', 'Vizianagaram', '+919000000002', '00000000-0000-4000-a000-000000000002', true, 100),
  ('10000000-0000-4000-a000-000000000003', 'sri-lakshmi-ladies-hostel', 'Sri Lakshmi Ladies Hostel', 'hostel', 'active', 'Visakhapatnam', '+919000000003', '00000000-0000-4000-a000-000000000003', true, 100),
  ('10000000-0000-4000-a000-000000000004', 'other-a', 'Other Tenant A', 'mess', 'active', 'Vizianagaram', '+919000000004', '00000000-0000-4000-a000-000000000004', true, 100),
  ('10000000-0000-4000-a000-000000000005', 'other-b', 'Other Tenant B', 'hostel', 'trial', 'Visakhapatnam', '+919000000005', '00000000-0000-4000-a000-000000000005', true, 100);
insert into public.tenant_settings (tenant_id) select id from public.tenants;
insert into public.tenant_usage (tenant_id) select id from public.tenants;
select public.apply_preset(id, business_type) from public.tenants;
update public.tenant_settings set upi_ids = '[{"vpa":"annapurnamess@okaxis","label":"Ravi (Axis)","default":true}]',
  payment_instructions = 'Pay to the UPI ID and write your member code in the note.' where tenant_id = '10000000-0000-4000-a000-000000000001';
update public.tenant_settings set upi_ids = '[{"vpa":"saikrishnahostel@ybl","label":"PhonePe","default":true}]' where tenant_id = '10000000-0000-4000-a000-000000000002';
update public.tenant_settings set upi_ids = '[{"vpa":"srilakshmihostel@oksbi","label":"SBI","default":true}]' where tenant_id = '10000000-0000-4000-a000-000000000003';

insert into public.tenant_staff (tenant_id, phone, user_id, role, can_see_money) values
  ('10000000-0000-4000-a000-000000000001', '+919000000001', '00000000-0000-4000-a000-000000000001', 'owner', true),
  ('10000000-0000-4000-a000-000000000002', '+919000000002', '00000000-0000-4000-a000-000000000002', 'owner', true),
  ('10000000-0000-4000-a000-000000000002', '+919000000006', '00000000-0000-4000-a000-000000000006', 'manager', false),
  ('10000000-0000-4000-a000-000000000003', '+919000000003', '00000000-0000-4000-a000-000000000003', 'owner', true),
  ('10000000-0000-4000-a000-000000000004', '+919000000004', '00000000-0000-4000-a000-000000000004', 'owner', true),
  ('10000000-0000-4000-a000-000000000005', '+919000000005', '00000000-0000-4000-a000-000000000005', 'owner', true),
  ('10000000-0000-4000-a000-000000000005', '+919000000007', '00000000-0000-4000-a000-000000000007', 'manager', false); -- multi-role person

-- ── place profiles
insert into public.place_profiles (tenant_id, headline, about, audience, visibility, moderation_status, verified_level, verified_at,
  address_full, area, landmarks, lat, lng, address_public_level, contact_mode, public_phone, rules, rules_structured, amenities,
  food_info, meal_timings, seat_capacity, approved_at) values
  ('10000000-0000-4000-a000-000000000001', 'Home-style veg & non-veg meals, 3 times a day, near MVGR',
   'Family-run mess serving students since 2012. Unlimited rice and curry at lunch. Sunday special biryani.',
   'any', 'listed', 'approved', 'verified', now() - interval '20 days',
   'Door 4-12, Main Road, Chintalavalasa, Vizianagaram 535005', 'Chintalavalasa', '["MVGR College", "Chintalavalasa bus stop"]',
   18.0602, 83.4050, 'full', 'show_phone', '+919000000001',
   'Monthly plan starts on the day you pay. Show your ID card at the counter.', '{"notice_days": 0}',
   array['ro_water', 'power_backup', 'parking'], '{"veg_type":"both","meals":["breakfast","lunch","dinner"]}',
   '{"breakfast":"07:30-09:30","lunch":"12:30-14:30","dinner":"19:30-21:30"}', 300, now() - interval '30 days'),
  ('10000000-0000-4000-a000-000000000002', 'Clean rooms, Wi-Fi and food, 5 minutes from MVGR',
   'Two floors of 2- and 3-sharing rooms with attached bathrooms. Food included: breakfast and dinner.',
   'boys', 'listed', 'approved', 'none', null,
   'Plot 21, Behind SBI, Chintalavalasa, Vizianagaram 535005', 'Chintalavalasa', '["MVGR College"]',
   18.0631, 83.4021, 'full', 'request_only', null,
   'Gate closes 22:30. Visitors in the lobby only. One month notice before leaving.',
   '{"curfew":"22:30","visitors":"Lobby only","notice_days":30}',
   array['wifi', 'geyser', 'laundry', 'cctv', 'power_backup', 'ro_water'], '{"veg_type":"both","meals":["breakfast","dinner"]}',
   '{"breakfast":"07:00-09:00","dinner":"19:30-21:30"}', null, now() - interval '15 days'),
  ('10000000-0000-4000-a000-000000000003', 'Safe ladies hostel with a warden, near Madhurawada IT park',
   'Biometric entry, CCTV in common areas, a resident warden and home food. AC and non-AC rooms.',
   'girls', 'listed', 'approved', 'verified', now() - interval '5 days',
   'Flat 3, Sai Residency, Madhurawada, Visakhapatnam 530048', 'Madhurawada', '["IT SEZ", "Madhurawada bus stop"]',
   17.8188, 83.3530, 'area_only', 'request_only', null,
   'Gate closes 21:00. No male visitors beyond the reception. Leave register at the desk.',
   '{"curfew":"21:00","visitors":"Reception only","notice_days":30}',
   array['wifi', 'ac', 'geyser', 'cctv', 'housekeeping', 'laundry', 'power_backup', 'ro_water', 'lift'],
   '{"veg_type":"veg","meals":["breakfast","lunch","dinner"]}', '{"breakfast":"07:30-09:00","dinner":"19:30-21:00"}', null, now() - interval '10 days'),
  ('10000000-0000-4000-a000-000000000004', 'Other A', null, 'any', 'private', 'draft', 'none', null,
   'Secret address A', 'Area A', '[]', 18.1, 83.4, 'area_only', 'request_only', null, null, '{}', '{}', '{}', '{}', 50, null),
  ('10000000-0000-4000-a000-000000000005', 'Other B pending', null, 'coed', 'listed', 'pending', 'none', null,
   'Secret address B', 'Area B', '[]', 17.7, 83.3, 'area_only', 'request_only', null, null, '{}', '{}', '{}', '{}', null, null);

insert into public.place_photos (tenant_id, path, sort, alt, kind) values
  ('10000000-0000-4000-a000-000000000001', 'demo/mess-hall.webp', 0, 'Dining hall with steel tables', 'food'),
  ('10000000-0000-4000-a000-000000000001', 'demo/mess-thali.webp', 1, 'Lunch thali', 'food'),
  ('10000000-0000-4000-a000-000000000002', 'demo/boys-room.webp', 0, '3-sharing room', 'room'),
  ('10000000-0000-4000-a000-000000000002', 'demo/boys-building.webp', 1, 'Hostel building', 'building'),
  ('10000000-0000-4000-a000-000000000003', 'demo/girls-room.webp', 0, '2-sharing AC room', 'room'),
  ('10000000-0000-4000-a000-000000000003', 'demo/girls-common.webp', 1, 'Common area', 'common');

-- ── plans
insert into public.plans (id, tenant_id, name, price_paise, due_rule, is_default, public, description) values
  ('20000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'Monthly mess (3 meals)', 300000, 'from_payment_date', true, true, 'Breakfast, lunch and dinner'),
  ('20000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', 'Lunch + dinner', 240000, 'from_payment_date', false, true, null),
  ('20000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000002', 'Monthly rent', 650000, 'from_previous_due', true, false, null),
  ('20000000-0000-4000-a000-000000000004', '10000000-0000-4000-a000-000000000003', 'Monthly rent', 800000, 'from_previous_due', true, false, null),
  ('20000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000004', 'Monthly', 280000, 'from_payment_date', true, true, null),
  ('20000000-0000-4000-a000-000000000006', '10000000-0000-4000-a000-000000000005', 'Monthly', 700000, 'from_previous_due', true, true, null);

-- ── rooms (boys hostel: 2 floors; girls hostel: 1 floor)
insert into public.room_types (id, tenant_id, name, beds_per_room, ac, attached_bath, monthly_price_paise, deposit_paise, sort) values
  ('30000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000002', '2-sharing', 2, false, true, 650000, 650000, 0),
  ('30000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000002', '3-sharing', 3, false, true, 550000, 550000, 1),
  ('30000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000003', '2-sharing AC', 2, true, true, 950000, 1000000, 0),
  ('30000000-0000-4000-a000-000000000004', '10000000-0000-4000-a000-000000000003', '3-sharing', 3, false, true, 750000, 750000, 1),
  ('30000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000005', 'Dorm', 6, false, false, 450000, 0, 0);
insert into public.floors (id, tenant_id, label, sort) values
  ('40000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000002', 'Ground floor', 0),
  ('40000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000002', 'First floor', 1),
  ('40000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000003', 'Second floor', 0);
insert into public.rooms (id, tenant_id, floor_id, label, room_type_id, capacity) values
  ('50000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000002', '40000000-0000-4000-a000-000000000001', 'G1', '30000000-0000-4000-a000-000000000001', 2),
  ('50000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000002', '40000000-0000-4000-a000-000000000001', 'G2', '30000000-0000-4000-a000-000000000002', 3),
  ('50000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000002', '40000000-0000-4000-a000-000000000002', 'F1', '30000000-0000-4000-a000-000000000002', 3),
  ('50000000-0000-4000-a000-000000000004', '10000000-0000-4000-a000-000000000002', '40000000-0000-4000-a000-000000000002', 'F2', '30000000-0000-4000-a000-000000000001', 2),
  ('50000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000003', '40000000-0000-4000-a000-000000000003', '201', '30000000-0000-4000-a000-000000000003', 2),
  ('50000000-0000-4000-a000-000000000006', '10000000-0000-4000-a000-000000000003', '40000000-0000-4000-a000-000000000003', '202', '30000000-0000-4000-a000-000000000004', 3),
  ('50000000-0000-4000-a000-000000000007', '10000000-0000-4000-a000-000000000005', null, 'D1', '30000000-0000-4000-a000-000000000005', 6);

-- ── members
insert into public.members (id, tenant_id, phone, name, user_id, plan_id, code, created_via, joined_on, billing_start) values
  ('60000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', '+919000000007', 'Anil Varma', '00000000-0000-4000-a000-000000000007', '20000000-0000-4000-a000-000000000001', 'ANIL', 'import', current_date - 90, current_date - 90),
  ('60000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', '+919111111102', 'Bhavani Shankar', null, '20000000-0000-4000-a000-000000000001', 'BHAV', 'import', current_date - 60, current_date - 60),
  ('60000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000001', '+919111111103', 'Chaitanya Reddy', null, '20000000-0000-4000-a000-000000000002', 'CHAI', 'import', current_date - 40, current_date - 40),
  ('60000000-0000-4000-a000-000000000004', '10000000-0000-4000-a000-000000000002', '+919111111104', 'Durga Prasad', null, '20000000-0000-4000-a000-000000000003', 'DURG', 'manual', current_date - 50, current_date - 50),
  ('60000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000002', '+919111111105', 'Eswar Rao', null, '20000000-0000-4000-a000-000000000003', 'ESWR', 'manual', current_date - 20, current_date - 20),
  ('60000000-0000-4000-a000-000000000006', '10000000-0000-4000-a000-000000000003', '+919000000008', 'Sravani P', '00000000-0000-4000-a000-000000000008', '20000000-0000-4000-a000-000000000004', 'SRAV', 'request', current_date - 35, current_date - 35),
  ('60000000-0000-4000-a000-000000000007', '10000000-0000-4000-a000-000000000004', '+919000000007', 'Anil Varma', '00000000-0000-4000-a000-000000000007', '20000000-0000-4000-a000-000000000005', 'ANLA', 'import', current_date - 10, current_date - 10),
  ('60000000-0000-4000-a000-000000000008', '10000000-0000-4000-a000-000000000004', '+919111111108', 'Secret Member A', null, '20000000-0000-4000-a000-000000000005', 'SECA', 'import', current_date - 10, current_date - 10),
  ('60000000-0000-4000-a000-000000000009', '10000000-0000-4000-a000-000000000001', '+919000000009', 'New Visitor (listed)', null, '20000000-0000-4000-a000-000000000001', 'NEWV', 'import', current_date, current_date);

insert into public.bed_assignments (tenant_id, room_id, member_id, bed_label, from_date) values
  ('10000000-0000-4000-a000-000000000002', '50000000-0000-4000-a000-000000000001', '60000000-0000-4000-a000-000000000004', 'A', current_date - 50),
  ('10000000-0000-4000-a000-000000000002', '50000000-0000-4000-a000-000000000002', '60000000-0000-4000-a000-000000000005', 'A', current_date - 20),
  ('10000000-0000-4000-a000-000000000003', '50000000-0000-4000-a000-000000000005', '60000000-0000-4000-a000-000000000006', 'A', current_date - 35);

-- payments through the real function (creates payment + ledger transaction together)
select public._record_member_payment('60000000-0000-4000-a000-000000000001', 300000, current_date - 28, 'upi', 'subscription', 1, 'import', null, null, 'UTR000000000001');
select public._record_member_payment('60000000-0000-4000-a000-000000000002', 300000, current_date - 33, 'cash', 'subscription', 1, 'import', null, null);
select public._record_member_payment('60000000-0000-4000-a000-000000000003', 240000, current_date - 5, 'upi', 'subscription', 1, 'import', null, null);
select public._record_member_payment('60000000-0000-4000-a000-000000000004', 650000, current_date - 20, 'upi', 'subscription', 1, 'manual', null, null);
select public._record_member_payment('60000000-0000-4000-a000-000000000004', 650000, current_date - 50, 'cash', 'deposit', 1, 'manual', null, 'Deposit');
select public._record_member_payment('60000000-0000-4000-a000-000000000006', 800000, current_date - 6, 'upi', 'subscription', 1, 'manual', null, null);
select public._record_member_payment('60000000-0000-4000-a000-000000000008', 280000, current_date - 10, 'cash', 'subscription', 1, 'import', null, null);

-- expenses (owner-only finance)
insert into public.transactions (tenant_id, direction, kind, account_id, category_id, amount_paise, occurred_on, description, status, source)
select t.id, 'out', 'expense', a.id, c.id, x.amt, current_date - x.ago, x.descr, 'confirmed', 'manual'
  from (values ('10000000-0000-4000-a000-000000000001'::uuid, 'vegetables', 230000::bigint, 3, 'Rythu bazaar vegetables'),
               ('10000000-0000-4000-a000-000000000001'::uuid, 'gas', 110000::bigint, 6, '1 commercial cylinder'),
               ('10000000-0000-4000-a000-000000000004'::uuid, 'gas', 999900::bigint, 2, 'Secret expense A')) x(tid, cat, amt, ago, descr)
  join public.tenants t on t.id = x.tid
  join public.categories c on c.tenant_id = t.id and c.key = x.cat
  join public.accounts a on a.tenant_id = t.id and a.kind = 'cash';

-- ── menu (mess): weekly template
insert into public.menu_templates (tenant_id, meal, weekday, items, veg_type)
select '10000000-0000-4000-a000-000000000001', m.meal, d, m.items, m.veg
  from generate_series(0, 6) d,
  (values ('breakfast', array['Idli', 'Sambar', 'Coconut chutney'], 'veg'),
          ('lunch', array['Rice', 'Tomato pappu', 'Bendakaya fry', 'Rasam', 'Curd'], 'veg'),
          ('dinner', array['Chapati', 'Aloo kurma', 'Rice', 'Rasam'], 'veg')) m(meal, items, veg);
update public.menu_templates set items = array['Chicken biryani', 'Raita', 'Mirchi ka salan'], veg_type = 'nonveg'
 where tenant_id = '10000000-0000-4000-a000-000000000001' and weekday = 0 and meal = 'lunch';
insert into public.menu_templates (tenant_id, meal, weekday, items, veg_type)
select '10000000-0000-4000-a000-000000000003', 'dinner', d, array['Phulka', 'Dal', 'Mixed veg curry', 'Rice'], 'veg' from generate_series(0, 6) d;

-- ── custom fields (examples)
insert into public.field_definitions (tenant_id, key, label, label_te, type, options, required, collect_from, show_on_card, show_in_list, sort) values
  ('10000000-0000-4000-a000-000000000001', 'college', 'College', 'కళాశాల', 'text', '{}', true, 'member', true, true, 0),
  ('10000000-0000-4000-a000-000000000001', 'year', 'Year of study', 'చదువుతున్న సంవత్సరం', 'select', array['1', '2', '3', '4'], false, 'member', true, false, 1),
  ('10000000-0000-4000-a000-000000000003', 'guardian_phone', 'Guardian phone', 'సంరక్షకుల ఫోన్', 'phone', '{}', true, 'member', false, false, 0);

-- ── notices + a pending join request + an open claim
insert into public.notices (tenant_id, title, body, pinned) values
  ('10000000-0000-4000-a000-000000000001', 'Mess closed on Diwali night', 'Dinner will not be served on Diwali. Breakfast and lunch as usual.', true),
  ('10000000-0000-4000-a000-000000000004', 'Secret notice A', 'Only members of A should see this.', false);
insert into public.join_requests (tenant_id, user_id, name, phone, message, preferred_room_type_id, move_in_date, adult_confirmed, consent_at) values
  ('10000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000009', 'New Visitor', '+919000000009', 'Looking for a 2-sharing room from next month.',
   '30000000-0000-4000-a000-000000000001', current_date + 10, true, now());
insert into public.payment_claims (tenant_id, member_id, amount_paise, method, reference, checks) values
  ('10000000-0000-4000-a000-000000000001', '60000000-0000-4000-a000-000000000001', 300000, 'upi', 'UTR000000000002', '{"amount_match":true}');

select public._untrust();
select public.recompute_availability(id) from public.tenants;
