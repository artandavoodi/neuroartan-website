-- ============================================================================
-- Canonical model child profile identity sync
-- Every model child row derives profile_id from public.models.profile_id.
-- ============================================================================

begin;

create or replace function public.neuroartan_sync_model_child_profile_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_profile_id uuid;
begin
  if new.model_id is null then
    raise exception 'MODEL_ID_REQUIRED';
  end if;

  select m.profile_id
    into resolved_profile_id
  from public.models m
  where m.id = new.model_id;

  if resolved_profile_id is null then
    raise exception 'MODEL_PROFILE_REQUIRED for model %', new.model_id;
  end if;

  new.profile_id := resolved_profile_id;
  return new;
end;
$$;

do $$
declare
  relation_name text;
begin
  for relation_name in
    select distinct c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name like 'model\_%' escape '\'
      and c.column_name = 'model_id'
  loop
    execute format(
      'alter table public.%I
       add column if not exists profile_id uuid references public.profiles(id) on delete cascade',
      relation_name
    );

    execute format(
      'update public.%I child
       set profile_id = model.profile_id
       from public.models model
       where child.model_id = model.id
         and child.profile_id is distinct from model.profile_id',
      relation_name
    );

    execute format(
      'drop trigger if exists neuroartan_sync_model_child_profile_id on public.%I',
      relation_name
    );

    execute format(
      'create trigger neuroartan_sync_model_child_profile_id
       before insert or update of model_id, profile_id on public.%I
       for each row
       execute function public.neuroartan_sync_model_child_profile_id()',
      relation_name
    );
  end loop;
end;
$$;

alter table public.model_birth_certificates
  alter column profile_id set not null;

alter table public.model_identity_registry
  alter column profile_id set not null;

alter table public.model_public_identities
  alter column profile_id set not null;

alter table public.model_private_identities
  alter column profile_id set not null;

update public.model_private_identities identity
set
  private_name = coalesce(nullif(trim(identity.private_name), ''), model.model_name),
  updated_at = now()
from public.models model
where identity.model_id = model.id
  and nullif(trim(identity.private_name), '') is null;

update public.model_public_identities identity
set
  public_display_name = coalesce(nullif(trim(identity.public_display_name), ''), model.model_name),
  updated_at = now()
from public.models model
where identity.model_id = model.id
  and nullif(trim(identity.public_display_name), '') is null;

update public.models model
set
  birth_certificate_id = coalesce(model.birth_certificate_id, certificate.id),
  private_identity_id = coalesce(model.private_identity_id, private_identity.id),
  public_identity_id = coalesce(model.public_identity_id, public_identity.id),
  updated_at = now()
from public.model_birth_certificates certificate,
     public.model_private_identities private_identity,
     public.model_public_identities public_identity
where certificate.model_id = model.id
  and private_identity.model_id = model.id
  and public_identity.model_id = model.id
  and (
    model.birth_certificate_id is null
    or model.private_identity_id is null
    or model.public_identity_id is null
  );

commit;

select jsonb_build_object(
  'status', 'model_child_profile_identity_sync_complete',
  'models', (
    select count(*)
    from public.models
  ),
  'private_identities', (
    select count(*)
    from public.model_private_identities
  ),
  'public_identities', (
    select count(*)
    from public.model_public_identities
  ),
  'birth_certificates', (
    select count(*)
    from public.model_birth_certificates
  ),
  'invalid_private_identity_profile_links', (
    select count(*)
    from public.model_private_identities identity
    join public.models model on model.id = identity.model_id
    where identity.profile_id is distinct from model.profile_id
  )
) as model_child_profile_identity_sync;
