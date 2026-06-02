-- ============================================================================
-- Model training recipe workspace
-- Persists owner-scoped recipe drafts, source selections, uploads, and queued
-- run requests without pretending that a provider training runner is local.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values (
  'model-training-sources',
  'model-training-sources',
  false,
  52428800
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists model_training_sources_owner_select on storage.objects;
create policy model_training_sources_owner_select on storage.objects
  for select using (
    bucket_id = 'model-training-sources'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists model_training_sources_owner_insert on storage.objects;
create policy model_training_sources_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'model-training-sources'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists model_training_sources_owner_update on storage.objects;
create policy model_training_sources_owner_update on storage.objects
  for update using (
    bucket_id = 'model-training-sources'
    and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'model-training-sources'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists model_training_sources_owner_delete on storage.objects;
create policy model_training_sources_owner_delete on storage.objects
  for delete using (
    bucket_id = 'model-training-sources'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create table if not exists public.model_training_recipes (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null references auth.users(id) on delete cascade,
  recipe_name text not null,
  base_model_provider text not null default 'model_registry',
  base_model_reference text not null,
  training_method text not null default 'supervised_fine_tuning',
  source_profile_foundation boolean not null default true,
  source_thought_bank boolean not null default false,
  source_documents boolean not null default false,
  source_knowledge_base boolean not null default false,
  execution_config jsonb not null default '{"epochs":1,"learning_rate":"0.0002","context_length":2048}'::jsonb,
  graph_config jsonb not null default '{"nodes":[],"connections":[]}'::jsonb,
  recipe_state text not null default 'draft',
  readiness_state text not null default 'draft',
  run_request_state text not null default 'not_requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.model_training_recipe_sources (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.model_training_recipes(id) on delete cascade,
  model_id uuid not null references public.models(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null,
  source_label text not null,
  source_reference text not null,
  source_config jsonb not null default '{}'::jsonb,
  source_state text not null default 'selected',
  ingestion_state text not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_training_recipe_sources_unique unique (recipe_id, source_kind, source_reference)
);

create table if not exists public.model_training_run_requests (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.model_training_recipes(id) on delete cascade,
  model_id uuid not null references public.models(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null references auth.users(id) on delete cascade,
  request_state text not null default 'queued_for_runner',
  runner_provider text not null default 'not_connected',
  execution_config jsonb not null default '{}'::jsonb,
  graph_config jsonb not null default '{"nodes":[],"connections":[]}'::jsonb,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.model_training_recipes
  alter column base_model_provider set default 'model_registry';

update public.model_training_recipes
set base_model_provider = 'model_registry'
where base_model_provider = 'hugging_face';

update public.model_training_recipe_sources
set source_kind = 'dataset_registry'
where source_kind = 'hugging_face_dataset';

alter table public.model_source_objects
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade,
  add column if not exists recipe_id uuid references public.model_training_recipes(id) on delete set null,
  add column if not exists source_reference text,
  add column if not exists source_content text,
  add column if not exists source_metadata jsonb not null default '{}'::jsonb,
  add column if not exists source_scope text not null default 'owner_private';

create index if not exists model_training_recipes_model_updated_idx
  on public.model_training_recipes(model_id, updated_at desc);

create index if not exists model_training_recipe_sources_recipe_idx
  on public.model_training_recipe_sources(recipe_id, updated_at desc);

create index if not exists model_training_run_requests_recipe_idx
  on public.model_training_run_requests(recipe_id, requested_at desc);

create index if not exists model_source_objects_recipe_idx
  on public.model_source_objects(recipe_id, updated_at desc);

alter table public.model_training_recipes enable row level security;
alter table public.model_training_recipe_sources enable row level security;
alter table public.model_training_run_requests enable row level security;

drop policy if exists model_training_recipes_owner_all on public.model_training_recipes;
create policy model_training_recipes_owner_all on public.model_training_recipes
  for all using (
    auth.uid() = owner_auth_user_id
  ) with check (
    auth.uid() = owner_auth_user_id
    and exists (
      select 1
      from public.models model
      join public.profiles profile on profile.id = model.profile_id
      where model.id = public.model_training_recipes.model_id
        and profile.id = public.model_training_recipes.profile_id
        and profile.auth_user_id = auth.uid()
    )
  );

drop policy if exists model_training_recipe_sources_owner_all on public.model_training_recipe_sources;
create policy model_training_recipe_sources_owner_all on public.model_training_recipe_sources
  for all using (
    auth.uid() = owner_auth_user_id
  ) with check (
    auth.uid() = owner_auth_user_id
    and exists (
      select 1
      from public.model_training_recipes recipe
      where recipe.id = public.model_training_recipe_sources.recipe_id
        and recipe.model_id = public.model_training_recipe_sources.model_id
        and recipe.profile_id = public.model_training_recipe_sources.profile_id
        and recipe.owner_auth_user_id = auth.uid()
    )
  );

drop policy if exists model_training_run_requests_owner_all on public.model_training_run_requests;
create policy model_training_run_requests_owner_all on public.model_training_run_requests
  for all using (
    auth.uid() = owner_auth_user_id
  ) with check (
    auth.uid() = owner_auth_user_id
    and exists (
      select 1
      from public.model_training_recipes recipe
      where recipe.id = public.model_training_run_requests.recipe_id
        and recipe.model_id = public.model_training_run_requests.model_id
        and recipe.profile_id = public.model_training_run_requests.profile_id
        and recipe.owner_auth_user_id = auth.uid()
    )
  );
