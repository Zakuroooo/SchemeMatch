-- The development seed: what an anonymous visitor (and so the API) can read.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

set local role anon;
select is((select count(*)::int from public.schemes), 30, 'anon sees all 30 seeded live schemes');
select is(
  (select count(*)::int from public.schemes s
   join public.scheme_rule_versions r on r.id = s.current_rule_version_id),
  30, 'every scheme has a readable current rule version');
select is((select count(*)::int from public.scheme_texts where lang = 'en'), 30, 'every scheme has English text');
select is(
  (select count(*)::int from public.scheme_rule_versions where jsonb_typeof(eligibility->'all') = 'array'),
  30, 'every rule tree is an all-group at the top');
select ok(
  (select bool_and(source_quote_check_passed) from public.scheme_rule_versions),
  'every seeded rule version passed the quote check');
select is(
  (select count(*)::int from public.schemes where level = 'state' and state is null), 0,
  'state schemes name their state');
reset role;

-- A draft added later must stay invisible to the public.
insert into public.schemes (slug, level, category, official_url) values ('hidden-draft', 'central', 'x', 'https://x.gov.in');
set local role anon;
select is((select count(*)::int from public.schemes where slug = 'hidden-draft'), 0, 'drafts stay hidden from anon');
reset role;

select * from finish();
rollback;
