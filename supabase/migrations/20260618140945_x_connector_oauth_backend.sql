-- X connector OAuth backend.
-- Owns connector state persistence, short-lived OAuth sessions, and encrypted
-- provider token references for server-side Edge Functions.

begin;

create extension if not exists pgcrypto;

create or replace function public.set_privacy_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.privacy_connector_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  model_id uuid references public.models(id) on delete cascade,
  connector_service text not null,
  connector_label text not null,
  connector_category text not null default 'general',
  runtime text not null default 'oauth-required',
  connection_state text not null default 'not-connected',
  source_vault_ready boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint privacy_connector_state_user_service_unique unique (user_id, connector_service)
);

alter table public.privacy_connector_state
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade,
  add column if not exists model_id uuid references public.models(id) on delete cascade,
  add column if not exists connector_label text,
  add column if not exists connector_category text not null default 'general',
  add column if not exists runtime text not null default 'oauth-required',
  add column if not exists connection_state text not null default 'not-connected',
  add column if not exists source_vault_ready boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.privacy_connector_state
set connector_label = connector_service
where connector_label is null;

alter table public.privacy_connector_state
  alter column connector_label set not null;

do $$ begin
  alter table public.privacy_connector_state
    add constraint privacy_connector_state_user_service_unique unique (user_id, connector_service);
exception when duplicate_object then null;
end $$;

create table if not exists public.connector_oauth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  model_id uuid references public.models(id) on delete cascade,
  connector_service text not null,
  oauth_state text not null unique,
  code_verifier text not null,
  redirect_uri text not null,
  requested_scopes text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  session_status text not null default 'pending',
  error_message text,
  expires_at timestamptz not null default timezone('utc', now()) + interval '15 minutes',
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.connector_oauth_sessions
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade,
  add column if not exists model_id uuid references public.models(id) on delete cascade,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.connector_token_vault (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  model_id uuid references public.models(id) on delete cascade,
  source_connector_id uuid references public.model_source_connectors(id) on delete cascade,
  connector_service text not null,
  provider_account_id text,
  provider_account_handle text,
  encrypted_access_token text not null,
  encrypted_refresh_token text,
  token_type text,
  scope text,
  expires_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists privacy_connector_state_user_idx
  on public.privacy_connector_state(user_id);

create index if not exists privacy_connector_state_model_idx
  on public.privacy_connector_state(model_id);

create index if not exists connector_oauth_sessions_state_idx
  on public.connector_oauth_sessions(oauth_state);

create index if not exists connector_oauth_sessions_user_service_idx
  on public.connector_oauth_sessions(user_id, connector_service, created_at desc);

create index if not exists connector_token_vault_user_service_idx
  on public.connector_token_vault(user_id, connector_service, updated_at desc);

create index if not exists connector_token_vault_connector_idx
  on public.connector_token_vault(source_connector_id);

drop trigger if exists set_privacy_connector_state_updated_at on public.privacy_connector_state;
create trigger set_privacy_connector_state_updated_at
before update on public.privacy_connector_state
for each row execute function public.set_privacy_updated_at();

drop trigger if exists set_connector_oauth_sessions_updated_at on public.connector_oauth_sessions;
create trigger set_connector_oauth_sessions_updated_at
before update on public.connector_oauth_sessions
for each row execute function public.set_privacy_updated_at();

drop trigger if exists set_connector_token_vault_updated_at on public.connector_token_vault;
create trigger set_connector_token_vault_updated_at
before update on public.connector_token_vault
for each row execute function public.set_privacy_updated_at();

alter table public.privacy_connector_state enable row level security;
alter table public.connector_oauth_sessions enable row level security;
alter table public.connector_token_vault enable row level security;

drop policy if exists privacy_connector_state_owner_select on public.privacy_connector_state;
create policy privacy_connector_state_owner_select
  on public.privacy_connector_state for select
  using (auth.uid() = user_id);

drop policy if exists privacy_connector_state_owner_insert on public.privacy_connector_state;
create policy privacy_connector_state_owner_insert
  on public.privacy_connector_state for insert
  with check (auth.uid() = user_id);

drop policy if exists privacy_connector_state_owner_update on public.privacy_connector_state;
create policy privacy_connector_state_owner_update
  on public.privacy_connector_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists privacy_connector_state_owner_delete on public.privacy_connector_state;
create policy privacy_connector_state_owner_delete
  on public.privacy_connector_state for delete
  using (auth.uid() = user_id);


drop policy if exists connector_oauth_sessions_owner_select on public.connector_oauth_sessions;
create policy connector_oauth_sessions_owner_select
  on public.connector_oauth_sessions for select
  using (auth.uid() = user_id);

drop policy if exists connector_oauth_sessions_owner_insert on public.connector_oauth_sessions;
create policy connector_oauth_sessions_owner_insert
  on public.connector_oauth_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists connector_oauth_sessions_owner_update on public.connector_oauth_sessions;
create policy connector_oauth_sessions_owner_update
  on public.connector_oauth_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists connector_oauth_sessions_owner_delete on public.connector_oauth_sessions;
create policy connector_oauth_sessions_owner_delete
  on public.connector_oauth_sessions for delete
  using (auth.uid() = user_id);

drop policy if exists connector_token_vault_owner_select on public.connector_token_vault;
create policy connector_token_vault_owner_select
  on public.connector_token_vault for select
  using (auth.uid() = user_id);

drop policy if exists connector_token_vault_owner_insert on public.connector_token_vault;
create policy connector_token_vault_owner_insert
  on public.connector_token_vault for insert
  with check (auth.uid() = user_id);

drop policy if exists connector_token_vault_owner_update on public.connector_token_vault;
create policy connector_token_vault_owner_update
  on public.connector_token_vault for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists connector_token_vault_owner_delete on public.connector_token_vault;
create policy connector_token_vault_owner_delete
  on public.connector_token_vault for delete
  using (auth.uid() = user_id);

commit;
