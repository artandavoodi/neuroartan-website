-- =============================================================================
-- Canonical model public cover contract
-- =============================================================================

alter table public.models
  add column if not exists model_cover_url text;
