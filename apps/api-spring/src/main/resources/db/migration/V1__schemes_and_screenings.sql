-- The local schema of this module only. The live Supabase database has its own migrations
-- (supabase/migrations) and is never touched from here.
-- Privacy rule: no column for a person's name, phone or ID number.

create table schemes (
  slug text primary key,
  status text not null default 'live' check (status in ('draft', 'live', 'retired')),
  level text not null check (level in ('central', 'state')),
  state text,
  category text not null,
  official_url text not null check (official_url like 'https://%'),
  title text not null,
  benefit text not null,
  rule_format_version integer not null default 1,
  eligibility jsonb not null, -- the rule tree is stored whole, because groups can nest
  unmodelled jsonb not null default '[]',
  constraint state_scheme_needs_state check (level = 'central' or state is not null)
);

create table screenings (
  id uuid primary key default gen_random_uuid(),
  -- A retry sends the same key. This unique constraint is what makes saving "exactly once",
  -- even when two retries arrive at the same moment.
  idempotency_key uuid not null unique,
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  install_id uuid not null,
  profile jsonb not null check (jsonb_typeof(profile) = 'object'),
  created_at timestamptz not null default now()
);

create index screenings_install_id_idx on screenings (install_id);

create table matches (
  screening_id uuid not null references screenings (id) on delete cascade,
  scheme_slug text not null references schemes (slug),
  result text not null check (result in ('PASS', 'FAIL', 'UNKNOWN')),
  reason text,
  primary key (screening_id, scheme_slug)
);
