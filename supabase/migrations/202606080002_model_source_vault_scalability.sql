-- Model Source Vault scalability support.
-- Keeps Source Vault data in the existing model_source_objects table while
-- allowing parent packages and large child file/chunk rows to be queried safely.

create index if not exists model_source_objects_model_kind_updated_idx
  on public.model_source_objects(model_id, source_kind, updated_at desc);

create index if not exists model_source_objects_model_reference_idx
  on public.model_source_objects(model_id, source_reference);

create index if not exists model_source_objects_source_metadata_gin_idx
  on public.model_source_objects using gin (source_metadata);

create index if not exists model_source_objects_source_vault_package_idx
  on public.model_source_objects(model_id, ((source_metadata ->> 'source_vault_package_id')));

create index if not exists model_source_objects_source_vault_role_idx
  on public.model_source_objects(model_id, ((source_metadata ->> 'source_vault_record_role')));

create index if not exists model_source_objects_source_vault_parent_idx
  on public.model_source_objects(model_id, ((source_metadata ->> 'source_vault_parent_reference')));
