alter table public.profiles
  add column if not exists preferred_language text not null default 'en',
  add column if not exists preferred_language_direction text not null default 'ltr',
  add column if not exists locale_country_code text,
  add column if not exists locale_country_label text,
  add column if not exists locale_languages jsonb not null default '["en"]'::jsonb;

do $$
begin
  alter table public.profiles
    add constraint profiles_preferred_language_supported_check
    check (preferred_language in ('en', 'de', 'fa', 'es', 'fr', 'pt', 'ar', 'tr', 'zh', 'ja', 'ko', 'hi', 'ru', 'it', 'nl'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.profiles
    add constraint profiles_preferred_language_direction_check
    check (preferred_language_direction in ('ltr', 'rtl'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.profiles
    add constraint profiles_locale_languages_array_check
    check (jsonb_typeof(locale_languages) = 'array');
exception
  when duplicate_object then null;
end $$;
