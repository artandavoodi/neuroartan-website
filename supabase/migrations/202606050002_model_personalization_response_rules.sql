-- ============================================================================
-- Model Personalization Response Rules
-- Persists relationship-specific response behavior for the owner model.
-- Owner chain remains model_personalization_preferences.model_id -> models.profile_id
-- -> profiles.auth_user_id -> auth.uid() through the existing table policy.
-- ============================================================================

alter table public.model_personalization_preferences
  add column if not exists response_audience_rules jsonb not null default '{}'::jsonb;

update public.model_personalization_preferences
set response_audience_rules = coalesce(response_audience_rules, '{}'::jsonb)
where response_audience_rules is null;

alter table public.model_personalization_preferences
  alter column response_audience_rules set default '{}'::jsonb,
  alter column response_audience_rules set not null;
