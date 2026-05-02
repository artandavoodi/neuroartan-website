-- Neuroartan profile identity contract sync
-- Keeps the deployed Supabase profile schema aligned with the website profile,
-- username reservation, privacy, and public-route contract.

alter table public.profiles
  add column if not exists username_normalized text,
  add column if not exists username_status text not null default 'missing',
  add column if not exists username_route_ready boolean not null default false,
  add column if not exists username_reserved_at timestamptz,
  add column if not exists public_username text,
  add column if not exists public_display_name text,
  add column if not exists public_avatar_url text,
  add column if not exists public_identity_label text,
  add column if not exists public_profile_enabled boolean not null default false,
  add column if not exists public_profile_discoverable boolean not null default false,
  add column if not exists public_profile_visibility text not null default 'private',
  add column if not exists public_route_path text,
  add column if not exists public_route_url text,
  add column if not exists public_route_canonical_url text,
  add column if not exists public_route_status text not null default 'pending',
  add column if not exists public_summary text,
  add column if not exists public_bio text,
  add column if not exists public_tagline text,
  add column if not exists public_links jsonb not null default '[]'::jsonb,
  add column if not exists public_primary_link text,
  add column if not exists public_modules jsonb not null default '[]'::jsonb,
  add column if not exists public_feature_flags jsonb not null default '[]'::jsonb,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists date_of_birth date,
  add column if not exists birth_date date,
  add column if not exists gender text,
  add column if not exists profile_exists boolean not null default true,
  add column if not exists profile_completion_status text not null default 'incomplete',
  add column if not exists profile_completion_percent integer not null default 0,
  add column if not exists missing_required_fields jsonb not null default '[]'::jsonb,
  add column if not exists profile_visibility_status text,
  add column if not exists profile_complete boolean not null default false,
  add column if not exists eligibility_status text,
  add column if not exists eligibility_age_years integer,
  add column if not exists minimum_eligible_age_years integer,
  add column if not exists eligibility_policy_status text,
  add column if not exists eligibility_checked_at timestamptz,
  add column if not exists avatar_url text,
  add column if not exists photo_url text,
  add column if not exists email text,
  add column if not exists display_name text,
  add column if not exists updated_at timestamptz not null default now();

update public.profiles
set
  username_lower = coalesce(username_lower, lower(username)),
  username_normalized = coalesce(username_normalized, username_lower, lower(username)),
  username_status = case
    when coalesce(username_lower, username_normalized, username) is null then 'missing'
    else username_status
  end,
  username_route_ready = case
    when coalesce(username_lower, username_normalized, username) is null then false
    else username_route_ready
  end,
  public_username = coalesce(public_username, username_lower, username_normalized, username),
  updated_at = coalesce(updated_at, now());

create unique index if not exists profiles_username_lower_unique_idx
  on public.profiles(username_lower)
  where username_lower is not null;

create index if not exists profiles_auth_user_id_idx on public.profiles(auth_user_id);
create index if not exists profiles_public_username_idx on public.profiles(public_username);
create index if not exists profiles_public_route_state_idx on public.profiles(public_profile_enabled, public_route_status);

create table if not exists public.username_reservations (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  username_lower text not null unique,
  auth_user_id uuid not null,
  profile_id uuid,
  public_profile_path text,
  public_profile_url text,
  reservation_status text not null default 'active',
  claimed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.username_reservations
  add column if not exists username text,
  add column if not exists username_lower text,
  add column if not exists auth_user_id uuid,
  add column if not exists profile_id uuid,
  add column if not exists public_profile_path text,
  add column if not exists public_profile_url text,
  add column if not exists reservation_status text not null default 'active',
  add column if not exists claimed_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists username_reservations_username_lower_unique_idx
  on public.username_reservations(username_lower)
  where username_lower is not null;

alter table public.profiles enable row level security;
alter table public.username_reservations enable row level security;

drop policy if exists profiles_owner_select on public.profiles;
create policy profiles_owner_select on public.profiles
  for select using (auth.uid()::text = auth_user_id::text or public_profile_enabled = true);

drop policy if exists profiles_owner_insert on public.profiles;
create policy profiles_owner_insert on public.profiles
  for insert with check (auth.uid()::text = auth_user_id::text);

drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update on public.profiles
  for update using (auth.uid()::text = auth_user_id::text) with check (auth.uid()::text = auth_user_id::text);

drop policy if exists username_reservations_owner_access on public.username_reservations;
create policy username_reservations_owner_access on public.username_reservations
  for all using (auth.uid()::text = auth_user_id::text) with check (auth.uid()::text = auth_user_id::text);

drop policy if exists username_reservations_public_availability_select on public.username_reservations;
create policy username_reservations_public_availability_select on public.username_reservations
  for select using (
    reservation_status = 'active'
    or auth.uid()::text = auth_user_id::text
  );
