-- ============================================================================
-- Feed author projection sync
-- Feed rows retain an author snapshot, while the canonical profile remains the
-- source of truth for username, display name, and avatar changes.
-- ============================================================================

create or replace function public.neuroartan_sync_feed_post_author_projection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_record public.profiles%rowtype;
begin
  select *
  into profile_record
  from public.profiles
  where id = new.profile_id;

  if profile_record.id is null then
    raise exception 'FEED_POST_PROFILE_REQUIRED';
  end if;

  new.owner_auth_user_id := profile_record.auth_user_id;
  new.author_username := coalesce(
    nullif(trim(profile_record.username), ''),
    nullif(trim(profile_record.username_lower), ''),
    nullif(trim(profile_record.username_normalized), ''),
    nullif(trim(profile_record.public_username), '')
  );
  new.author_display_name := coalesce(
    nullif(trim(profile_record.public_display_name), ''),
    nullif(trim(profile_record.display_name), ''),
    new.author_username
  );
  new.author_avatar_url := coalesce(
    nullif(trim(profile_record.public_avatar_url), ''),
    nullif(trim(profile_record.avatar_url), ''),
    nullif(trim(profile_record.photo_url), ''),
    ''
  );

  return new;
end;
$$;

drop trigger if exists neuroartan_sync_feed_post_author_projection
  on public.feed_posts;

create trigger neuroartan_sync_feed_post_author_projection
  before insert or update of profile_id
  on public.feed_posts
  for each row
  execute function public.neuroartan_sync_feed_post_author_projection();

create or replace function public.neuroartan_propagate_profile_feed_author_projection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.feed_posts
  set
    author_username = coalesce(
      nullif(trim(new.username), ''),
      nullif(trim(new.username_lower), ''),
      nullif(trim(new.username_normalized), ''),
      nullif(trim(new.public_username), '')
    ),
    author_display_name = coalesce(
      nullif(trim(new.public_display_name), ''),
      nullif(trim(new.display_name), ''),
      nullif(trim(new.username), ''),
      nullif(trim(new.username_lower), '')
    ),
    author_avatar_url = coalesce(
      nullif(trim(new.public_avatar_url), ''),
      nullif(trim(new.avatar_url), ''),
      nullif(trim(new.photo_url), ''),
      ''
    ),
    updated_at = now()
  where profile_id = new.id;

  return new;
end;
$$;

drop trigger if exists neuroartan_propagate_profile_feed_author_projection
  on public.profiles;

create trigger neuroartan_propagate_profile_feed_author_projection
  after update of username, username_lower, username_normalized, public_username,
    display_name, public_display_name, avatar_url, photo_url, public_avatar_url
  on public.profiles
  for each row
  execute function public.neuroartan_propagate_profile_feed_author_projection();

update public.feed_posts post
set
  owner_auth_user_id = profile.auth_user_id,
  author_username = coalesce(
    nullif(trim(profile.username), ''),
    nullif(trim(profile.username_lower), ''),
    nullif(trim(profile.username_normalized), ''),
    nullif(trim(profile.public_username), '')
  ),
  author_display_name = coalesce(
    nullif(trim(profile.public_display_name), ''),
    nullif(trim(profile.display_name), ''),
    nullif(trim(profile.username), ''),
    nullif(trim(profile.username_lower), '')
  ),
  author_avatar_url = coalesce(
    nullif(trim(profile.public_avatar_url), ''),
    nullif(trim(profile.avatar_url), ''),
    nullif(trim(profile.photo_url), ''),
    ''
  ),
  updated_at = now()
from public.profiles profile
where profile.id = post.profile_id;

drop policy if exists feed_posts_owner_update on public.feed_posts;

create policy feed_posts_owner_update
  on public.feed_posts
  for update
  using (auth.uid()::text = owner_auth_user_id::text)
  with check (auth.uid()::text = owner_auth_user_id::text);
