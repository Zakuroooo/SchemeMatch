-- Criteria the source states but no profile field can model ("you must also confirm"),
-- and notes where the source is unclear. Both belong to a rule version: they change
-- whenever the rules change (docs/DATA.md §3).
alter table public.scheme_rule_versions
  add column unmodelled jsonb not null default '[]'::jsonb
    check (jsonb_typeof(unmodelled) = 'array'),
  add column ambiguous jsonb not null default '[]'::jsonb
    check (jsonb_typeof(ambiguous) = 'array');
