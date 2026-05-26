-- ============================================================================
-- FSC-T-0007 Private Model Foundation
-- Website / Web App Supabase Migration
-- Canonical owner chain:
-- model_* child table → public.models.profile_id → public.profiles.id → public.profiles.auth_user_id → auth.uid()
-- ============================================================================

alter table public.models
  add column if not exists birth_certificate_id uuid,
  add column if not exists private_identity_id uuid,
  add column if not exists public_identity_id uuid,
  add column if not exists entitlement_state text not null default 'free_personal_model_included',
  add column if not exists permission_state text not null default 'private_owner_only',
  add column if not exists economy_state text not null default 'blocked_until_review',
  add column if not exists foundation_state text not null default 'private_foundation_created';

create table if not exists public.model_birth_certificates (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  birth_state text not null default 'created',
  birth_reason text not null default 'default_private_personal_model',
  birth_source text not null default 'website_profile_creation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_birth_certificates_model_unique unique (model_id)
);

create table if not exists public.model_identity_registry (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  registry_state text not null default 'registered_private',
  registry_scope text not null default 'private_personal_model',
  canonical_slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_identity_registry_model_unique unique (model_id)
);

create table if not exists public.model_public_identities (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  public_identity_state text not null default 'not_published',
  public_display_name text,
  public_slug text,
  public_description text,
  public_avatar_url text,
  public_visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_public_identities_model_unique unique (model_id)
);

create table if not exists public.model_private_identities (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  private_identity_state text not null default 'active',
  private_name text,
  private_notes text,
  owner_visibility text not null default 'owner_only',
  source_boundary text not null default 'private_foundation_only',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_private_identities_model_unique unique (model_id)
);

create table if not exists public.model_provider_routing_state (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  provider_state text not null default 'not_assigned',
  provider_name text not null default 'unassigned',
  route_class text not null default 'site_knowledge',
  runtime_policy jsonb not null default '{}'::jsonb,
  routing_enabled boolean not null default false,
  voice_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_provider_routing_state_model_unique unique (model_id)
);

create table if not exists public.model_entitlement_state (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  subscription_tier text not null default 'free',
  model_creation_limit integer not null default 1,
  personal_model_included boolean not null default true,
  additional_model_slots integer not null default 0,
  marketplace_access_state text not null default 'blocked_until_review',
  monetization_request_state text not null default 'blocked_until_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_entitlement_state_model_unique unique (model_id)
);

create table if not exists public.model_permission_state (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  permission_scope text not null default 'private_owner_only',
  owner_read_enabled boolean not null default true,
  owner_write_enabled boolean not null default true,
  public_read_enabled boolean not null default false,
  public_interaction_enabled boolean not null default false,
  export_enabled boolean not null default false,
  deletion_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_permission_state_model_unique unique (model_id)
);

create table if not exists public.model_source_authorization_state (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  source_type text not null default 'none',
  authorization_scope text not null default 'none',
  authorization_state text not null default 'not_yet_granted',
  revocation_state text not null default 'not_applicable',
  revocation_effect text not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_source_authorization_state_model_unique unique (model_id)
);

create table if not exists public.model_lifecycle_state (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  current_state text not null default 'created',
  previous_state text not null default 'none',
  state_reason text not null default 'default_personal_model_birth',
  state_changed_at timestamptz not null default now(),
  archive_eligible boolean not null default true,
  delete_eligible boolean not null default true,
  constraint model_lifecycle_state_model_unique unique (model_id)
);

create table if not exists public.model_owner_dashboard_state (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  birth_status_display text not null default 'created',
  registry_status_display text not null default 'registered_private',
  provider_route_display text not null default 'not_assigned',
  entitlement_display text not null default 'free_personal_model_included',
  permission_display text not null default 'private_owner_only',
  readiness_display text not null default 'foundation_ready',
  blocked_economy_display text not null default 'economy_features_blocked_until_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_owner_dashboard_state_model_unique unique (model_id)
);

