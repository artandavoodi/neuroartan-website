create extension if not exists pgcrypto;

create table if not exists public.profile_follows (
  id uuid primary key default gen_random_uuid(),
  follower_profile_id uuid not null references public.profiles(id) on delete cascade,
  following_profile_id uuid not null references public.profiles(id) on delete cascade,
  follower_auth_user_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint profile_follows_no_self_follow_check
    check (follower_profile_id <> following_profile_id),
  constraint profile_follows_unique_pair
    unique (follower_profile_id, following_profile_id)
);

create table if not exists public.profile_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber_profile_id uuid not null references public.profiles(id) on delete cascade,
  subscribed_profile_id uuid not null references public.profiles(id) on delete cascade,
  subscriber_auth_user_id uuid not null,
  subscription_state text not null default 'active',
  subscription_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profile_subscriptions_no_self_subscription_check
    check (subscriber_profile_id <> subscribed_profile_id),
  constraint profile_subscriptions_state_check
    check (subscription_state = any (array['active'::text, 'paused'::text, 'cancelled'::text])),
  constraint profile_subscriptions_metadata_object_check
    check (jsonb_typeof(subscription_metadata) = 'object'),
  constraint profile_subscriptions_unique_pair
    unique (subscriber_profile_id, subscribed_profile_id)
);

