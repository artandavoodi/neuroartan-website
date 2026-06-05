/* =============================================================================
   MODEL VISIBILITY PREFERENCES
   Owner-controlled model discoverability and relationship visibility state.
============================================================================= */

create table if not exists public.model_visibility_preferences (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  visibility_scope text not null default 'general',
  public_visible boolean not null default true,
  friends_visible boolean not null default true,
  followers_visible boolean not null default true,
  mutuals_visible boolean not null default true,
  family_visible boolean not null default true,
  subscribers_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(model_id)
);

alter table public.model_visibility_preferences enable row level security;

drop policy if exists model_visibility_preferences_owner_select on public.model_visibility_preferences;
create policy model_visibility_preferences_owner_select on public.model_visibility_preferences
  for select using (
    exists (
      select 1
      from public.models m
      where m.id = model_id
        and auth.uid()::text = m.owner_auth_user_id::text
    )
  );

drop policy if exists model_visibility_preferences_owner_insert on public.model_visibility_preferences;
create policy model_visibility_preferences_owner_insert on public.model_visibility_preferences
  for insert with check (
    exists (
      select 1
      from public.models m
      where m.id = model_id
        and auth.uid()::text = m.owner_auth_user_id::text
    )
  );

drop policy if exists model_visibility_preferences_owner_update on public.model_visibility_preferences;
create policy model_visibility_preferences_owner_update on public.model_visibility_preferences
  for update using (
    exists (
      select 1
      from public.models m
      where m.id = model_id
        and auth.uid()::text = m.owner_auth_user_id::text
    )
  ) with check (
    exists (
      select 1
      from public.models m
      where m.id = model_id
        and auth.uid()::text = m.owner_auth_user_id::text
    )
  );

drop policy if exists models_public_published_select on public.models;
create policy models_public_published_select on public.models
  for select
  to anon, authenticated
  using (model_visibility = 'public' and publication_state = 'published');

insert into public.model_visibility_preferences (
  model_id,
  visibility_scope,
  public_visible,
  friends_visible,
  followers_visible,
  mutuals_visible,
  family_visible,
  subscribers_visible,
  updated_at
)
select
  m.id,
  'general',
  (m.model_visibility = 'public' and m.publication_state = 'published'),
  (m.model_visibility = 'public' and m.publication_state = 'published'),
  (m.model_visibility = 'public' and m.publication_state = 'published'),
  (m.model_visibility = 'public' and m.publication_state = 'published'),
  (m.model_visibility = 'public' and m.publication_state = 'published'),
  (m.model_visibility = 'public' and m.publication_state = 'published'),
  now()
from public.models m
on conflict (model_id) do update set
  public_visible = excluded.public_visible,
  friends_visible = excluded.friends_visible,
  followers_visible = excluded.followers_visible,
  mutuals_visible = excluded.mutuals_visible,
  family_visible = excluded.family_visible,
  subscribers_visible = excluded.subscribers_visible,
  updated_at = now();
