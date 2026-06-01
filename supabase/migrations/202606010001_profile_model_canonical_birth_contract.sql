-- Canonical profile/model birth contract
-- One account owns one profile. One profile owns one canonical personal model.

create unique index if not exists profiles_auth_user_id_unique_idx
  on public.profiles(auth_user_id)
  where auth_user_id is not null;

create unique index if not exists models_profile_id_unique_idx
  on public.models(profile_id)
  where profile_id is not null;
