-- =============================================================================
-- Canonical model public cover contract
-- =============================================================================

alter table public.models
  add column if not exists model_cover_url text,
  add column if not exists model_type text not null default 'personal';
