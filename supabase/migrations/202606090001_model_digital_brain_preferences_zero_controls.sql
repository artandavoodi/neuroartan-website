-- Keep Digital Brain map preferences lossless across refreshes.
-- Slider controls must allow zero as an intentional user value.

alter table public.model_digital_brain_preferences
  add column if not exists display_mode text,
  add column if not exists motion_direction text,
  add column if not exists connection_visibility numeric,
  add column if not exists connection_pulse numeric,
  add column if not exists blur_intensity numeric,
  add column if not exists motion_speed numeric,
  add column if not exists color_intensity numeric;

create or replace function public.neuroartan_digital_brain_numeric_value(
  payload jsonb,
  payload_key text,
  column_value numeric,
  fallback_value numeric,
  minimum_value numeric,
  maximum_value numeric
)
returns numeric
language plpgsql
stable
as $$
declare
  resolved_value numeric;
begin
  if payload is not null and payload ? payload_key then
    begin
      resolved_value := nullif(payload ->> payload_key, '')::numeric;
    exception
      when others then
        resolved_value := null;
    end;
  end if;

  resolved_value := coalesce(resolved_value, column_value, fallback_value);
  return greatest(minimum_value, least(maximum_value, resolved_value));
end;
$$;

create or replace function public.neuroartan_digital_brain_text_value(
  payload jsonb,
  payload_key text,
  column_value text,
  fallback_value text,
  allowed_values text[]
)
returns text
language plpgsql
stable
as $$
declare
  resolved_value text;
begin
  if payload is not null and payload ? payload_key then
    resolved_value := nullif(payload ->> payload_key, '');
  end if;

  resolved_value := coalesce(resolved_value, nullif(column_value, ''), fallback_value);
  if resolved_value = any(allowed_values) then
    return resolved_value;
  end if;

  return fallback_value;
end;
$$;

create or replace function public.neuroartan_digital_brain_boolean_value(
  payload jsonb,
  payload_key text,
  column_value boolean,
  fallback_value boolean
)
returns boolean
language plpgsql
stable
as $$
declare
  resolved_value boolean;
begin
  if payload is not null and payload ? payload_key then
    begin
      resolved_value := (payload ->> payload_key)::boolean;
    exception
      when others then
        resolved_value := null;
    end;
  end if;

  return coalesce(resolved_value, column_value, fallback_value);
end;
$$;

create or replace function public.neuroartan_sync_model_digital_brain_preferences_payload()
returns trigger
language plpgsql
as $$
declare
  payload jsonb := coalesce(new.preferences_payload, '{}'::jsonb);
