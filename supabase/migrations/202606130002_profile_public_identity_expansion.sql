-- Profile Public Identity Expansion
-- Adds approved profile-owned public, personal, professional, organization, and DOB-change protocol fields.
-- Model-owned systems are intentionally not touched.

alter table public.profiles
  add column if not exists preferred_name text,
  add column if not exists public_location text,
  add column if not exists website_url text,
  add column if not exists social_links jsonb not null default '[]'::jsonb,
  add column if not exists timezone text,
  add column if not exists organization_name text,
  add column if not exists professional_field text,
  add column if not exists expertise_areas jsonb not null default '[]'::jsonb,
  add column if not exists current_focus text,
  add column if not exists credentials_education text,
  add column if not exists portfolio_links jsonb not null default '[]'::jsonb,
  add column if not exists industry_sector text;

alter table public.profiles
  drop constraint if exists profiles_gender_supported_check;

update public.profiles
set gender = null
where gender is not null
  and lower(trim(gender)) not in ('male', 'female');

update public.profiles
set gender = lower(trim(gender))
where gender is not null;

alter table public.profiles
  add constraint profiles_gender_supported_check
  check (
    gender is null
    or gender = any (array['male'::text, 'female'::text])
  );

alter table public.profiles
  drop constraint if exists profiles_expertise_areas_array_check;

alter table public.profiles
  add constraint profiles_expertise_areas_array_check
  check (jsonb_typeof(expertise_areas) = 'array');

alter table public.profiles
  drop constraint if exists profiles_social_links_array_check;

alter table public.profiles
  add constraint profiles_social_links_array_check
  check (jsonb_typeof(social_links) = 'array');

alter table public.profiles
  drop constraint if exists profiles_portfolio_links_array_check;

alter table public.profiles
  add constraint profiles_portfolio_links_array_check
  check (jsonb_typeof(portfolio_links) = 'array');

create table if not exists public.profile_identity_change_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  auth_user_id uuid not null,
  request_type text not null default 'date_of_birth_change',
  request_status text not null default 'submitted',
  current_value text,
  requested_value text,
  request_reason text,
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profile_identity_change_requests_type_check
    check (request_type = any (array['date_of_birth_change'::text])),
  constraint profile_identity_change_requests_status_check
    check (request_status = any (array['submitted'::text, 'under_review'::text, 'approved'::text, 'declined'::text, 'expired'::text]))
);

create index if not exists profile_identity_change_requests_profile_id_idx
  on public.profile_identity_change_requests(profile_id);

create index if not exists profile_identity_change_requests_auth_user_id_idx
  on public.profile_identity_change_requests(auth_user_id);

create index if not exists profile_identity_change_requests_status_idx
  on public.profile_identity_change_requests(request_status);

create table if not exists public.profile_organizations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  auth_user_id uuid not null,
  organization_name text not null,
  organization_role text,
  organization_field text,
  organization_website_url text,
  organization_status text not null default 'active',
  organization_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profile_organizations_status_check
    check (organization_status = any (array['active'::text, 'inactive'::text, 'archived'::text])),
  constraint profile_organizations_metadata_object_check
    check (jsonb_typeof(organization_metadata) = 'object')
);

create index if not exists profile_organizations_profile_id_idx
  on public.profile_organizations(profile_id);

create index if not exists profile_organizations_auth_user_id_idx
  on public.profile_organizations(auth_user_id);

create index if not exists profile_organizations_status_idx
  on public.profile_organizations(organization_status);

alter table public.profile_identity_change_requests enable row level security;
alter table public.profile_organizations enable row level security;

drop policy if exists "profile_identity_change_requests_owner_select" on public.profile_identity_change_requests;
create policy "profile_identity_change_requests_owner_select"
  on public.profile_identity_change_requests
  for select
  using (auth.uid() = auth_user_id);

drop policy if exists "profile_identity_change_requests_owner_insert" on public.profile_identity_change_requests;
create policy "profile_identity_change_requests_owner_insert"
  on public.profile_identity_change_requests
  for insert
  with check (auth.uid() = auth_user_id);

drop policy if exists "profile_identity_change_requests_owner_update" on public.profile_identity_change_requests;
create policy "profile_identity_change_requests_owner_update"
  on public.profile_identity_change_requests
  for update
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

drop policy if exists "profile_organizations_owner_select" on public.profile_organizations;
create policy "profile_organizations_owner_select"
  on public.profile_organizations
  for select
  using (auth.uid() = auth_user_id);

drop policy if exists "profile_organizations_owner_insert" on public.profile_organizations;
create policy "profile_organizations_owner_insert"
  on public.profile_organizations
  for insert
  with check (auth.uid() = auth_user_id);

drop policy if exists "profile_organizations_owner_update" on public.profile_organizations;
create policy "profile_organizations_owner_update"
  on public.profile_organizations
  for update
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

create or replace function public.set_profile_public_identity_expansion_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profile_identity_change_requests_updated_at on public.profile_identity_change_requests;
create trigger set_profile_identity_change_requests_updated_at
  before update on public.profile_identity_change_requests
  for each row
  execute function public.set_profile_public_identity_expansion_updated_at();

drop trigger if exists set_profile_organizations_updated_at on public.profile_organizations;
create trigger set_profile_organizations_updated_at
  before update on public.profile_organizations
  for each row
  execute function public.set_profile_public_identity_expansion_updated_at();

comment on column public.profiles.preferred_name is 'User-approved preferred personal name for profile identity.';
comment on column public.profiles.public_location is 'Public profile location shown on user-facing profile surfaces.';
comment on column public.profiles.website_url is 'Primary public website URL for the profile.';
comment on column public.profiles.social_links is 'User-approved public social profile links.';
comment on column public.profiles.timezone is 'User profile timezone for locale-aware profile behavior.';
comment on column public.profiles.organization_name is 'Primary public or professional organization name shown on profile-owned surfaces.';
comment on column public.profiles.professional_field is 'User professional field or domain.';
comment on column public.profiles.expertise_areas is 'User-approved public/professional expertise areas.';
comment on column public.profiles.current_focus is 'User-approved current professional or creative focus.';
comment on column public.profiles.credentials_education is 'User-approved professional credentials or education summary.';
comment on column public.profiles.portfolio_links is 'User-approved professional portfolio or work links.';
comment on column public.profiles.industry_sector is 'User-approved professional industry or sector.';
comment on table public.profile_identity_change_requests is 'Governed request table for protected identity field changes such as date of birth.';
comment on table public.profile_organizations is 'Profile-owned organization connection layer for the private profile Organizations tab.';
