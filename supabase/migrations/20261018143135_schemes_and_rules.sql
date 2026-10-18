-- SchemeMatch v1 schema: schemes, translations, documents, versioned rule trees.
-- Privacy rule: no column anywhere for a person's name, phone or ID number.
-- Security rule: RLS on every table; no policy = no access (default deny).

-- ── Organisations and worker accounts ─────────────────────────────────────
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.worker_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references public.organisations (id),
  role text not null default 'worker' check (role in ('worker', 'admin')),
  created_at timestamptz not null default now()
);

-- ── Schemes ───────────────────────────────────────────────────────────────
create table public.schemes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  level text not null check (level in ('central', 'state')),
  state text,
  category text not null,
  official_url text not null check (official_url like 'https://%'),
  source_hash text,
  last_checked date,
  status text not null default 'draft'
    check (status in ('draft', 'needs_review', 'live', 'retired')),
  current_rule_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint state_scheme_needs_state check (level = 'central' or state is not null)
);

create table public.scheme_texts (
  scheme_id uuid not null references public.schemes (id),
  lang text not null check (lang in ('hi', 'mr', 'bn', 'en')),
  title text not null,
  benefit text not null,
  how_to_apply text not null,
  primary key (scheme_id, lang)
);

create table public.scheme_documents (
  scheme_id uuid not null references public.schemes (id),
  doc_key text not null,
  mandatory boolean not null default true,
  condition jsonb, -- optional rule node: document needed only when this passes
  primary key (scheme_id, doc_key)
);

-- One row per version of a scheme's rule tree (docs/DATA.md §3–4).
-- The tree is stored whole as jsonb because all/any groups nest.
create table public.scheme_rule_versions (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.schemes (id),
  version integer not null check (version > 0),
  rule_format_version integer not null default 1,
  eligibility jsonb not null check (jsonb_typeof(eligibility) = 'object'),
  source_quote_check_passed boolean not null default false,
  created_by uuid references auth.users (id),
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (scheme_id, version),
  constraint review_is_complete check ((reviewed_by is null) = (reviewed_at is null))
);

alter table public.schemes
  add constraint schemes_current_rule_version_fk
  foreign key (current_rule_version_id) references public.scheme_rule_versions (id);

-- Indexes for foreign keys used in joins and policy checks.
create index worker_profiles_org_id_idx on public.worker_profiles (org_id);
create index schemes_current_rule_version_id_idx on public.schemes (current_rule_version_id);
create index scheme_rule_versions_reviewed_by_idx on public.scheme_rule_versions (reviewed_by);
create index scheme_rule_versions_created_by_idx on public.scheme_rule_versions (created_by);

-- ── Helpers (used by policies) ────────────────────────────────────────────
-- security definer: runs with the owner's rights so it can read worker_profiles
-- even though the caller's RLS would hide it. search_path = '' blocks hijacking.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.worker_profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

create function public.my_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select org_id from public.worker_profiles where user_id = auth.uid();
$$;

revoke execute on function public.is_admin() from public;
revoke execute on function public.my_org_id() from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.my_org_id() to authenticated;

-- ── Row Level Security ────────────────────────────────────────────────────
alter table public.organisations enable row level security;
alter table public.worker_profiles enable row level security;
alter table public.schemes enable row level security;
alter table public.scheme_texts enable row level security;
alter table public.scheme_documents enable row level security;
alter table public.scheme_rule_versions enable row level security;

-- Organisations: members see their own; admins see all.
create policy "members read own org" on public.organisations
  for select to authenticated
  using (id = public.my_org_id() or public.is_admin());

-- Worker profiles: you see your own row; admins see all. Only admins write.
create policy "read own profile" on public.worker_profiles
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "admins insert profiles" on public.worker_profiles
  for insert to authenticated with check (public.is_admin());
create policy "admins update profiles" on public.worker_profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Schemes: everyone (even logged out) reads live schemes; admins read and write all.
-- There is deliberately no DELETE policy: schemes are retired, never deleted.
create policy "public reads live schemes" on public.schemes
  for select to anon, authenticated
  using (status = 'live' or public.is_admin());
create policy "admins insert schemes" on public.schemes
  for insert to authenticated with check (public.is_admin());
create policy "admins update schemes" on public.schemes
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Texts and documents follow their scheme's visibility.
create policy "public reads texts of live schemes" on public.scheme_texts
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.schemes s where s.id = scheme_texts.scheme_id and s.status = 'live')
  );
create policy "admins insert texts" on public.scheme_texts
  for insert to authenticated with check (public.is_admin());
create policy "admins update texts" on public.scheme_texts
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public reads documents of live schemes" on public.scheme_documents
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.schemes s where s.id = scheme_documents.scheme_id and s.status = 'live')
  );
create policy "admins insert documents" on public.scheme_documents
  for insert to authenticated with check (public.is_admin());
create policy "admins update documents" on public.scheme_documents
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Rule versions: the public sees only the CURRENT version of a live scheme.
create policy "public reads current rules of live schemes" on public.scheme_rule_versions
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.schemes s
      where s.id = scheme_rule_versions.scheme_id
        and s.status = 'live'
        and s.current_rule_version_id = scheme_rule_versions.id
    )
  );
create policy "admins insert rule versions" on public.scheme_rule_versions
  for insert to authenticated with check (public.is_admin());
create policy "admins update rule versions" on public.scheme_rule_versions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Keep updated_at honest.
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger schemes_touch_updated_at
  before update on public.schemes
  for each row execute function public.touch_updated_at();
