-- =============================================================================
-- Model Memory Foundation Backend
-- =============================================================================

create table if not exists public.model_memory_preferences (
  model_id uuid primary key references public.models(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null references auth.users(id) on delete cascade,
  context_window_days integer not null default 30,
  lookback_years integer not null default 10,
  longevity_years integer not null default 25,
  review_cadence_days integer not null default 90,
  decay_pressure numeric not null default 0.35,
  salience_threshold numeric not null default 0.55,
  recall_strictness numeric not null default 0.70,
  sensitive_recall_enabled boolean not null default false,
  prospective_recall_enabled boolean not null default true,
  indefinite_continuity_enabled boolean not null default false,
  social_memory_intake_enabled boolean not null default true,
  external_connector_memory_enabled boolean not null default false,
  training_memory_propagation_enabled boolean not null default true,
  memory_compression_level numeric not null default 0.65,
  preferences_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table if exists public.model_memory_preferences
  add column if not exists indefinite_continuity_enabled boolean not null default false,
  add column if not exists social_memory_intake_enabled boolean not null default true,
  add column if not exists external_connector_memory_enabled boolean not null default false,
  add column if not exists training_memory_propagation_enabled boolean not null default true,
  add column if not exists memory_compression_level numeric not null default 0.65;

create table if not exists public.model_memory_items (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null references auth.users(id) on delete cascade,
  privacy_memory_id uuid references public.privacy_memory_registry(id) on delete set null,
  memory_type text not null,
  memory_title text not null,
  memory_body text,
  source_table text,
  source_record_id text,
  confidence_score numeric not null default 0,
  salience_score numeric not null default 0,
  sensitivity_level text not null default 'sensitive',
  retention_state text not null default 'active',
  recall_state text not null default 'available',
  first_observed_at timestamptz,
  last_recalled_at timestamptz,
  review_after_at timestamptz,
  memory_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.model_memory_consolidation_queue (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null references auth.users(id) on delete cascade,
  candidate_type text not null,
  candidate_title text not null,
  candidate_body text,
  source_table text,
  source_record_id text,
  proposed_memory_type text not null default 'semantic',
  proposed_confidence numeric not null default 0,
  proposed_salience numeric not null default 0,
  queue_state text not null default 'pending',
  candidate_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.model_memory_edges (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null references auth.users(id) on delete cascade,
  source_memory_id uuid references public.model_memory_items(id) on delete cascade,
  target_memory_id uuid references public.model_memory_items(id) on delete cascade,
  edge_type text not null default 'related',
  edge_weight numeric not null default 0.5,
  evidence_reference text,
  edge_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.model_memory_retrieval_events (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null references auth.users(id) on delete cascade,
  memory_id uuid references public.model_memory_items(id) on delete set null,
  retrieval_surface text not null,
  retrieval_action text not null,
  retrieval_result text not null default 'allowed',
  retrieval_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.model_memory_corrections (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null references auth.users(id) on delete cascade,
  memory_id uuid references public.model_memory_items(id) on delete cascade,
  correction_type text not null,
  correction_note text,
  previous_payload jsonb not null default '{}'::jsonb,
  corrected_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists model_memory_items_owner_idx on public.model_memory_items(owner_auth_user_id);
create index if not exists model_memory_items_model_idx on public.model_memory_items(model_id);
create index if not exists model_memory_items_type_idx on public.model_memory_items(memory_type);
create index if not exists model_memory_queue_owner_idx on public.model_memory_consolidation_queue(owner_auth_user_id);
create index if not exists model_memory_queue_model_idx on public.model_memory_consolidation_queue(model_id);
create index if not exists model_memory_edges_model_idx on public.model_memory_edges(model_id);
create index if not exists model_memory_retrieval_events_model_idx on public.model_memory_retrieval_events(model_id);
create index if not exists model_memory_corrections_model_idx on public.model_memory_corrections(model_id);

drop trigger if exists set_model_memory_preferences_updated_at on public.model_memory_preferences;
create trigger set_model_memory_preferences_updated_at
before update on public.model_memory_preferences
for each row execute function public.set_privacy_updated_at();

drop trigger if exists set_model_memory_items_updated_at on public.model_memory_items;
create trigger set_model_memory_items_updated_at
before update on public.model_memory_items
for each row execute function public.set_privacy_updated_at();

drop trigger if exists set_model_memory_queue_updated_at on public.model_memory_consolidation_queue;
create trigger set_model_memory_queue_updated_at
before update on public.model_memory_consolidation_queue
for each row execute function public.set_privacy_updated_at();

drop trigger if exists set_model_memory_edges_updated_at on public.model_memory_edges;
create trigger set_model_memory_edges_updated_at
before update on public.model_memory_edges
for each row execute function public.set_privacy_updated_at();

alter table public.model_memory_preferences enable row level security;
alter table public.model_memory_items enable row level security;
alter table public.model_memory_consolidation_queue enable row level security;
alter table public.model_memory_edges enable row level security;
alter table public.model_memory_retrieval_events enable row level security;
alter table public.model_memory_corrections enable row level security;

drop policy if exists "Users can read own memory preferences" on public.model_memory_preferences;
create policy "Users can read own memory preferences"
  on public.model_memory_preferences for select
  using (auth.uid() = owner_auth_user_id);

drop policy if exists "Users can upsert own memory preferences" on public.model_memory_preferences;
create policy "Users can upsert own memory preferences"
  on public.model_memory_preferences for insert
  with check (auth.uid() = owner_auth_user_id);

drop policy if exists "Users can update own memory preferences" on public.model_memory_preferences;
create policy "Users can update own memory preferences"
  on public.model_memory_preferences for update
  using (auth.uid() = owner_auth_user_id)
  with check (auth.uid() = owner_auth_user_id);

drop policy if exists "Users can read own memory items" on public.model_memory_items;
create policy "Users can read own memory items"
  on public.model_memory_items for select
  using (auth.uid() = owner_auth_user_id);

drop policy if exists "Users can insert own memory items" on public.model_memory_items;
create policy "Users can insert own memory items"
  on public.model_memory_items for insert
  with check (auth.uid() = owner_auth_user_id);

drop policy if exists "Users can update own memory items" on public.model_memory_items;
create policy "Users can update own memory items"
  on public.model_memory_items for update
  using (auth.uid() = owner_auth_user_id)
  with check (auth.uid() = owner_auth_user_id);

drop policy if exists "Users can delete own memory items" on public.model_memory_items;
create policy "Users can delete own memory items"
  on public.model_memory_items for delete
  using (auth.uid() = owner_auth_user_id);

drop policy if exists "Users can read own memory queue" on public.model_memory_consolidation_queue;
create policy "Users can read own memory queue"
  on public.model_memory_consolidation_queue for select
  using (auth.uid() = owner_auth_user_id);

drop policy if exists "Users can insert own memory queue" on public.model_memory_consolidation_queue;
create policy "Users can insert own memory queue"
  on public.model_memory_consolidation_queue for insert
  with check (auth.uid() = owner_auth_user_id);

drop policy if exists "Users can update own memory queue" on public.model_memory_consolidation_queue;
create policy "Users can update own memory queue"
  on public.model_memory_consolidation_queue for update
  using (auth.uid() = owner_auth_user_id)
  with check (auth.uid() = owner_auth_user_id);

drop policy if exists "Users can delete own memory queue" on public.model_memory_consolidation_queue;
create policy "Users can delete own memory queue"
  on public.model_memory_consolidation_queue for delete
  using (auth.uid() = owner_auth_user_id);

drop policy if exists "Users can read own memory edges" on public.model_memory_edges;
create policy "Users can read own memory edges"
  on public.model_memory_edges for select
  using (auth.uid() = owner_auth_user_id);

drop policy if exists "Users can write own memory edges" on public.model_memory_edges;
create policy "Users can write own memory edges"
  on public.model_memory_edges for all
  using (auth.uid() = owner_auth_user_id)
  with check (auth.uid() = owner_auth_user_id);

drop policy if exists "Users can read own memory retrieval events" on public.model_memory_retrieval_events;
create policy "Users can read own memory retrieval events"
  on public.model_memory_retrieval_events for select
  using (auth.uid() = owner_auth_user_id);

drop policy if exists "Users can insert own memory retrieval events" on public.model_memory_retrieval_events;
create policy "Users can insert own memory retrieval events"
  on public.model_memory_retrieval_events for insert
  with check (auth.uid() = owner_auth_user_id);

drop policy if exists "Users can read own memory corrections" on public.model_memory_corrections;
create policy "Users can read own memory corrections"
  on public.model_memory_corrections for select
  using (auth.uid() = owner_auth_user_id);

drop policy if exists "Users can insert own memory corrections" on public.model_memory_corrections;
create policy "Users can insert own memory corrections"
  on public.model_memory_corrections for insert
  with check (auth.uid() = owner_auth_user_id);
