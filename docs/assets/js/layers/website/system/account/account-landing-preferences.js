/* =============================================================================
   ACCOUNT LANDING PREFERENCES
   Shared account landing target for post-auth navigation.
============================================================================= */

import { recordProfileChangelogEvent } from '../profile/profile-changelog-store.js';

const STORAGE_KEY = 'neuroartan.account.defaultLanding';
const PROFILE_TABLE = 'profiles';

const LANDING_TARGETS = Object.freeze({
  feed: '/feed/',
  stage: '/'
});

function normalizeLandingTarget(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(LANDING_TARGETS, normalized)
    ? normalized
    : 'feed';
}

function getSupabaseClient() {
  return window.neuroartanSupabase || window.NEUROARTAN_SUPABASE_CLIENT || null;
}

function getStoredLandingTarget() {
  try {
    return normalizeLandingTarget(window.localStorage.getItem(STORAGE_KEY) || '');
  } catch {
    return 'feed';
  }
}

function setStoredLandingTarget(value) {
  const normalized = normalizeLandingTarget(value);
  try {
    window.localStorage.setItem(STORAGE_KEY, normalized);
  } catch {}
  document.dispatchEvent(new CustomEvent('account:landing-preference-changed', {
    detail: {
      target: normalized,
      href: LANDING_TARGETS[normalized]
    }
  }));
  return normalized;
}

export function readAccountLandingPreference() {
  return getStoredLandingTarget();
}

export function resolveAccountLandingHref(value = readAccountLandingPreference()) {
  return LANDING_TARGETS[normalizeLandingTarget(value)] || LANDING_TARGETS.feed;
}

export async function syncAccountLandingPreferenceToSupabase(value = readAccountLandingPreference()) {
  const supabase = getSupabaseClient();
  if (!supabase?.auth) return false;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    const userId = String(data?.user?.id || '').trim();
    if (!userId) return false;

    const normalized = normalizeLandingTarget(value);
    const { error: updateError } = await supabase
      .from(PROFILE_TABLE)
      .update({ default_landing_surface: normalized })
      .eq('auth_user_id', userId);

    if (updateError) throw updateError;
    return true;
  } catch (error) {
    console.warn('[account-landing-preferences] Supabase sync skipped.', error);
    return false;
  }
}

export async function hydrateAccountLandingPreferenceFromSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase?.auth) return readAccountLandingPreference();

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    const userId = String(data?.user?.id || '').trim();
    if (!userId) return readAccountLandingPreference();

    const { data: profile, error: profileError } = await supabase
      .from(PROFILE_TABLE)
      .select('default_landing_surface')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (profile?.default_landing_surface) {
      return setStoredLandingTarget(profile.default_landing_surface);
    }
  } catch (error) {
    console.warn('[account-landing-preferences] Supabase hydration skipped.', error);
  }

  return readAccountLandingPreference();
}

export function writeAccountLandingPreference(value, options = {}) {
  const normalized = setStoredLandingTarget(value);
  if (options.sync !== false) {
    void syncAccountLandingPreferenceToSupabase(normalized);
  }
  void recordProfileChangelogEvent({
    area: 'general',
    action: 'default_landing_changed',
    title: 'Default landing updated',
    detail: `Default landing was set to ${normalized === 'stage' ? 'Stage' : 'Feed'}.`,
    metadata: {
      default_landing_surface: normalized
    }
  });
  return normalized;
}
