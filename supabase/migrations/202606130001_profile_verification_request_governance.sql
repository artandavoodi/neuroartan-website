-- Profile verification request governance
-- Establishes profile verification lifecycle, 72-hour request cooldown, owner RLS, and provider-readiness fields.

create table if not exists public.profile_verification_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  request_status text not null default 'submitted',
  verification_type text not null default 'profile_identity',
  request_note text,
  next_request_available_at timestamptz,
  verification_provider text,
  provider_session_id text,
  reviewed_at timestamptz,
  reviewer_id uuid,
  review_decision text,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_verification_requests
  add column if not exists next_request_available_at timestamptz,
  add column if not exists verification_provider text,
  add column if not exists provider_session_id text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewer_id uuid,
  add column if not exists review_decision text,
  add column if not exists review_note text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.profile_verification_requests
  drop constraint if exists profile_verification_requests_status_check;

alter table public.profile_verification_requests
  add constraint profile_verification_requests_status_check
  check (
    request_status in (
      'submitted',
      'under_review',
      'approved',
      'verified',
      'declined',
      'expired',
      'rate_limited'
    )
  );

alter table public.profile_verification_requests
  drop constraint if exists profile_verification_requests_review_decision_check;

alter table public.profile_verification_requests
  add constraint profile_verification_requests_review_decision_check
  check (
    review_decision is null
    or review_decision in (
      'approved',
      'declined',
      'expired'
    )
  );

create or replace function public.set_profile_verification_next_request_available_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_at is null then
    new.created_at := now();
  end if;

  if new.next_request_available_at is null then
    new.next_request_available_at := new.created_at + interval '72 hours';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_profile_verification_next_request_available_at on public.profile_verification_requests;

create trigger set_profile_verification_next_request_available_at
before insert or update on public.profile_verification_requests
for each row
execute function public.set_profile_verification_next_request_available_at();

create or replace function public.enforce_profile_verification_request_cooldown()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  locked_request record;
begin
  select id, request_status, next_request_available_at
  into locked_request
  from public.profile_verification_requests
  where profile_id = new.profile_id
    and id is distinct from new.id
    and (
      request_status in ('submitted', 'under_review')
      or next_request_available_at > now()
    )
  order by created_at desc
  limit 1;

  if locked_request.id is not null then
    raise exception 'PROFILE_VERIFICATION_COOLDOWN_ACTIVE'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_profile_verification_request_cooldown on public.profile_verification_requests;

create trigger enforce_profile_verification_request_cooldown
before insert on public.profile_verification_requests
for each row
execute function public.enforce_profile_verification_request_cooldown();

create index if not exists profile_verification_requests_profile_created_idx
  on public.profile_verification_requests(profile_id, created_at desc);

create index if not exists profile_verification_requests_auth_created_idx
  on public.profile_verification_requests(auth_user_id, created_at desc);

create index if not exists profile_verification_requests_profile_next_available_idx
  on public.profile_verification_requests(profile_id, next_request_available_at desc);

alter table public.profile_verification_requests enable row level security;

drop policy if exists profile_verification_requests_owner_select on public.profile_verification_requests;
drop policy if exists profile_verification_requests_owner_insert on public.profile_verification_requests;
drop policy if exists profile_verification_requests_owner_update on public.profile_verification_requests;

create policy profile_verification_requests_owner_select
  on public.profile_verification_requests
  for select
  using (
    auth.uid() = auth_user_id
    or exists (
      select 1
      from public.profiles profile
      where profile.id = profile_id
        and profile.auth_user_id = auth.uid()
    )
  );

create policy profile_verification_requests_owner_insert
  on public.profile_verification_requests
  for insert
  with check (
    auth.uid() = auth_user_id
    and exists (
      select 1
      from public.profiles profile
      where profile.id = profile_id
        and profile.auth_user_id = auth.uid()
    )
  );

create policy profile_verification_requests_owner_update
  on public.profile_verification_requests
  for update
  using (
    auth.uid() = auth_user_id
    or exists (
      select 1
      from public.profiles profile
      where profile.id = profile_id
        and profile.auth_user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = auth_user_id
    or exists (
      select 1
      from public.profiles profile
      where profile.id = profile_id
        and profile.auth_user_id = auth.uid()
    )
  );
