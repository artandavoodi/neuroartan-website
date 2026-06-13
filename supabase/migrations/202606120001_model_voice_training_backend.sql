-- Model Voice Training backend.
-- Voice is biometric-like continuity material and remains owner-private until
-- explicit activation and legacy consent states are granted.

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('model-voice-samples', 'model-voice-samples', false)
on conflict (id) do nothing;

alter table public.model_voice_training_state
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade,
  add column if not exists owner_auth_user_id uuid,
  add column if not exists sample_count integer not null default 0,
  add column if not exists readiness_state text not null default 'not_started',
  add column if not exists readiness_score numeric not null default 0,
  add column if not exists sample_coverage jsonb not null default '{}'::jsonb,
  add column if not exists emotion_coverage jsonb not null default '{}'::jsonb,
  add column if not exists transcript_state text not null default 'not_started',
  add column if not exists speech_to_text_state text not null default 'not_started',
  add column if not exists text_to_speech_state text not null default 'not_started',
  add column if not exists synthesis_state text not null default 'not_started',
  add column if not exists training_pipeline_state text not null default 'not_started',
  add column if not exists consent_state text not null default 'not_yet_granted',
  add column if not exists verification_state text not null default 'not_verified',
  add column if not exists activation_state text not null default 'inactive',
  add column if not exists last_sample_at timestamptz,
  add column if not exists state_payload jsonb not null default '{}'::jsonb;

create unique index if not exists model_voice_training_state_model_unique
  on public.model_voice_training_state(model_id);

create index if not exists model_voice_training_state_owner_idx
  on public.model_voice_training_state(owner_auth_user_id, updated_at desc);

