/* =============================================================================
   PROFILE CHANGELOG STORE
   Durable owner-side profile changelog with Supabase and local fallback.
============================================================================= */

import {
  getSupabaseClient,
  normalizeString
} from '../account/identity/account-profile-identity.js';

const CHANGELOG_TABLE = 'profile_changelog_events';
const LOCAL_STORAGE_KEY = 'neuroartan.profile.changelog.events';

function isRelationMissing(error) {
  const code = normalizeString(error?.code || '').toUpperCase();
  const message = normalizeString(error?.message || '').toLowerCase();
  return code === '42P01' || message.includes('does not exist');
}

async function getCurrentUser() {
  const supabase = getSupabaseClient();
  if (!supabase?.auth) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session?.user || null;
}

function readLocalEvents() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalEvents(events = []) {
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events.slice(0, 200)));
  } catch {}
}

function normalizeEvent(event = {}, user = null) {
  const createdAt = event.created_at || event.createdAt || new Date().toISOString();
  return {
    id: normalizeString(event.id || `local-${createdAt}-${Math.random().toString(36).slice(2)}`),
    owner_auth_user_id: normalizeString(event.owner_auth_user_id || user?.id || user?.uid || ''),
    profile_id: normalizeString(event.profile_id || event.profileId || ''),
    event_area: normalizeString(event.event_area || event.area || 'profile'),
    event_action: normalizeString(event.event_action || event.action || 'updated'),
    event_title: normalizeString(event.event_title || event.title || 'Profile updated'),
    event_detail: normalizeString(event.event_detail || event.detail || ''),
    event_metadata: event.event_metadata || event.metadata || {},
    created_at: createdAt
  };
}

function saveLocalEvent(event) {
  const events = [event, ...readLocalEvents()].sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)));
  writeLocalEvents(events);
  return event;
}

function resolveRangeStart(range = 'all') {
  const normalizedRange = normalizeString(range || 'all').toLowerCase();
  if (!normalizedRange || normalizedRange === 'all') return '';

  const now = new Date();
  if (normalizedRange === 'today') {
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }

  const days = normalizedRange === '7d'
    ? 7
    : normalizedRange === '30d'
      ? 30
      : 0;

  if (!days) return '';
  now.setDate(now.getDate() - days);
  return now.toISOString();
}

export async function recordProfileChangelogEvent(event = {}) {
  const user = await getCurrentUser().catch(() => null);
  const payload = normalizeEvent(event, user);
  const supabase = getSupabaseClient();

  if (!supabase || !payload.owner_auth_user_id) {
    return saveLocalEvent(payload);
  }

  try {
    const { data, error } = await supabase
      .from(CHANGELOG_TABLE)
      .insert(payload)
      .select('id, owner_auth_user_id, profile_id, event_area, event_action, event_title, event_detail, event_metadata, created_at')
      .maybeSingle();

    if (error) throw error;
    return data || payload;
  } catch (error) {
    if (!isRelationMissing(error)) {
      console.warn('[profile-changelog-store] Supabase changelog insert failed.', error);
    }
    return saveLocalEvent(payload);
  }
}

export async function listProfileChangelogEvents(filters = {}) {
  const user = await getCurrentUser().catch(() => null);
  const ownerId = normalizeString(user?.id || user?.uid || '');
  const area = normalizeString(filters.area || 'all');
  const rangeStart = resolveRangeStart(filters.range);
  const supabase = getSupabaseClient();
  let backendEvents = [];

  if (supabase && ownerId) {
    try {
      let query = supabase
        .from(CHANGELOG_TABLE)
        .select('id, owner_auth_user_id, profile_id, event_area, event_action, event_title, event_detail, event_metadata, created_at')
        .eq('owner_auth_user_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (area && area !== 'all') {
        query = query.eq('event_area', area);
      }

      if (rangeStart) {
        query = query.gte('created_at', rangeStart);
      }

      const { data, error } = await query;
      if (error) throw error;
      backendEvents = Array.isArray(data) ? data : [];
    } catch (error) {
      if (!isRelationMissing(error)) {
        console.warn('[profile-changelog-store] Supabase changelog read failed.', error);
      }
    }
  }

  const eventsById = new Map();
  [...backendEvents, ...readLocalEvents()]
    .map((entry) => normalizeEvent(entry, user))
    .filter((entry) => !ownerId || !entry.owner_auth_user_id || entry.owner_auth_user_id === ownerId)
    .forEach((entry) => {
      eventsById.set(entry.id, entry);
    });

  return Array.from(eventsById.values())
    .filter((entry) => !area || area === 'all' || entry.event_area === area)
    .filter((entry) => !rangeStart || String(entry.created_at) >= rangeStart)
    .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)));
}
