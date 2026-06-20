-- =============================================================================
-- Private Home isolation and Developer API control-plane foundation
--
-- Personal model data is owner-only. Public model discovery is served through
-- an intentionally narrow projection. Developer keys are generated server-side
-- and only their bcrypt hashes are persisted.
-- =============================================================================

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 01) Canonical model ownership and public projection
-- -----------------------------------------------------------------------------

alter table public.models enable row level security;

drop policy if exists models_owner_select on public.models;
drop policy if exists models_public_published_select on public.models;

create policy models_owner_select
  on public.models
  for select
  using (
    auth.uid() = owner_auth_user_id
    and exists (
      select 1
      from public.profiles p
      where p.id = models.profile_id
        and p.auth_user_id = auth.uid()
        and p.profile_exists = true
    )
  );

create or replace view public.public_model_directory
with (security_invoker = false) as
select
  m.id,
  m.model_slug as slug,
  m.model_slug,
  coalesce(nullif(pi.public_display_name, ''), m.model_name) as model_name,
  coalesce(nullif(pi.public_description, ''), m.description, '') as description,
  coalesce(nullif(pi.public_avatar_url, ''), m.model_image_url, '') as model_image_url,
  m.model_cover_url,
  m.model_type,
  m.creator_display_name,
  m.creator_username,
  m.model_visibility,
  m.lifecycle_state as model_status,
  m.readiness_state,
  m.publication_state,
  m.verification_state,
  m.created_at,
  m.updated_at
from public.models m
left join public.model_public_identities pi on pi.model_id = m.id
where m.model_visibility = 'public'
  and m.publication_state = 'published'
  and (
    pi.model_id is null
    or (
      pi.public_visibility = 'public'
      and pi.public_identity_state in ('published', 'active')
    )
  );

revoke all on public.public_model_directory from public;
grant select on public.public_model_directory to anon, authenticated;

-- The active pointer must refer to the caller's own canonical model.
alter table public.active_model_preferences enable row level security;
drop policy if exists active_model_preferences_owner_all on public.active_model_preferences;

