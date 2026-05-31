-- ============================================================================
-- Model Foundation Operational Contract
-- Completes the model-store backend contract without duplicating model identity.
-- ============================================================================

alter table public.model_entitlement_state
  add column if not exists paid_multi_model_personal_expansion_blocked boolean not null default true;

create table if not exists public.model_device_integrity_state (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  device_integrity_state text not null default 'review_blocked',
  raw_physical_device_serial_collection_blocked boolean not null default true,
  security_only_use_confirmed boolean not null default true,
  advertising_tracking_personalization_use_blocked boolean not null default true,
  production_enforcement_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_device_integrity_state_model_unique unique (model_id)
);

create table if not exists public.model_impersonation_review_state (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  impersonation_review_state text not null default 'not_required',
  profile_identity_review_state text not null default 'pending_if_triggered',
  public_identity_review_state text not null default 'blocked_until_publication_review',
  manual_review_required boolean not null default false,
  appeal_state text not null default 'available_for_severe_restriction',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_impersonation_review_state_model_unique unique (model_id)
);

create table if not exists public.model_identity_anti_abuse_state (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  canonical_model_limit_state text not null default 'one_profile_one_canonical_model',
  additional_personal_model_slots_blocked boolean not null default true,
  duplicate_model_risk_state text not null default 'blocked_by_policy',
  bot_factory_creation_blocked boolean not null default true,
  future_economy_activation_blocked boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_identity_anti_abuse_state_model_unique unique (model_id)
);

create table if not exists public.model_restriction_review_appeal_state (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  restriction_level text not null default 'none',
  restriction_scope text not null default 'none',
  manual_review_state text not null default 'not_required',
  user_notice_state text not null default 'not_required',
  appeal_state text not null default 'available_for_severe_restriction',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_restriction_review_appeal_state_model_unique unique (model_id)
);

create table if not exists public.model_voice_training_state (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  owner_auth_user_id uuid not null,
  sample_count integer not null default 0,
  consent_state text not null default 'not_yet_granted',
  verification_state text not null default 'not_verified',
  activation_state text not null default 'inactive',
  voice_profile_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_voice_training_state_model_unique unique (model_id)
);

create table if not exists public.model_logic_records (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null,
  logic_title text not null,
  logic_body text not null,
  logic_language text not null default 'natural_language',
  logic_state text not null default 'active',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists model_voice_training_state_model_id_idx on public.model_voice_training_state(model_id);
create index if not exists model_logic_records_model_id_idx on public.model_logic_records(model_id);
create index if not exists model_logic_records_owner_idx on public.model_logic_records(owner_auth_user_id, updated_at desc);

alter table public.model_device_integrity_state enable row level security;
alter table public.model_impersonation_review_state enable row level security;
alter table public.model_identity_anti_abuse_state enable row level security;
alter table public.model_restriction_review_appeal_state enable row level security;
alter table public.model_voice_training_state enable row level security;
alter table public.model_logic_records enable row level security;

drop policy if exists model_device_integrity_state_owner_all on public.model_device_integrity_state;
create policy model_device_integrity_state_owner_all on public.model_device_integrity_state for all using (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
);

drop policy if exists model_impersonation_review_state_owner_all on public.model_impersonation_review_state;
create policy model_impersonation_review_state_owner_all on public.model_impersonation_review_state for all using (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
);

drop policy if exists model_identity_anti_abuse_state_owner_all on public.model_identity_anti_abuse_state;
create policy model_identity_anti_abuse_state_owner_all on public.model_identity_anti_abuse_state for all using (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
);

drop policy if exists model_restriction_review_appeal_state_owner_all on public.model_restriction_review_appeal_state;
create policy model_restriction_review_appeal_state_owner_all on public.model_restriction_review_appeal_state for all using (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
);

drop policy if exists model_voice_training_state_owner_all on public.model_voice_training_state;
create policy model_voice_training_state_owner_all on public.model_voice_training_state for all using (
  auth.uid()::text = owner_auth_user_id::text
) with check (
  auth.uid()::text = owner_auth_user_id::text
);

drop policy if exists model_logic_records_owner_all on public.model_logic_records;
create policy model_logic_records_owner_all on public.model_logic_records for all using (
  auth.uid()::text = owner_auth_user_id::text
) with check (
  auth.uid()::text = owner_auth_user_id::text
);