begin
  new.view_mode := public.neuroartan_digital_brain_text_value(
    payload,
    'view_mode',
    new.view_mode,
    'overview',
    array['overview', 'regions', 'nodes', 'connections']
  );
  new.display_mode := public.neuroartan_digital_brain_text_value(
    payload,
    'display_mode',
    new.display_mode,
    'nodes',
    array['nodes', 'scan', 'connectome']
  );
  new.motion_state := public.neuroartan_digital_brain_text_value(
    payload,
    'motion_state',
    new.motion_state,
    'playing',
    array['playing', 'paused']
  );
  new.motion_direction := public.neuroartan_digital_brain_text_value(
    payload,
    'motion_direction',
    new.motion_direction,
    'clockwise',
    array['clockwise', 'counterclockwise']
  );
  new.construct_nodes_visible := public.neuroartan_digital_brain_boolean_value(
    payload,
    'construct_nodes_visible',
    new.construct_nodes_visible,
    true
  );
  new.construct_labels_visible := public.neuroartan_digital_brain_boolean_value(
    payload,
    'construct_labels_visible',
    new.construct_labels_visible,
    true
  );

  new.node_scale := public.neuroartan_digital_brain_numeric_value(payload, 'node_scale', new.node_scale, 1, 0, 1.4);
  new.connection_scale := public.neuroartan_digital_brain_numeric_value(payload, 'connection_scale', new.connection_scale, 1, 0, 1.4);
  new.connection_visibility := public.neuroartan_digital_brain_numeric_value(payload, 'connection_visibility', new.connection_visibility, 1, 0, 2.5);
  new.connection_pulse := public.neuroartan_digital_brain_numeric_value(payload, 'connection_pulse', new.connection_pulse, 1, 0, 2.5);
  new.region_opacity := public.neuroartan_digital_brain_numeric_value(payload, 'region_opacity', new.region_opacity, 1, 0, 1);
  new.label_scale := public.neuroartan_digital_brain_numeric_value(payload, 'label_scale', new.label_scale, 1, 0, 1.35);
  new.construct_scale := public.neuroartan_digital_brain_numeric_value(payload, 'construct_scale', new.construct_scale, 1, 0, 2.4);
  new.construct_spread := public.neuroartan_digital_brain_numeric_value(payload, 'construct_spread', new.construct_spread, 1, 0, 1.65);
  new.signal_intensity := public.neuroartan_digital_brain_numeric_value(payload, 'signal_intensity', new.signal_intensity, 1, 0, 1.45);
  new.blur_intensity := public.neuroartan_digital_brain_numeric_value(payload, 'blur_intensity', new.blur_intensity, 1, 0, 2);
  new.motion_speed := public.neuroartan_digital_brain_numeric_value(payload, 'motion_speed', new.motion_speed, 1, 0, 2.5);
  new.color_intensity := public.neuroartan_digital_brain_numeric_value(payload, 'color_intensity', new.color_intensity, 1, 0, 1.6);
  new.zoom_level := public.neuroartan_digital_brain_numeric_value(payload, 'zoom_level', new.zoom_level, 1, 0.7, 2.4);

  new.rotate_x := coalesce(nullif(payload ->> 'rotate_x', ''), nullif(new.rotate_x, ''), '0deg');
  new.rotate_y := coalesce(nullif(payload ->> 'rotate_y', ''), nullif(new.rotate_y, ''), '0deg');
  new.focus_layer := coalesce(payload ->> 'focus_layer', new.focus_layer, '');
  new.focus_signal := coalesce(payload ->> 'focus_signal', new.focus_signal, '');
  new.focus_atlas := coalesce(payload ->> 'focus_atlas', new.focus_atlas, '');

  new.preferences_payload := payload || jsonb_build_object(
    'view_mode', new.view_mode,
    'display_mode', new.display_mode,
    'motion_state', new.motion_state,
    'motion_direction', new.motion_direction,
    'construct_nodes_visible', new.construct_nodes_visible,
    'construct_labels_visible', new.construct_labels_visible,
    'node_scale', new.node_scale,
    'connection_scale', new.connection_scale,
    'connection_visibility', new.connection_visibility,
    'connection_pulse', new.connection_pulse,
    'region_opacity', new.region_opacity,
    'label_scale', new.label_scale,
    'construct_scale', new.construct_scale,
    'construct_spread', new.construct_spread,
    'signal_intensity', new.signal_intensity,
    'blur_intensity', new.blur_intensity,
    'motion_speed', new.motion_speed,
    'color_intensity', new.color_intensity,
    'zoom_level', new.zoom_level,
    'rotate_x', new.rotate_x,
    'rotate_y', new.rotate_y,
    'focus_layer', new.focus_layer,
    'focus_signal', new.focus_signal,
    'focus_atlas', new.focus_atlas
  );
  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists neuroartan_sync_model_digital_brain_preferences_payload
  on public.model_digital_brain_preferences;

create trigger neuroartan_sync_model_digital_brain_preferences_payload
before insert or update
on public.model_digital_brain_preferences
for each row
execute function public.neuroartan_sync_model_digital_brain_preferences_payload();

update public.model_digital_brain_preferences
set preferences_payload = coalesce(preferences_payload, '{}'::jsonb);
