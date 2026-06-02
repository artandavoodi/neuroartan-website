-- Neuroartan ICOS assistant avatar ownership sync
-- Profile media and ICOS assistant media are sovereign avatar layers.

alter table public.profiles
  add column if not exists assistant_avatar_url text,
  add column if not exists assistant_avatar_storage_path text;

update public.profiles
set
  assistant_avatar_url = null,
  assistant_avatar_storage_path = null,
  updated_at = now()
where nullif(trim(coalesce(assistant_avatar_url, '')), '') is not null
  and nullif(trim(coalesce(assistant_avatar_storage_path, '')), '') is null
  and nullif(trim(coalesce(avatar_url, '')), '') = nullif(trim(coalesce(assistant_avatar_url, '')), '');
