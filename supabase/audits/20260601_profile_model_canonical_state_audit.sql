-- Profile/model canonical state audit
-- Read-only. Run in Supabase SQL Editor before applying repair migrations.

select jsonb_pretty(jsonb_build_object(
  'summary', jsonb_build_object(
    'profiles', (select count(*) from public.profiles),
    'active_profiles', (
      select count(*)
      from public.profiles
      where profile_exists = true
        and coalesce(profile_status, 'active') = 'active'
    ),
    'models', (select count(*) from public.models),
    'profiles_without_model', (
      select count(*)
      from public.profiles p
      left join public.models m on m.profile_id = p.id
      where p.profile_exists = true
        and m.id is null
    ),
    'models_without_profile', (
      select count(*)
      from public.models m
      left join public.profiles p on p.id = m.profile_id
      where p.id is null
    ),
    'duplicate_profile_accounts', (
      select count(*)
      from (
        select auth_user_id
        from public.profiles
        where auth_user_id is not null
        group by auth_user_id
        having count(*) > 1
      ) duplicates
    ),
    'duplicate_profile_models', (
      select count(*)
      from (
        select profile_id
        from public.models
        where profile_id is not null
        group by profile_id
        having count(*) > 1
      ) duplicates
    )
  ),
  'profiles', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'auth_user_id', p.auth_user_id,
      'username', coalesce(p.username, p.username_lower, p.public_username),
      'display_name', p.display_name,
      'profile_exists', p.profile_exists,
      'profile_complete', p.profile_complete,
      'profile_status', p.profile_status,
      'public_profile_enabled', p.public_profile_enabled,
      'public_profile_discoverable', p.public_profile_discoverable,
      'model_count', (
        select count(*)
        from public.models m
        where m.profile_id = p.id
      )
    ) order by p.created_at), '[]'::jsonb)
    from public.profiles p
  ),
  'models', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id,
      'profile_id', m.profile_id,
      'owner_auth_user_id', m.owner_auth_user_id,
      'model_slug', m.model_slug,
      'model_name', m.model_name,
      'creator_username', m.creator_username,
      'creator_display_name', m.creator_display_name,
      'lifecycle_state', m.lifecycle_state,
      'model_visibility', m.model_visibility,
      'publication_state', m.publication_state,
      'created_at', m.created_at
    ) order by m.created_at), '[]'::jsonb)
    from public.models m
  ),
  'active_model_preferences', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'auth_user_id', preference.auth_user_id,
      'profile_id', preference.profile_id,
      'model_id', preference.model_id,
      'source', preference.source,
      'updated_at', preference.updated_at
    ) order by preference.updated_at), '[]'::jsonb)
    from public.active_model_preferences preference
  ),
  'profile_model_mismatches', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'profile_id', p.id,
      'profile_auth_user_id', p.auth_user_id,
      'profile_username', coalesce(p.username, p.username_lower, p.public_username),
      'model_id', m.id,
      'model_owner_auth_user_id', m.owner_auth_user_id,
      'model_slug', m.model_slug,
      'issue', case
        when m.id is null then 'PROFILE_WITHOUT_MODEL'
        when p.id is null then 'MODEL_WITHOUT_PROFILE'
        when p.auth_user_id is distinct from m.owner_auth_user_id then 'OWNER_MISMATCH'
        when coalesce(p.username, p.username_lower, p.public_username) is distinct from m.model_slug then 'USERNAME_SLUG_MISMATCH'
      end
    )), '[]'::jsonb)
    from public.profiles p
    full outer join public.models m on m.profile_id = p.id
    where m.id is null
      or p.id is null
      or p.auth_user_id is distinct from m.owner_auth_user_id
      or coalesce(p.username, p.username_lower, p.public_username) is distinct from m.model_slug
  )
)) as profile_model_canonical_state_audit;