create table if not exists public.model_dignity_security_state (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  sensitive_data_state text not null default 'protected',
  identity_protection_state text not null default 'private_owner_controlled',
  voice_protection_state text not null default 'not_yet_linked',
  memory_protection_state text not null default 'private_foundation_only',
  deletion_policy_state text not null default 'owner_request_required',
  export_policy_state text not null default 'blocked_until_policy_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_dignity_security_state_model_unique unique (model_id)
);

create table if not exists public.model_blocked_economy_state (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  marketplace_blocked boolean not null default true,
  monetization_blocked boolean not null default true,
  payout_blocked boolean not null default true,
  public_ranking_blocked boolean not null default true,
  inter_model_hiring_blocked boolean not null default true,
  regulated_domain_blocked boolean not null default true,
  guaranteed_income_claim_blocked boolean not null default true,
  consciousness_personhood_claim_blocked boolean not null default true,
  posthumous_economy_blocked boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_blocked_economy_state_model_unique unique (model_id)
);

alter table public.model_birth_certificates enable row level security;
alter table public.model_identity_registry enable row level security;
alter table public.model_public_identities enable row level security;
alter table public.model_private_identities enable row level security;
alter table public.model_provider_routing_state enable row level security;
alter table public.model_entitlement_state enable row level security;
alter table public.model_permission_state enable row level security;
alter table public.model_source_authorization_state enable row level security;
alter table public.model_lifecycle_state enable row level security;
alter table public.model_owner_dashboard_state enable row level security;
alter table public.model_dignity_security_state enable row level security;
alter table public.model_blocked_economy_state enable row level security;

drop policy if exists model_birth_certificates_owner_all on public.model_birth_certificates;
drop policy if exists model_identity_registry_owner_all on public.model_identity_registry;
drop policy if exists model_public_identities_owner_all on public.model_public_identities;
drop policy if exists model_private_identities_owner_all on public.model_private_identities;
drop policy if exists model_provider_routing_state_owner_all on public.model_provider_routing_state;
drop policy if exists model_entitlement_state_owner_all on public.model_entitlement_state;
drop policy if exists model_permission_state_owner_all on public.model_permission_state;
drop policy if exists model_source_authorization_state_owner_all on public.model_source_authorization_state;
drop policy if exists model_lifecycle_state_owner_all on public.model_lifecycle_state;
drop policy if exists model_owner_dashboard_state_owner_all on public.model_owner_dashboard_state;
drop policy if exists model_dignity_security_state_owner_all on public.model_dignity_security_state;
drop policy if exists model_blocked_economy_state_owner_all on public.model_blocked_economy_state;

create policy model_birth_certificates_owner_all on public.model_birth_certificates for all using (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
);

create policy model_identity_registry_owner_all on public.model_identity_registry for all using (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
);

create policy model_public_identities_owner_all on public.model_public_identities for all using (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
);

create policy model_private_identities_owner_all on public.model_private_identities for all using (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
);

create policy model_provider_routing_state_owner_all on public.model_provider_routing_state for all using (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
);

create policy model_entitlement_state_owner_all on public.model_entitlement_state for all using (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
);

create policy model_permission_state_owner_all on public.model_permission_state for all using (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
);

create policy model_source_authorization_state_owner_all on public.model_source_authorization_state for all using (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
);

create policy model_lifecycle_state_owner_all on public.model_lifecycle_state for all using (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
);

create policy model_owner_dashboard_state_owner_all on public.model_owner_dashboard_state for all using (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
);

create policy model_dignity_security_state_owner_all on public.model_dignity_security_state for all using (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
);

create policy model_blocked_economy_state_owner_all on public.model_blocked_economy_state for all using (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.models m join public.profiles p on p.id = m.profile_id where m.id = model_id and p.auth_user_id = auth.uid())
);