create table if not exists public.model_voice_training_samples (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null references auth.users(id) on delete cascade,
  privacy_voice_record_id uuid references public.privacy_voice_registry(id) on delete set null,
  sample_title text not null,
  sample_origin text not null default 'guided_recording',
  prompt_id text,
  prompt_text text,
  emotional_tone text not null default 'neutral',
  expression_mode text not null default 'spoken',
  sample_status text not null default 'received',
  quality_state text not null default 'pending_review',
  quality_score numeric not null default 0,
  transcript_text text,
  transcript_status text not null default 'pending',
  audio_storage_bucket text,
  audio_storage_path text,
  audio_mime_type text,
  audio_size_bytes bigint,
  duration_seconds numeric,
  feature_reference text,
  training_split text not null default 'calibration',
  readiness_weight numeric not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists model_voice_training_samples_model_updated_idx
  on public.model_voice_training_samples(model_id, updated_at desc);

create index if not exists model_voice_training_samples_tone_idx
  on public.model_voice_training_samples(model_id, emotional_tone);

create index if not exists model_voice_training_samples_owner_idx
  on public.model_voice_training_samples(owner_auth_user_id, updated_at desc);

create index if not exists model_voice_training_samples_profile_idx
  on public.model_voice_training_samples(profile_id, updated_at desc);

create index if not exists model_voice_training_samples_status_idx
  on public.model_voice_training_samples(model_id, sample_status);

create or replace function public.neuroartan_update_model_voice_training_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_model_id uuid;
  target_profile_id uuid;
  target_owner_auth_user_id uuid;
  sample_total integer;
  tone_total integer;
  next_score numeric;
  next_readiness text;
begin
  if tg_op = 'DELETE' and not exists (
    select 1
    from public.model_voice_training_samples
    where model_id = old.model_id
  ) then
    update public.model_voice_training_state
    set sample_count = 0,
        readiness_state = 'not_started',
        readiness_score = 0,
        sample_coverage = jsonb_build_object('sample_count', 0, 'target_sample_count', 12),
        emotion_coverage = jsonb_build_object('tone_count', 0, 'target_tone_count', 8),
        training_pipeline_state = 'not_started',
        last_sample_at = null,
        state_payload = jsonb_build_object('sample_count', 0, 'tone_count', 0, 'readiness_score', 0),
        updated_at = timezone('utc', now())
    where model_id = old.model_id;

    return old;
  end if;

  if tg_op = 'DELETE' then
    target_model_id := old.model_id;
    target_profile_id := old.profile_id;
    target_owner_auth_user_id := old.owner_auth_user_id;
  else
    target_model_id := new.model_id;
    target_profile_id := new.profile_id;
    target_owner_auth_user_id := new.owner_auth_user_id;
  end if;

  select
    count(*)::integer,
    count(distinct emotional_tone)::integer
  into sample_total, tone_total
  from public.model_voice_training_samples
  where model_id = target_model_id
    and sample_status <> 'removed';

  next_score := least(100, round(((least(sample_total, 12) / 12.0) * 65 + (least(tone_total, 8) / 8.0) * 35)::numeric, 2));
  next_readiness := case
    when sample_total >= 12 and tone_total >= 8 then 'ready_for_review'
    when sample_total >= 6 and tone_total >= 4 then 'forming'
    when sample_total > 0 then 'initial'
    else 'not_started'
  end;

  insert into public.model_voice_training_state (
    model_id,
    profile_id,
    owner_auth_user_id,
    sample_count,
    readiness_state,
    readiness_score,
    sample_coverage,
    emotion_coverage,
    consent_state,
    verification_state,
    activation_state,
    training_pipeline_state,
    last_sample_at,
    state_payload,
    updated_at
  )
  values (
    target_model_id,
    target_profile_id,
    target_owner_auth_user_id,
    sample_total,
    next_readiness,
    next_score,
    jsonb_build_object('sample_count', sample_total, 'target_sample_count', 12),
    jsonb_build_object('tone_count', tone_total, 'target_tone_count', 8),
    'not_yet_granted',
    'not_verified',
    'inactive',
    case when sample_total > 0 then 'sample_collection' else 'not_started' end,
    case when sample_total > 0 then timezone('utc', now()) else null end,
    jsonb_build_object('sample_count', sample_total, 'tone_count', tone_total, 'readiness_score', next_score),
    timezone('utc', now())
  )
  on conflict (model_id) do update
  set profile_id = excluded.profile_id,
      owner_auth_user_id = excluded.owner_auth_user_id,
      sample_count = excluded.sample_count,
      readiness_state = excluded.readiness_state,
      readiness_score = excluded.readiness_score,
      sample_coverage = excluded.sample_coverage,
      emotion_coverage = excluded.emotion_coverage,
      training_pipeline_state = excluded.training_pipeline_state,
      last_sample_at = excluded.last_sample_at,
      state_payload = excluded.state_payload,
      updated_at = excluded.updated_at;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.neuroartan_sync_model_voice_training_sample_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  model_record record;
begin
  select
    m.profile_id,
    coalesce(m.owner_auth_user_id, p.auth_user_id) as owner_auth_user_id
  into model_record
  from public.models m
  left join public.profiles p on p.id = m.profile_id
  where m.id = new.model_id;

  if not found then
    raise exception 'MODEL_NOT_FOUND for model %', new.model_id;
  end if;

  if model_record.owner_auth_user_id is null then
    raise exception 'MODEL_OWNER_REQUIRED for model %', new.model_id;
  end if;

  new.profile_id := model_record.profile_id;
  new.owner_auth_user_id := model_record.owner_auth_user_id;

  return new;
end;
$$;

create or replace function public.neuroartan_set_model_voice_training_sample_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists sync_model_voice_training_sample_owner on public.model_voice_training_samples;
create trigger sync_model_voice_training_sample_owner
before insert or update on public.model_voice_training_samples
for each row execute function public.neuroartan_sync_model_voice_training_sample_owner();

drop trigger if exists set_model_voice_training_samples_updated_at on public.model_voice_training_samples;
create trigger set_model_voice_training_samples_updated_at
before update on public.model_voice_training_samples
for each row execute function public.neuroartan_set_model_voice_training_sample_updated_at();

drop trigger if exists update_model_voice_training_state_after_sample_insert on public.model_voice_training_samples;
create trigger update_model_voice_training_state_after_sample_insert
after insert on public.model_voice_training_samples
for each row execute function public.neuroartan_update_model_voice_training_state();

drop trigger if exists update_model_voice_training_state_after_sample_update on public.model_voice_training_samples;
create trigger update_model_voice_training_state_after_sample_update
after update on public.model_voice_training_samples
for each row execute function public.neuroartan_update_model_voice_training_state();

drop trigger if exists update_model_voice_training_state_after_sample_delete on public.model_voice_training_samples;
create trigger update_model_voice_training_state_after_sample_delete
after delete on public.model_voice_training_samples
for each row execute function public.neuroartan_update_model_voice_training_state();

alter table public.model_voice_training_samples enable row level security;

alter table public.model_voice_training_state enable row level security;

drop policy if exists model_voice_training_state_owner_all on public.model_voice_training_state;

drop policy if exists model_voice_training_state_owner_select on public.model_voice_training_state;
create policy model_voice_training_state_owner_select on public.model_voice_training_state
  for select to authenticated
  using (
    exists (
      select 1
      from public.models model
      join public.profiles profile on profile.id = model.profile_id
      where model.id = public.model_voice_training_state.model_id
        and profile.auth_user_id = auth.uid()
    )
  );

drop policy if exists model_voice_training_state_owner_insert on public.model_voice_training_state;
create policy model_voice_training_state_owner_insert on public.model_voice_training_state
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.models model
      join public.profiles profile on profile.id = model.profile_id
      where model.id = public.model_voice_training_state.model_id
        and profile.auth_user_id = auth.uid()
    )
  );

drop policy if exists model_voice_training_state_owner_update on public.model_voice_training_state;
create policy model_voice_training_state_owner_update on public.model_voice_training_state
  for update to authenticated
  using (
    exists (
      select 1
      from public.models model
      join public.profiles profile on profile.id = model.profile_id
      where model.id = public.model_voice_training_state.model_id
        and profile.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.models model
      join public.profiles profile on profile.id = model.profile_id
      where model.id = public.model_voice_training_state.model_id
        and profile.auth_user_id = auth.uid()
    )
  );

drop policy if exists model_voice_training_samples_owner_all on public.model_voice_training_samples;
create policy model_voice_training_samples_owner_all on public.model_voice_training_samples
  for all to authenticated using (
    auth.uid() = owner_auth_user_id
  ) with check (
    auth.uid() = owner_auth_user_id
    and exists (
      select 1
      from public.models model
      join public.profiles profile on profile.id = model.profile_id
      where model.id = public.model_voice_training_samples.model_id
        and profile.id = public.model_voice_training_samples.profile_id
        and profile.auth_user_id = auth.uid()
    )
  );

drop policy if exists model_voice_samples_owner_select on storage.objects;
create policy model_voice_samples_owner_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'model-voice-samples'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists model_voice_samples_owner_insert on storage.objects;
create policy model_voice_samples_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'model-voice-samples'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists model_voice_samples_owner_update on storage.objects;
create policy model_voice_samples_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'model-voice-samples'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'model-voice-samples'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists model_voice_samples_owner_delete on storage.objects;
create policy model_voice_samples_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'model-voice-samples'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
