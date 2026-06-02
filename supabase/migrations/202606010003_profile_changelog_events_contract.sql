-- ============================================================================
-- Profile changelog events contract
-- Durable owner-side ledger reused by profile settings and model management.
-- ============================================================================

create table if not exists public.profile_changelog_events (
  id uuid primary key default gen_random_uuid(),
  owner_auth_user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  event_area text not null,
  event_action text not null,
  event_title text not null,
  event_detail text,
  event_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profile_changelog_events_owner_created_idx
  on public.profile_changelog_events(owner_auth_user_id, created_at desc);

create index if not exists profile_changelog_events_owner_area_created_idx
  on public.profile_changelog_events(owner_auth_user_id, event_area, created_at desc);

alter table public.profile_changelog_events enable row level security;

drop policy if exists profile_changelog_events_owner_select
  on public.profile_changelog_events;

create policy profile_changelog_events_owner_select
  on public.profile_changelog_events
  for select
  using (auth.uid() = owner_auth_user_id);

drop policy if exists profile_changelog_events_owner_insert
  on public.profile_changelog_events;

create policy profile_changelog_events_owner_insert
  on public.profile_changelog_events
  for insert
  with check (
    auth.uid() = owner_auth_user_id
    and (
      profile_id is null
      or exists (
        select 1
        from public.profiles profile
        where profile.id = profile_id
          and profile.auth_user_id = auth.uid()
      )
    )
  );
