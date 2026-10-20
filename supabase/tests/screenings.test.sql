-- Screenings: the public keys can't reach them, saving is exactly once, delete-my-data works.
-- Runs in one transaction and is rolled back. Uses its own fixture scheme.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into public.schemes (id, slug, level, category, official_url, status) values
  ('00000000-0000-0000-0000-0000000005c1', 'test-screening-scheme', 'central', 'pension', 'https://example.gov.in/s', 'live');
insert into public.scheme_rule_versions (id, scheme_id, version, eligibility) values
  ('00000000-0000-0000-0000-0000000005d1', '00000000-0000-0000-0000-0000000005c1', 1, '{"all":[]}');
update public.schemes set current_rule_version_id = '00000000-0000-0000-0000-0000000005d1'
  where id = '00000000-0000-0000-0000-0000000005c1';

-- ── 1. RLS on, and the public roles have no table rights ────────────────────
select ok((select relrowsecurity from pg_class where oid = 'public.screenings'::regclass), 'screenings has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.matches'::regclass), 'matches has RLS');

set local role anon;
select throws_ok('select * from public.screenings', '42501', null, 'anon cannot read screenings');
select throws_ok(
  $$insert into public.screenings (idempotency_key, request_hash, install_id, channel, profile)
    values (gen_random_uuid(), repeat('a', 64), gen_random_uuid(), 'app', '{}')$$,
  '42501', null, 'anon cannot insert screenings');
select throws_ok(
  $$select public.save_screening(gen_random_uuid(), repeat('a', 64), gen_random_uuid(), 'app', '{}', '[]')$$,
  '42501', null, 'anon cannot call save_screening');
select throws_ok(
  $$select public.delete_install_screenings(gen_random_uuid())$$,
  '42501', null, 'anon cannot call delete_install_screenings');
reset role;

set local role authenticated;
select throws_ok('select * from public.matches', '42501', null, 'a logged-in user cannot read matches yet');
reset role;

-- ── 2. Saving is exactly once (as the server, service_role) ─────────────────
set local role service_role;
create temporary table first_save as
select public.save_screening(
  '00000000-0000-0000-0000-00000000aaaa', repeat('a', 64), '00000000-0000-0000-0000-00000000b001',
  'app', '{"age": 70}', '[{"slug": "test-screening-scheme", "result": "PASS", "reason": "aged 65 and above"}]'
) as r;

select is((select (r ->> 'created')::boolean from first_save), true, 'first save creates a screening');
select is(
  (select rule_version_id from public.matches m join public.screenings s on s.id = m.screening_id
   where s.idempotency_key = '00000000-0000-0000-0000-00000000aaaa'),
  '00000000-0000-0000-0000-0000000005d1'::uuid,
  'the match records the scheme''s current rule version');

select is(
  public.save_screening(
    '00000000-0000-0000-0000-00000000aaaa', repeat('a', 64), '00000000-0000-0000-0000-00000000b001',
    'app', '{"age": 70}', '[{"slug": "test-screening-scheme", "result": "PASS", "reason": "aged 65 and above"}]'),
  (select jsonb_set(r, '{created}', 'false') from first_save),
  'a retry returns the same stored screening and results, with created = false');
select is(
  (select count(*)::int from public.screenings where idempotency_key = '00000000-0000-0000-0000-00000000aaaa'),
  1, 'the retry did not create a second row');

select throws_ok(
  $$select public.save_screening('00000000-0000-0000-0000-00000000aaaa', repeat('b', 64),
      '00000000-0000-0000-0000-00000000b001', 'app', '{"age": 71}', '[]')$$,
  'P0001', 'idempotency_key_reused', 'the same key with a different request is refused');

select throws_ok(
  $$select public.save_screening(gen_random_uuid(), repeat('c', 64), gen_random_uuid(), 'app', '{}',
      '[{"slug": "no-such-scheme", "result": "PASS", "reason": null}]')$$,
  'P0001', 'unknown scheme slug in matches', 'a result for an unknown scheme is refused');

-- ── 3. Delete my data ──────────────────────────────────────────────────────
select is(public.delete_install_screenings('00000000-0000-0000-0000-00000000b001'), 1,
  'delete removes the install''s screening');
select is(
  (select count(*)::int from public.matches m
   where not exists (select 1 from public.screenings s where s.id = m.screening_id)),
  0, 'its matches are removed with it');
reset role;

select * from finish();
rollback;
