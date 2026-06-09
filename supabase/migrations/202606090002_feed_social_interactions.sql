create table if not exists public.feed_post_interactions (
  id uuid primary key default gen_random_uuid(),
  feed_post_id uuid not null references public.feed_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null,
  interaction_type text not null check (interaction_type in ('like', 'repost', 'bookmark', 'share')),
  created_at timestamptz not null default now(),
  unique(feed_post_id, profile_id, interaction_type)
);

create table if not exists public.feed_post_comments (
  id uuid primary key default gen_random_uuid(),
  feed_post_id uuid not null references public.feed_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  owner_auth_user_id uuid not null,
  author_username text,
  author_display_name text,
  author_avatar_url text,
  comment_body text not null,
  comment_state text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feed_post_interactions_post_idx
  on public.feed_post_interactions(feed_post_id, interaction_type);

create index if not exists feed_post_interactions_owner_idx
  on public.feed_post_interactions(owner_auth_user_id);

create index if not exists feed_post_comments_post_idx
  on public.feed_post_comments(feed_post_id, comment_state, created_at);

create index if not exists feed_post_comments_owner_idx
  on public.feed_post_comments(owner_auth_user_id);

alter table public.feed_post_interactions enable row level security;
alter table public.feed_post_comments enable row level security;

drop policy if exists feed_post_interactions_public_select on public.feed_post_interactions;
create policy feed_post_interactions_public_select
  on public.feed_post_interactions
  for select
  using (true);

drop policy if exists feed_post_interactions_owner_insert on public.feed_post_interactions;
create policy feed_post_interactions_owner_insert
  on public.feed_post_interactions
  for insert
  with check (auth.uid()::text = owner_auth_user_id::text);

drop policy if exists feed_post_interactions_owner_delete on public.feed_post_interactions;
create policy feed_post_interactions_owner_delete
  on public.feed_post_interactions
  for delete
  using (auth.uid()::text = owner_auth_user_id::text);

drop policy if exists feed_post_comments_public_select on public.feed_post_comments;
create policy feed_post_comments_public_select
  on public.feed_post_comments
  for select
  using (comment_state = 'published');

drop policy if exists feed_post_comments_owner_insert on public.feed_post_comments;
create policy feed_post_comments_owner_insert
  on public.feed_post_comments
  for insert
  with check (auth.uid()::text = owner_auth_user_id::text);

drop policy if exists feed_post_comments_owner_update on public.feed_post_comments;
create policy feed_post_comments_owner_update
  on public.feed_post_comments
  for update
  using (auth.uid()::text = owner_auth_user_id::text)
  with check (auth.uid()::text = owner_auth_user_id::text);

drop policy if exists feed_post_comments_owner_delete on public.feed_post_comments;
create policy feed_post_comments_owner_delete
  on public.feed_post_comments
  for delete
  using (auth.uid()::text = owner_auth_user_id::text);