create table if not exists public.feed_post_views (
  id uuid primary key default gen_random_uuid(),
  feed_post_id uuid not null references public.feed_posts(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  owner_auth_user_id uuid,
  viewer_session_id text,
  viewed_at timestamptz not null default timezone('utc', now())
);

create index if not exists profile_follows_following_profile_id_idx
  on public.profile_follows(following_profile_id);

create index if not exists profile_follows_follower_profile_id_idx
  on public.profile_follows(follower_profile_id);

create index if not exists profile_follows_follower_auth_user_id_idx
  on public.profile_follows(follower_auth_user_id);

create index if not exists profile_subscriptions_subscribed_profile_id_idx
  on public.profile_subscriptions(subscribed_profile_id);

create index if not exists profile_subscriptions_subscriber_profile_id_idx
  on public.profile_subscriptions(subscriber_profile_id);

create index if not exists profile_subscriptions_subscriber_auth_user_id_idx
  on public.profile_subscriptions(subscriber_auth_user_id);

create index if not exists profile_subscriptions_state_idx
  on public.profile_subscriptions(subscription_state);

create index if not exists feed_post_views_feed_post_id_idx
  on public.feed_post_views(feed_post_id, viewed_at desc);

create index if not exists feed_post_views_profile_id_idx
  on public.feed_post_views(profile_id);

create index if not exists feed_post_views_owner_auth_user_id_idx
  on public.feed_post_views(owner_auth_user_id);

create index if not exists feed_post_views_session_idx
  on public.feed_post_views(viewer_session_id)
  where viewer_session_id is not null;

alter table public.profile_follows enable row level security;
alter table public.profile_subscriptions enable row level security;
alter table public.feed_post_views enable row level security;

drop policy if exists profile_follows_public_select on public.profile_follows;
create policy profile_follows_public_select
  on public.profile_follows
  for select
  using (true);

drop policy if exists profile_follows_owner_insert on public.profile_follows;
create policy profile_follows_owner_insert
  on public.profile_follows
  for insert
  with check (
    auth.uid()::text = follower_auth_user_id::text
    and exists (
      select 1
      from public.profiles
      where profiles.id = follower_profile_id
        and profiles.auth_user_id = auth.uid()
    )
  );

drop policy if exists profile_follows_owner_delete on public.profile_follows;
create policy profile_follows_owner_delete
  on public.profile_follows
  for delete
  using (
    auth.uid()::text = follower_auth_user_id::text
    and exists (
      select 1
      from public.profiles
      where profiles.id = follower_profile_id
        and profiles.auth_user_id = auth.uid()
    )
  );

drop policy if exists profile_subscriptions_public_select on public.profile_subscriptions;
create policy profile_subscriptions_public_select
  on public.profile_subscriptions
  for select
  using (subscription_state = 'active');

drop policy if exists profile_subscriptions_owner_insert on public.profile_subscriptions;
create policy profile_subscriptions_owner_insert
  on public.profile_subscriptions
  for insert
  with check (
    auth.uid()::text = subscriber_auth_user_id::text
    and exists (
      select 1
      from public.profiles
      where profiles.id = subscriber_profile_id
        and profiles.auth_user_id = auth.uid()
    )
  );

drop policy if exists profile_subscriptions_owner_update on public.profile_subscriptions;
create policy profile_subscriptions_owner_update
  on public.profile_subscriptions
  for update
  using (
    auth.uid()::text = subscriber_auth_user_id::text
    and exists (
      select 1
      from public.profiles
      where profiles.id = subscriber_profile_id
        and profiles.auth_user_id = auth.uid()
    )
  )
  with check (
    auth.uid()::text = subscriber_auth_user_id::text
    and exists (
      select 1
      from public.profiles
      where profiles.id = subscriber_profile_id
        and profiles.auth_user_id = auth.uid()
    )
  );

drop policy if exists profile_subscriptions_owner_delete on public.profile_subscriptions;
create policy profile_subscriptions_owner_delete
  on public.profile_subscriptions
  for delete
  using (
    auth.uid()::text = subscriber_auth_user_id::text
    and exists (
      select 1
      from public.profiles
      where profiles.id = subscriber_profile_id
        and profiles.auth_user_id = auth.uid()
    )
  );

drop policy if exists feed_post_views_public_select on public.feed_post_views;
create policy feed_post_views_public_select
  on public.feed_post_views
  for select
  using (true);

drop policy if exists feed_post_views_public_insert on public.feed_post_views;
create policy feed_post_views_public_insert
  on public.feed_post_views
  for insert
  with check (
    (
      profile_id is null
      and owner_auth_user_id is null
    )
    or exists (
      select 1
      from public.profiles
      where profiles.id = feed_post_views.profile_id
        and profiles.auth_user_id = auth.uid()
        and feed_post_views.owner_auth_user_id = auth.uid()
    )
  );

drop policy if exists feed_post_interactions_owner_insert on public.feed_post_interactions;
create policy feed_post_interactions_owner_insert
  on public.feed_post_interactions
  for insert
  with check (
    auth.uid()::text = owner_auth_user_id::text
    and exists (
      select 1
      from public.profiles
      where profiles.id = profile_id
        and profiles.auth_user_id = auth.uid()
    )
  );

drop policy if exists feed_post_interactions_owner_delete on public.feed_post_interactions;
create policy feed_post_interactions_owner_delete
  on public.feed_post_interactions
  for delete
  using (
    auth.uid()::text = owner_auth_user_id::text
    and exists (
      select 1
      from public.profiles
      where profiles.id = profile_id
        and profiles.auth_user_id = auth.uid()
    )
  );

drop policy if exists feed_post_comments_owner_insert on public.feed_post_comments;
create policy feed_post_comments_owner_insert
  on public.feed_post_comments
  for insert
  with check (
    auth.uid()::text = owner_auth_user_id::text
    and exists (
      select 1
      from public.profiles
      where profiles.id = profile_id
        and profiles.auth_user_id = auth.uid()
    )
  );

drop policy if exists feed_post_comments_owner_update on public.feed_post_comments;
create policy feed_post_comments_owner_update
  on public.feed_post_comments
  for update
  using (
    auth.uid()::text = owner_auth_user_id::text
    and exists (
      select 1
      from public.profiles
      where profiles.id = profile_id
        and profiles.auth_user_id = auth.uid()
    )
  )
  with check (
    auth.uid()::text = owner_auth_user_id::text
    and exists (
      select 1
      from public.profiles
      where profiles.id = profile_id
        and profiles.auth_user_id = auth.uid()
    )
  );

drop policy if exists feed_post_comments_owner_delete on public.feed_post_comments;
create policy feed_post_comments_owner_delete
  on public.feed_post_comments
  for delete
  using (
    auth.uid()::text = owner_auth_user_id::text
    and exists (
      select 1
      from public.profiles
      where profiles.id = profile_id
        and profiles.auth_user_id = auth.uid()
    )
  );

create or replace function public.set_social_profile_public_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profile_subscriptions_updated_at on public.profile_subscriptions;
create trigger set_profile_subscriptions_updated_at
  before update on public.profile_subscriptions
  for each row
  execute function public.set_social_profile_public_updated_at();

comment on table public.profile_follows is 'Public profile social graph follow relationships owned by the follower profile.';
comment on table public.profile_subscriptions is 'Public profile subscription relationships owned by the subscriber profile.';
comment on table public.feed_post_views is 'Public feed post view events used for aggregate social media metrics.';
