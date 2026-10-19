-- RLS proof for the v1 schema. Runs in one transaction and is rolled back.
-- Assertions look only at this file's own fixture rows, so seed data can't affect them.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- ── 1. RLS is on for every table ──────────────────────────────────────────
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0,
  'every public table has RLS enabled'
);

-- ── Fixtures (inserted as the superuser, bypassing RLS) ──────────────────
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'worker@test.local');
insert into public.organisations (id, name) values
  ('00000000-0000-0000-0000-0000000000f1', 'Test NGO');
insert into public.worker_profiles (user_id, org_id, role) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000f1', 'admin'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000f1', 'worker');
insert into public.schemes (id, slug, level, category, official_url, status) values
  ('00000000-0000-0000-0000-0000000000c1', 'live-pension', 'central', 'pension', 'https://example.gov.in/a', 'live'),
  ('00000000-0000-0000-0000-0000000000c2', 'draft-scholarship', 'central', 'education', 'https://example.gov.in/b', 'draft');
insert into public.scheme_rule_versions (id, scheme_id, version, eligibility) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 1, '{"all":[]}'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000c1', 2, '{"all":[]}');
update public.schemes set current_rule_version_id = '00000000-0000-0000-0000-0000000000d2'
  where id = '00000000-0000-0000-0000-0000000000c1';

-- ── 2. Logged-out visitor (anon) ──────────────────────────────────────────
set local role anon;
select results_eq($$select slug from public.schemes where slug in ('live-pension', 'draft-scholarship')$$, $$values ('live-pension'::text)$$,
  'anon sees only live schemes');
select results_eq($$select version from public.scheme_rule_versions where scheme_id = '00000000-0000-0000-0000-0000000000c1'$$, $$values (2)$$,
  'anon sees only the current rule version of a live scheme');
select is((select count(*)::int from public.worker_profiles), 0, 'anon sees no worker profiles');
select throws_ok(
  $$insert into public.schemes (slug, level, category, official_url) values ('x', 'central', 'c', 'https://x.in')$$,
  '42501', null, 'anon cannot insert a scheme');
reset role;

-- ── 3. Logged-in worker (not admin) ───────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select results_eq($$select slug from public.schemes where slug in ('live-pension', 'draft-scholarship')$$, $$values ('live-pension'::text)$$,
  'worker sees only live schemes');
select results_eq('select user_id from public.worker_profiles',
  $$values ('00000000-0000-0000-0000-00000000000b'::uuid)$$, 'worker sees only their own profile');
select is((select count(*)::int from public.organisations), 1, 'worker sees their own organisation');
select throws_ok(
  $$insert into public.schemes (slug, level, category, official_url) values ('x', 'central', 'c', 'https://x.in')$$,
  '42501', null, 'worker cannot insert a scheme');
-- RLS does not raise on a blocked UPDATE; it silently matches 0 rows. So check the result.
update public.worker_profiles set role = 'admin' where user_id = '00000000-0000-0000-0000-00000000000b';
reset role;
select is(
  (select role from public.worker_profiles where user_id = '00000000-0000-0000-0000-00000000000b'),
  'worker', 'worker cannot promote themselves to admin');

-- ── 4. Admin ──────────────────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select is((select count(*)::int from public.schemes where slug in ('live-pension', 'draft-scholarship')), 2, 'admin sees draft and live schemes');
select lives_ok(
  $$insert into public.schemes (slug, level, category, official_url) values ('new-draft', 'central', 'health', 'https://example.gov.in/c')$$,
  'admin can insert a draft scheme');
delete from public.schemes where slug = 'live-pension';
select is((select count(*)::int from public.schemes where slug = 'live-pension'), 1,
  'delete is a no-op: there is no delete policy, even for admins');
reset role;

-- ── 5. Constraints ────────────────────────────────────────────────────────
select throws_ok(
  $$insert into public.schemes (slug, level, category, official_url) values ('mh-x', 'state', 'c', 'https://x.in')$$,
  '23514', null, 'a state scheme must name its state');
select throws_ok(
  $$insert into public.scheme_texts (scheme_id, lang, title, benefit, how_to_apply)
    values ('00000000-0000-0000-0000-0000000000c1', 'fr', 't', 'b', 'h')$$,
  '23514', null, 'only hi, mr, bn, en are allowed languages');
select throws_ok(
  $$insert into public.schemes (slug, level, category, official_url) values ('x2', 'central', 'c', 'http://insecure.in')$$,
  '23514', null, 'official URLs must be https');

select * from finish();
rollback;