create policy active_model_preferences_owner_all
  on public.active_model_preferences
  for all
  using (
    auth.uid() = auth_user_id
    and exists (
      select 1
      from public.models m
      where m.id = active_model_preferences.model_id
        and m.profile_id = active_model_preferences.profile_id
        and m.owner_auth_user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = auth_user_id
    and exists (
      select 1
      from public.models m
      where m.id = active_model_preferences.model_id
        and m.profile_id = active_model_preferences.profile_id
        and m.owner_auth_user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 02) Private profile content hardening
-- -----------------------------------------------------------------------------

create table if not exists public.profile_posts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  body text not null default '',
  visibility_state text not null default 'private',
  post_state text not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profile_thoughts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null references auth.users(id) on delete cascade,
  text text not null default '',
  audience text not null default 'private',
  category text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists profile_posts_owner_created_idx
  on public.profile_posts(owner_auth_user_id, created_at desc);
create index if not exists profile_thoughts_owner_created_idx
  on public.profile_thoughts(owner_auth_user_id, created_at desc);

alter table public.profile_posts enable row level security;
alter table public.profile_thoughts enable row level security;

drop policy if exists profile_posts_owner_all on public.profile_posts;
create policy profile_posts_owner_all
  on public.profile_posts
  for all
  using (auth.uid() = owner_auth_user_id)
  with check (
    auth.uid() = owner_auth_user_id
    and (
      profile_id is null
      or exists (
        select 1 from public.profiles p
        where p.id = profile_posts.profile_id
          and p.auth_user_id = auth.uid()
      )
    )
  );

drop policy if exists profile_thoughts_owner_all on public.profile_thoughts;
create policy profile_thoughts_owner_all
  on public.profile_thoughts
  for all
  using (auth.uid() = owner_auth_user_id)
  with check (
    auth.uid() = owner_auth_user_id
    and (
      profile_id is null
      or exists (
        select 1 from public.profiles p
        where p.id = profile_thoughts.profile_id
          and p.auth_user_id = auth.uid()
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 03) Developer API keys: hashed, owner-scoped, server-issued once
-- -----------------------------------------------------------------------------

create table if not exists public.developer_api_keys (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  model_id uuid references public.models(id) on delete set null,
  key_prefix text not null unique,
  key_hash text not null,
  label text not null default 'Default key',
  environment text not null default 'live'
    check (environment in ('test', 'live')),
  scopes text[] not null default array['models.read']::text[],
  rate_limit_per_minute integer not null default 60
    check (rate_limit_per_minute between 1 and 10000),
  monthly_usage_limit bigint,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired')),
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.developer_api_usage_events (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid not null references public.developer_api_keys(id) on delete cascade,
  owner_auth_user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null default gen_random_uuid(),
  route text not null,
  method text not null,
  response_status integer not null,
  latency_ms integer,
  input_units bigint not null default 0,
  output_units bigint not null default 0,
  cost_microunits bigint not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists developer_api_keys_owner_status_idx
  on public.developer_api_keys(owner_auth_user_id, status, created_at desc);
create index if not exists developer_api_keys_prefix_idx
  on public.developer_api_keys(key_prefix);
create index if not exists developer_api_usage_key_created_idx
  on public.developer_api_usage_events(api_key_id, created_at desc);
create index if not exists developer_api_usage_owner_created_idx
  on public.developer_api_usage_events(owner_auth_user_id, created_at desc);

alter table public.developer_api_keys enable row level security;
alter table public.developer_api_usage_events enable row level security;

create policy developer_api_keys_owner_select
  on public.developer_api_keys
  for select
  using (auth.uid() = owner_auth_user_id);

create policy developer_api_usage_owner_select
  on public.developer_api_usage_events
  for select
  using (auth.uid() = owner_auth_user_id);

create or replace function public.create_developer_api_key(
  p_label text default 'Default key',
  p_environment text default 'live',
  p_scopes text[] default array['models.read']::text[],
  p_rate_limit_per_minute integer default 60,
  p_monthly_usage_limit bigint default null,
  p_expires_at timestamptz default null
)
returns table (
  id uuid,
  key_prefix text,
  secret text,
  label text,
  environment text,
  scopes text[],
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile_id uuid;
  v_model_id uuid;
  v_secret text;
  v_prefix text;
  v_row public.developer_api_keys;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select p.id into v_profile_id
  from public.profiles p
  where p.auth_user_id = v_user_id
    and p.profile_exists = true
  limit 1;

  if v_profile_id is null then
    raise exception 'PROFILE_REQUIRED';
  end if;

  select m.id into v_model_id
  from public.models m
  where m.profile_id = v_profile_id
    and m.owner_auth_user_id = v_user_id
  limit 1;

  v_secret := 'na_' || lower(coalesce(nullif(p_environment, ''), 'live')) || '_' || encode(gen_random_bytes(32), 'hex');
  v_prefix := left(v_secret, 20);

  insert into public.developer_api_keys (
    owner_auth_user_id,
    profile_id,
    model_id,
    key_prefix,
    key_hash,
    label,
    environment,
    scopes,
    rate_limit_per_minute,
    monthly_usage_limit,
    expires_at
  ) values (
    v_user_id,
    v_profile_id,
    v_model_id,
    v_prefix,
    crypt(v_secret, gen_salt('bf', 12)),
    coalesce(nullif(trim(p_label), ''), 'Default key'),
    case when p_environment in ('test', 'live') then p_environment else 'live' end,
    coalesce(p_scopes, array['models.read']::text[]),
    greatest(1, least(coalesce(p_rate_limit_per_minute, 60), 10000)),
    p_monthly_usage_limit,
    p_expires_at
  ) returning * into v_row;

  return query select
    v_row.id,
    v_row.key_prefix,
    v_secret,
    v_row.label,
    v_row.environment,
    v_row.scopes,
    v_row.created_at;
end;
$$;

create or replace function public.revoke_developer_api_key(p_key_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  update public.developer_api_keys
  set status = 'revoked', revoked_at = timezone('utc', now()), updated_at = timezone('utc', now())
  where id = p_key_id
    and owner_auth_user_id = auth.uid()
    and status = 'active';

  return found;
end;
$$;

create or replace function public.resolve_developer_api_key(p_secret text)
returns table (
  id uuid,
  owner_auth_user_id uuid,
  profile_id uuid,
  model_id uuid,
  scopes text[],
  rate_limit_per_minute integer,
  monthly_usage_limit bigint
)
language sql
security definer
set search_path = public
as $$
  select
    k.id,
    k.owner_auth_user_id,
    k.profile_id,
    k.model_id,
    k.scopes,
    k.rate_limit_per_minute,
    k.monthly_usage_limit
  from public.developer_api_keys k
  where k.key_prefix = left(p_secret, 20)
    and k.status = 'active'
    and (k.expires_at is null or k.expires_at > timezone('utc', now()))
    and k.key_hash = crypt(p_secret, k.key_hash)
  limit 1;
$$;

revoke all on function public.create_developer_api_key(text, text, text[], integer, bigint, timestamptz) from public;
revoke all on function public.revoke_developer_api_key(uuid) from public;
revoke all on function public.resolve_developer_api_key(text) from public;
grant execute on function public.create_developer_api_key(text, text, text[], integer, bigint, timestamptz) to authenticated;
grant execute on function public.revoke_developer_api_key(uuid) to authenticated;
grant execute on function public.resolve_developer_api_key(text) to service_role;

commit;
