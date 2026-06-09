-- Privacy-First Data Governance Backend
-- Purpose: source registry, consent ledger, processing ledger, storage classification, export/delete jobs, staff access audit, provider registry, and memory/voice/legacy governance foundation.

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enumerations
-- -----------------------------------------------------------------------------

do $$ begin
  create type public.privacy_data_classification as enum (
    'public',
    'private',
    'sensitive',
    'secret',
    'biometric_like',
    'legacy'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.privacy_storage_location as enum (
    'local_device',
    'icloud_drive',
    'cloudkit',
    'user_selected_folder',
    'neuroartan_cloud',
    'third_party_infrastructure',
    'external_model_provider',
    'hybrid_local_cloud_index'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.privacy_processing_depth as enum (
    'metadata_only',
    'index_only',
    'local_parse',
    'cloud_parse',
    'encrypted_cloud_copy',
    'chunking',
    'embedding_generation',
    'memory_graph_construction',
    'personal_model_calibration',
    'voice_processing',
    'legacy_continuity_processing',
    'fine_tuning'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.privacy_consent_state as enum (
    'not_requested',
    'requested',
    'granted',
    'denied',
    'revoked',
    'expired',
    'superseded'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.privacy_job_state as enum (
    'queued',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'partially_completed',
    'blocked_review_required'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.privacy_access_actor_type as enum (
    'user',
    'system',
    'staff',
    'provider',
    'automation'
  );
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

create or replace function public.set_privacy_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Source Registry
-- -----------------------------------------------------------------------------

create table if not exists public.privacy_source_registry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  model_id uuid references public.models(id) on delete cascade,
  source_name text not null,
  source_type text not null,
  file_extension text,
  mime_type text,
  storage_location public.privacy_storage_location not null,
  storage_reference text,
  source_hash text,
  size_bytes bigint,
  classification public.privacy_data_classification not null default 'sensitive',
  processing_depth public.privacy_processing_depth not null default 'metadata_only',
  consent_state public.privacy_consent_state not null default 'not_requested',
  cloud_copy_state text not null default 'not_copied',
  derived_data_state text not null default 'not_created',
  retention_rule text not null default 'user_controlled',
  export_eligible boolean not null default true,
  deletion_eligible boolean not null default true,
  legal_review_required boolean not null default false,
  gc_review_required boolean not null default false,
  creo_review_required boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists privacy_source_registry_user_idx on public.privacy_source_registry(user_id);
create index if not exists privacy_source_registry_profile_idx on public.privacy_source_registry(profile_id);
create index if not exists privacy_source_registry_model_idx on public.privacy_source_registry(model_id);
create index if not exists privacy_source_registry_classification_idx on public.privacy_source_registry(classification);
create index if not exists privacy_source_registry_storage_idx on public.privacy_source_registry(storage_location);

create trigger set_privacy_source_registry_updated_at
before update on public.privacy_source_registry
for each row execute function public.set_privacy_updated_at();

-- -----------------------------------------------------------------------------
-- Consent Ledger
-- -----------------------------------------------------------------------------

create table if not exists public.privacy_consent_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  model_id uuid references public.models(id) on delete cascade,
  source_id uuid references public.privacy_source_registry(id) on delete cascade,
  consent_scope text not null,
  consent_state public.privacy_consent_state not null default 'requested',
  processing_depth public.privacy_processing_depth,
  storage_location public.privacy_storage_location,
  granted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  consent_version text not null default '0.1.0',
  consent_text text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists privacy_consent_ledger_user_idx on public.privacy_consent_ledger(user_id);
create index if not exists privacy_consent_ledger_source_idx on public.privacy_consent_ledger(source_id);
create index if not exists privacy_consent_ledger_scope_idx on public.privacy_consent_ledger(consent_scope);
create index if not exists privacy_consent_ledger_state_idx on public.privacy_consent_ledger(consent_state);

create trigger set_privacy_consent_ledger_updated_at
before update on public.privacy_consent_ledger
for each row execute function public.set_privacy_updated_at();

-- -----------------------------------------------------------------------------
-- Processing Ledger
-- -----------------------------------------------------------------------------

create table if not exists public.privacy_processing_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  model_id uuid references public.models(id) on delete cascade,
  source_id uuid references public.privacy_source_registry(id) on delete cascade,
  consent_id uuid references public.privacy_consent_ledger(id) on delete set null,
  processing_type public.privacy_processing_depth not null,
  processing_purpose text not null,
  processor_name text not null default 'neuroartan',
  processor_type text not null default 'internal',
  job_state public.privacy_job_state not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  output_reference text,
  output_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists privacy_processing_ledger_user_idx on public.privacy_processing_ledger(user_id);
create index if not exists privacy_processing_ledger_source_idx on public.privacy_processing_ledger(source_id);
create index if not exists privacy_processing_ledger_state_idx on public.privacy_processing_ledger(job_state);
create index if not exists privacy_processing_ledger_type_idx on public.privacy_processing_ledger(processing_type);

create trigger set_privacy_processing_ledger_updated_at
before update on public.privacy_processing_ledger
for each row execute function public.set_privacy_updated_at();

-- -----------------------------------------------------------------------------
-- Storage Location Registry
-- -----------------------------------------------------------------------------

create table if not exists public.privacy_storage_location_registry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  model_id uuid references public.models(id) on delete cascade,
  source_id uuid references public.privacy_source_registry(id) on delete cascade,
  storage_location public.privacy_storage_location not null,
  storage_label text not null,
  storage_reference text,
  has_neuroartan_copy boolean not null default false,
  has_raw_content boolean not null default false,
  has_derived_content boolean not null default false,
  encryption_state text not null default 'not_verified',
  region text,
  retention_rule text not null default 'user_controlled',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists privacy_storage_location_registry_user_idx on public.privacy_storage_location_registry(user_id);
create index if not exists privacy_storage_location_registry_source_idx on public.privacy_storage_location_registry(source_id);
create index if not exists privacy_storage_location_registry_location_idx on public.privacy_storage_location_registry(storage_location);

create trigger set_privacy_storage_location_registry_updated_at
before update on public.privacy_storage_location_registry
for each row execute function public.set_privacy_updated_at();

-- -----------------------------------------------------------------------------
-- Export and Deletion Jobs
-- -----------------------------------------------------------------------------

create table if not exists public.privacy_export_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  model_id uuid references public.models(id) on delete cascade,
  source_id uuid references public.privacy_source_registry(id) on delete set null,
  export_scope text not null,
  export_format text not null default 'json',
  job_state public.privacy_job_state not null default 'queued',
  output_reference text,
  requested_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.privacy_deletion_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  model_id uuid references public.models(id) on delete cascade,
  source_id uuid references public.privacy_source_registry(id) on delete set null,
  deletion_scope text not null,
  delete_raw_source boolean not null default false,
  delete_parsed_text boolean not null default true,
  delete_chunks boolean not null default true,
  delete_embeddings boolean not null default true,
  delete_memory_links boolean not null default true,
  delete_voice_derivatives boolean not null default true,
  delete_legacy_settings boolean not null default false,
  retention_exception text,
  job_state public.privacy_job_state not null default 'queued',
  requested_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists privacy_export_jobs_user_idx on public.privacy_export_jobs(user_id);
create index if not exists privacy_deletion_jobs_user_idx on public.privacy_deletion_jobs(user_id);

create trigger set_privacy_export_jobs_updated_at
before update on public.privacy_export_jobs
for each row execute function public.set_privacy_updated_at();

create trigger set_privacy_deletion_jobs_updated_at
before update on public.privacy_deletion_jobs
for each row execute function public.set_privacy_updated_at();

-- -----------------------------------------------------------------------------
-- Memory, Voice, and Legacy Registries
-- -----------------------------------------------------------------------------

create table if not exists public.privacy_memory_registry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  model_id uuid references public.models(id) on delete cascade,
  source_id uuid references public.privacy_source_registry(id) on delete set null,
  memory_type text not null,
  classification public.privacy_data_classification not null default 'sensitive',
  consent_state public.privacy_consent_state not null default 'not_requested',
  raw_source_reference text,
  parsed_reference text,
  embedding_reference text,
  graph_reference text,
  public_visibility boolean not null default false,
  deletion_state text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.privacy_voice_registry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  model_id uuid references public.models(id) on delete cascade,
  source_id uuid references public.privacy_source_registry(id) on delete set null,
  voice_record_type text not null,
  classification public.privacy_data_classification not null default 'biometric_like',
  capture_consent_state public.privacy_consent_state not null default 'not_requested',
  processing_consent_state public.privacy_consent_state not null default 'not_requested',
  activation_consent_state public.privacy_consent_state not null default 'not_requested',
  legacy_voice_consent_state public.privacy_consent_state not null default 'not_requested',
  raw_audio_reference text,
  transcript_reference text,
  feature_reference text,
  activation_state text not null default 'inactive',
  deletion_state text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.privacy_legacy_registry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  model_id uuid references public.models(id) on delete cascade,
  source_id uuid references public.privacy_source_registry(id) on delete set null,
  legacy_state text not null default 'inactive',
  loved_one_access_state text not null default 'disabled',
  release_condition_state text not null default 'not_configured',
  verification_state text not null default 'not_verified',
  consent_state public.privacy_consent_state not null default 'not_requested',
  step_up_required boolean not null default true,
  dispute_state text not null default 'none',
  suspension_state text not null default 'none',
  secret_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists privacy_memory_registry_user_idx on public.privacy_memory_registry(user_id);
create index if not exists privacy_voice_registry_user_idx on public.privacy_voice_registry(user_id);
create index if not exists privacy_legacy_registry_user_idx on public.privacy_legacy_registry(user_id);

create trigger set_privacy_memory_registry_updated_at
before update on public.privacy_memory_registry
for each row execute function public.set_privacy_updated_at();

create trigger set_privacy_voice_registry_updated_at
before update on public.privacy_voice_registry
for each row execute function public.set_privacy_updated_at();

create trigger set_privacy_legacy_registry_updated_at
before update on public.privacy_legacy_registry
for each row execute function public.set_privacy_updated_at();

-- -----------------------------------------------------------------------------
-- Staff Access and Provider Governance
-- -----------------------------------------------------------------------------

create table if not exists public.privacy_staff_access_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  model_id uuid references public.models(id) on delete cascade,
  source_id uuid references public.privacy_source_registry(id) on delete set null,
  actor_type public.privacy_access_actor_type not null,
  actor_identifier text not null,
  access_scope text not null,
  access_reason text not null,
  consent_id uuid references public.privacy_consent_ledger(id) on delete set null,
  access_started_at timestamptz not null default timezone('utc', now()),
  access_ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.privacy_provider_registry (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null,
  provider_type text not null,
  processing_purpose text not null,
  data_categories text[] not null default '{}',
  sensitive_data_exposure boolean not null default false,
  storage_region text,
  retention_period text,
  deletion_workflow text,
  security_controls jsonb not null default '{}'::jsonb,
  contract_status text not null default 'not_reviewed',
  gc_review_required boolean not null default true,
  creo_review_required boolean not null default true,
  active boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists privacy_staff_access_audit_user_idx on public.privacy_staff_access_audit(user_id);
create index if not exists privacy_provider_registry_active_idx on public.privacy_provider_registry(active);

create trigger set_privacy_provider_registry_updated_at
before update on public.privacy_provider_registry
for each row execute function public.set_privacy_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.privacy_source_registry enable row level security;
alter table public.privacy_consent_ledger enable row level security;
alter table public.privacy_processing_ledger enable row level security;
alter table public.privacy_storage_location_registry enable row level security;
alter table public.privacy_export_jobs enable row level security;
alter table public.privacy_deletion_jobs enable row level security;
alter table public.privacy_memory_registry enable row level security;
alter table public.privacy_voice_registry enable row level security;
alter table public.privacy_legacy_registry enable row level security;
alter table public.privacy_staff_access_audit enable row level security;
alter table public.privacy_provider_registry enable row level security;

create policy "Users can read own privacy sources"
  on public.privacy_source_registry for select
  using (auth.uid() = user_id);

create policy "Users can insert own privacy sources"
  on public.privacy_source_registry for insert
  with check (auth.uid() = user_id);

create policy "Users can update own privacy sources"
  on public.privacy_source_registry for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read own consent ledger"
  on public.privacy_consent_ledger for select
  using (auth.uid() = user_id);

create policy "Users can insert own consent ledger"
  on public.privacy_consent_ledger for insert
  with check (auth.uid() = user_id);

create policy "Users can update own consent ledger"
  on public.privacy_consent_ledger for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read own processing ledger"
  on public.privacy_processing_ledger for select
  using (auth.uid() = user_id);

create policy "Users can insert own processing ledger"
  on public.privacy_processing_ledger for insert
  with check (auth.uid() = user_id);

create policy "Users can read own storage registry"
  on public.privacy_storage_location_registry for select
  using (auth.uid() = user_id);

create policy "Users can insert own storage registry"
  on public.privacy_storage_location_registry for insert
  with check (auth.uid() = user_id);

create policy "Users can read own export jobs"
  on public.privacy_export_jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert own export jobs"
  on public.privacy_export_jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can read own deletion jobs"
  on public.privacy_deletion_jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert own deletion jobs"
  on public.privacy_deletion_jobs for insert
  with check (auth.uid() = user_id);

create policy "Users can read own memory registry"
  on public.privacy_memory_registry for select
  using (auth.uid() = user_id);

create policy "Users can insert own memory registry"
  on public.privacy_memory_registry for insert
  with check (auth.uid() = user_id);

create policy "Users can read own voice registry"
  on public.privacy_voice_registry for select
  using (auth.uid() = user_id);

create policy "Users can insert own voice registry"
  on public.privacy_voice_registry for insert
  with check (auth.uid() = user_id);

create policy "Users can read own legacy registry"
  on public.privacy_legacy_registry for select
  using (auth.uid() = user_id);

create policy "Users can insert own legacy registry"
  on public.privacy_legacy_registry for insert
  with check (auth.uid() = user_id);

create policy "Users can read own staff access audit"
  on public.privacy_staff_access_audit for select
  using (auth.uid() = user_id);

create policy "Authenticated users can read active provider registry"
  on public.privacy_provider_registry for select
  using (auth.role() = 'authenticated' and active = true);

commit;