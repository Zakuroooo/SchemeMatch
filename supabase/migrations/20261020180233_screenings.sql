-- Saved screenings and their per-scheme results (ARCHITECTURE §2, ADR 0007).
-- Privacy rule: no column for a person's name, phone or ID number. The profile holds only
-- the API's strict profile fields; install_id is a random UUID made on the device.
-- Security rule: RLS on, no policies, table rights revoked from anon/authenticated.
-- Only the server (service_role, via the two functions below) can read or write.

create table public.screenings (
  id uuid primary key default gen_random_uuid(),
  -- Made by the client, once per screening. A retry sends the same key, so the unique
  -- index is what makes saving "exactly once", even when retries arrive at the same moment.
  idempotency_key uuid not null unique,
  -- sha256 of the request; the same key with a different body is refused.
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  install_id uuid,
  channel text not null check (channel in ('app', 'dashboard')),
  profile jsonb not null check (jsonb_typeof(profile) = 'object'),
  created_at timestamptz not null default now(),
  constraint app_screenings_have_install_id check (channel <> 'app' or install_id is not null)
);

create table public.matches (
  screening_id uuid not null references public.screenings (id) on delete cascade,
  scheme_id uuid not null references public.schemes (id),
  -- The rule version that decided this result, so a past screening can always be explained.
  rule_version_id uuid references public.scheme_rule_versions (id),
  result text not null check (result in ('PASS', 'FAIL', 'UNKNOWN')),
  reason text,
  applied boolean not null default false,
  primary key (screening_id, scheme_id)
);

create index screenings_install_id_idx on public.screenings (install_id);
create index matches_scheme_id_idx on public.matches (scheme_id);
create index matches_rule_version_id_idx on public.matches (rule_version_id);

alter table public.screenings enable row level security;
alter table public.matches enable row level security;
-- Defence in depth: even a future permissive policy would not open these to the public keys.
revoke all on public.screenings, public.matches from anon, authenticated;

-- Save once. Returns the stored screening and its results, also on a retry.
create function public.save_screening(
  p_key uuid,
  p_request_hash text,
  p_install_id uuid,
  p_channel text,
  p_profile jsonb,
  p_matches jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_hash text;
  v_created boolean := false;
begin
  insert into public.screenings (idempotency_key, request_hash, install_id, channel, profile)
  values (p_key, p_request_hash, p_install_id, p_channel, p_profile)
  on conflict (idempotency_key) do nothing
  returning id into v_id;

  if v_id is not null then
    v_created := true;
    insert into public.matches (screening_id, scheme_id, rule_version_id, result, reason)
    select v_id, s.id, s.current_rule_version_id, m ->> 'result', m ->> 'reason'
    from jsonb_array_elements(p_matches) as m
    join public.schemes as s on s.slug = m ->> 'slug';
    if (select count(*) from public.matches where screening_id = v_id)
       <> jsonb_array_length(p_matches) then
      raise exception 'unknown scheme slug in matches';
    end if;
  else
    -- Someone saved this key first (possibly a moment ago, in a parallel retry).
    select id, request_hash into v_id, v_hash
    from public.screenings where idempotency_key = p_key;
    if v_hash <> p_request_hash then
      raise exception 'idempotency_key_reused';
    end if;
  end if;

  return jsonb_build_object(
    'screening_id', v_id,
    'created', v_created,
    'results', (
      select coalesce(
        jsonb_agg(jsonb_build_object('slug', s.slug, 'result', m.result, 'reason', m.reason)
                  order by s.slug),
        '[]'::jsonb)
      from public.matches as m
      join public.schemes as s on s.id = m.scheme_id
      where m.screening_id = v_id
    )
  );
end;
$$;

-- "Delete my data" (PRIVACY-SECURITY §3): removes every screening of one install.
create function public.delete_install_screenings(p_install_id uuid)
returns integer
language sql
set search_path = ''
as $$
  with gone as (
    delete from public.screenings where install_id = p_install_id returning 1
  )
  select count(*)::integer from gone;
$$;

revoke execute on function public.save_screening(uuid, text, uuid, text, jsonb, jsonb)
  from public, anon, authenticated;
revoke execute on function public.delete_install_screenings(uuid)
  from public, anon, authenticated;
grant execute on function public.save_screening(uuid, text, uuid, text, jsonb, jsonb) to service_role;
grant execute on function public.delete_install_screenings(uuid) to service_role;
