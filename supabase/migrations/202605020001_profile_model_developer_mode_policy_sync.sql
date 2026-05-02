-- Neuroartan profile, model, and Developer Mode policy sync
-- Supabase is the transitional canonical backend. This migration keeps profile
-- media, model creation, and Developer Mode records backend-owned and
-- account-scoped while the browser remains a shell only.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profile media storage bucket and owner-scoped object policies
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_media_public_select on storage.objects;
create policy profile_media_public_select on storage.objects
  for select using (bucket_id = 'profile-media');

drop policy if exists profile_media_owner_insert on storage.objects;
create policy profile_media_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'profile-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists profile_media_owner_update on storage.objects;
create policy profile_media_owner_update on storage.objects
  for update using (
    bucket_id = 'profile-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'profile-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists profile_media_owner_delete on storage.objects;
create policy profile_media_owner_delete on storage.objects
  for delete using (
    bucket_id = 'profile-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- Profile storage columns used by image upload and public/private rendering
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_storage_path text,
  add column if not exists cover_storage_path text,
  add column if not exists profile_image_storage_bucket text;

-- ---------------------------------------------------------------------------
-- Model table contract and owner policies
-- ---------------------------------------------------------------------------
alter table public.models
  add column if not exists profile_id uuid,
  add column if not exists owner_auth_user_id uuid,
  add column if not exists model_slug text,
  add column if not exists model_name text,
  add column if not exists description text,
  add column if not exists model_image_url text,
  add column if not exists creator_display_name text,
  add column if not exists creator_username text,
  add column if not exists model_visibility text not null default 'private',
  add column if not exists lifecycle_state text not null default 'draft',
  add column if not exists readiness_state text not null default 'uninitialized',
  add column if not exists publication_state text not null default 'unpublished',
  add column if not exists verification_state text not null default 'unverified',
  add column if not exists training_state text not null default 'uninitialized',
  add column if not exists interaction_state text not null default 'private',
  add column if not exists routing_class text not null default 'profile_continuity',
  add column if not exists default_runtime_policy jsonb not null default '{"provider":"unassigned","route":"site_knowledge","voice_enabled":false}'::jsonb,
  add column if not exists deployment_origin text not null default 'neuroartan_supabase',
  add column if not exists external_source_ref jsonb not null default '{}'::jsonb,
  add column if not exists source_count integer not null default 0,
  add column if not exists release_version text not null default '0.1.0',
  add column if not exists workspace_state text not null default 'active',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists models_model_slug_unique_idx
  on public.models(model_slug)
  where model_slug is not null;

create index if not exists models_owner_auth_user_id_idx on public.models(owner_auth_user_id);
create index if not exists models_profile_id_idx on public.models(profile_id);

alter table public.models enable row level security;

drop policy if exists models_owner_select on public.models;
create policy models_owner_select on public.models
  for select using (
    auth.uid()::text = owner_auth_user_id::text
    or (model_visibility = 'public' and publication_state = 'published')
  );

drop policy if exists models_owner_insert on public.models;
create policy models_owner_insert on public.models
  for insert with check (
    auth.uid()::text = owner_auth_user_id::text
    and exists (
      select 1
      from public.profiles p
      where p.id = profile_id
        and p.auth_user_id::text = auth.uid()::text
        and p.profile_exists = true
    )
  );

drop policy if exists models_owner_update on public.models;
create policy models_owner_update on public.models
  for update using (
    auth.uid()::text = owner_auth_user_id::text
  ) with check (
    auth.uid()::text = owner_auth_user_id::text
    and exists (
      select 1
      from public.profiles p
      where p.id = profile_id
        and p.auth_user_id::text = auth.uid()::text
        and p.profile_exists = true
    )
  );

-- ---------------------------------------------------------------------------
-- Developer Mode account-scoped project/session/review/release tables
-- ---------------------------------------------------------------------------
create table if not exists public.developer_projects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null,
  project_name text not null,
  repository_key text not null,
  provider_id text not null,
  environment_mode text not null default 'cloud_sandbox',
  project_status text not null default 'draft',
  runtime_status text not null default 'backend_required',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.developer_agent_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.developer_projects(id) on delete set null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null,
  repository_key text not null,
  provider_id text not null,
  agent_role text not null default 'implementation_agent',
  user_command text not null,
  scan_result jsonb not null default '{}'::jsonb,
  plan jsonb not null default '{}'::jsonb,
  patch_proposal jsonb not null default '{}'::jsonb,
  test_result jsonb not null default '{}'::jsonb,
  approval_state text not null default 'pending_review',
  commit_pr_state text not null default 'locked_backend_required',
  session_status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.developer_approvals (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.developer_agent_sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null,
  approval_state text not null default 'pending',
  approval_scope text not null default 'patch_review',
  approval_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.developer_release_ledger (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.developer_agent_sessions(id) on delete set null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null,
  release_version text,
  feature_category text not null,
  changed_modules jsonb not null default '[]'::jsonb,
  affected_repositories jsonb not null default '[]'::jsonb,
  operator_label text,
  agent_model text,
  approval_state text not null default 'unverified',
  test_status text not null default 'unverified',
  commercial_relevance text,
  rollback_notes text,
  release_visibility text not null default 'private',
  related_commit_pr text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists developer_projects_owner_idx on public.developer_projects(owner_auth_user_id);
create index if not exists developer_agent_sessions_owner_idx on public.developer_agent_sessions(owner_auth_user_id);
create index if not exists developer_approvals_owner_idx on public.developer_approvals(owner_auth_user_id);
create index if not exists developer_release_ledger_owner_idx on public.developer_release_ledger(owner_auth_user_id);

alter table public.developer_projects enable row level security;
alter table public.developer_agent_sessions enable row level security;
alter table public.developer_approvals enable row level security;
alter table public.developer_release_ledger enable row level security;

drop policy if exists developer_projects_owner_all on public.developer_projects;
create policy developer_projects_owner_all on public.developer_projects
  for all using (auth.uid()::text = owner_auth_user_id::text)
  with check (auth.uid()::text = owner_auth_user_id::text);

drop policy if exists developer_agent_sessions_owner_all on public.developer_agent_sessions;
create policy developer_agent_sessions_owner_all on public.developer_agent_sessions
  for all using (auth.uid()::text = owner_auth_user_id::text)
  with check (auth.uid()::text = owner_auth_user_id::text);

drop policy if exists developer_approvals_owner_all on public.developer_approvals;
create policy developer_approvals_owner_all on public.developer_approvals
  for all using (auth.uid()::text = owner_auth_user_id::text)
  with check (auth.uid()::text = owner_auth_user_id::text);

drop policy if exists developer_release_ledger_owner_all on public.developer_release_ledger;
create policy developer_release_ledger_owner_all on public.developer_release_ledger
  for all using (auth.uid()::text = owner_auth_user_id::text)
  with check (auth.uid()::text = owner_auth_user_id::text);
