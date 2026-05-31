-- ============================================================================
-- Model Personalization Preferences
-- Separates owner model behavior from ICOS/interface personalization.
-- Owner chain:
-- model_personalization_preferences.model_id → public.models.profile_id
-- → public.profiles.id → public.profiles.auth_user_id → auth.uid()
-- ============================================================================

create table if not exists public.model_personalization_preferences (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  language_style text not null default 'balanced',
  directness_level text not null default 'nuanced',
  emotional_tone text not null default 'neutral',
  response_length text not null default 'balanced',
  explanation_depth text not null default 'standard',
  memory_retention text not null default 'session',
  continuity_depth text not null default 'moderate',
  emotional_weighting text not null default 'balanced',
  empathy_level text not null default 'moderate',
  reflection_frequency text not null default 'never',
  reflection_depth text not null default 'moderate',
  sense_of_humor integer not null default 50 check (sense_of_humor between 0 and 100),
  efficiency_preference integer not null default 50 check (efficiency_preference between 0 and 100),
  creativity_level integer not null default 50 check (creativity_level between 0 and 100),
  risk_tolerance integer not null default 25 check (risk_tolerance between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint model_personalization_preferences_model_unique unique (model_id)
);

alter table public.model_personalization_preferences enable row level security;

drop policy if exists model_personalization_preferences_owner_all
  on public.model_personalization_preferences;

create policy model_personalization_preferences_owner_all
  on public.model_personalization_preferences
  for all
  using (
    exists (
      select 1
      from public.models m
      join public.profiles p on p.id = m.profile_id
      where m.id = model_id
        and p.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.models m
      join public.profiles p on p.id = m.profile_id
      where m.id = model_id
        and p.auth_user_id = auth.uid()
    )
  );
