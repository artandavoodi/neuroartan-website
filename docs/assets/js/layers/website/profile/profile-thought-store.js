/* =============================================================================
   01) MODULE IMPORTS
   02) MODULE STATE
   03) STRUCTURED TAXONOMY
   04) VALUE HELPERS
   05) STORAGE HELPERS
   06) STATE DERIVATION
   07) STORE HELPERS
   08) COMPOSER ACTIONS
   09) RUNTIME SYNC
   10) INITIALIZATION
   ============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
   ============================================================================= */

import { getProfileRuntimeState, subscribeProfileRuntime } from './profile-runtime.js';
import { normalizeString } from '../system/account-profile-identity.js';

/* =============================================================================
   02) MODULE STATE
   ============================================================================= */

const STORAGE_PREFIX = 'neuroartan_profile_thought_surface_v1';
const STORE = (window.__NEUROARTAN_PROFILE_THOUGHT_STORE__ ||= {
  initialized: false,
  taxonomy: null,
  taxonomyPromise: null,
  runtimeState: null,
  state: null,
  storageKey: '',
  subscribers: new Set()
});

/* =============================================================================
   03) STRUCTURED TAXONOMY
   ============================================================================= */

const DEFAULT_TAXONOMY = Object.freeze({
  audiences: [
    { key: 'private', label: 'Private bank', summary: 'Owner-only captured reflections and thought records.' },
    { key: 'public', label: 'Public route', summary: 'Thoughts staged for company-domain public presence.' }
  ],
  categories: [
    { key: 'identity', label: 'Identity', summary: 'Self-definition, role, and personal orientation.' },
    { key: 'memory', label: 'Memory', summary: 'Recollection, continuity, and remembered context.' },
    { key: 'strategy', label: 'Strategy', summary: 'Decision-making, direction, and long-range planning.' },
    { key: 'voice', label: 'Voice', summary: 'Language, articulation, and public expression.' }
  ]
});

function assetPath(path) {
  if (window.NeuroartanFragmentAuthorities?.assetPath) {
    return window.NeuroartanFragmentAuthorities.assetPath(path);
  }

  const normalized = normalizeString(path);
  if (!normalized) return '';
  return normalized.startsWith('/') ? normalized.slice(1) : normalized;
}

export async function loadProfileThoughtTaxonomy() {
  if (STORE.taxonomy) return STORE.taxonomy;
  if (STORE.taxonomyPromise) return STORE.taxonomyPromise;

  STORE.taxonomyPromise = fetch(assetPath('/assets/data/profile/private-thought-taxonomy.json'), {
    credentials: 'same-origin'
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Thought taxonomy request failed (${response.status}).`);
      }

      const payload = await response.json();
      const audiences = Array.isArray(payload?.audiences) ? payload.audiences : DEFAULT_TAXONOMY.audiences;
      const categories = Array.isArray(payload?.categories) ? payload.categories : DEFAULT_TAXONOMY.categories;

      STORE.taxonomy = {
        audiences: audiences
          .map((entry) => ({
            key: normalizeString(entry?.key || ''),
            label: normalizeString(entry?.label || ''),
            summary: normalizeString(entry?.summary || '')
          }))
          .filter((entry) => entry.key && entry.label),
        categories: categories
          .map((entry) => ({
            key: normalizeString(entry?.key || ''),
            label: normalizeString(entry?.label || ''),
            summary: normalizeString(entry?.summary || '')
          }))
          .filter((entry) => entry.key && entry.label)
      };

      if (!STORE.taxonomy.audiences.length) {
        STORE.taxonomy.audiences = DEFAULT_TAXONOMY.audiences.slice();
      }

      if (!STORE.taxonomy.categories.length) {
        STORE.taxonomy.categories = DEFAULT_TAXONOMY.categories.slice();
      }

      return STORE.taxonomy;
    })
    .catch((error) => {
      console.error('[profile-thought-store] Failed to load thought taxonomy.', error);
      STORE.taxonomy = {
        audiences: DEFAULT_TAXONOMY.audiences.slice(),
        categories: DEFAULT_TAXONOMY.categories.slice()
      };
      return STORE.taxonomy;
    })
    .finally(() => {
      STORE.taxonomyPromise = null;
    });

  return STORE.taxonomyPromise;
}

/* =============================================================================
   04) VALUE HELPERS
   ============================================================================= */

function normalizeAudience(value, taxonomy = STORE.taxonomy || DEFAULT_TAXONOMY) {
  const normalized = normalizeString(value);
  return taxonomy.audiences.some((entry) => entry.key === normalized)
    ? normalized
    : taxonomy.audiences[0]?.key || 'private';
}

function normalizeCategory(value, taxonomy = STORE.taxonomy || DEFAULT_TAXONOMY) {
  const normalized = normalizeString(value);
  return taxonomy.categories.some((entry) => entry.key === normalized)
    ? normalized
    : taxonomy.categories[0]?.key || 'identity';
}

function normalizeComposerText(value) {
  return String(value || '').replace(/\r\n/g, '\n');
}

function buildStorageKey(runtimeState = STORE.runtimeState || getProfileRuntimeState()) {
  const uid = normalizeString(runtimeState?.user?.uid || '');
  const username = normalizeString(runtimeState?.username?.normalized || '');
  const email = normalizeString(runtimeState?.email || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const identity = uid || username || email || 'guest';
  return `${STORAGE_PREFIX}:${identity}`;
}

function buildEntryId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `thought-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatEntryTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  try {
    return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  } catch (_) {
    return date.toISOString();
  }
}

/* =============================================================================
   05) STORAGE HELPERS
   ============================================================================= */

function readEntries(key) {
  if (!key) return [];

  try {
    const raw = window.localStorage?.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => ({
        id: normalizeString(entry?.id || '') || buildEntryId(),
        text: normalizeComposerText(entry?.text || '').trim(),
        audience: normalizeString(entry?.audience || ''),
        category: normalizeString(entry?.category || ''),
        createdAt: normalizeString(entry?.createdAt || '')
      }))
      .filter((entry) => entry.text && entry.createdAt);
  } catch (error) {
    console.error('[profile-thought-store] Failed to read local thought entries.', error);
    return [];
  }
}

function persistEntries(key, entries) {
  if (!key) return;

  try {
    window.localStorage?.setItem(key, JSON.stringify(entries));
  } catch (error) {
    console.error('[profile-thought-store] Failed to persist local thought entries.', error);
  }
}

/* =============================================================================
   06) STATE DERIVATION
   ============================================================================= */

function getThoughtTaxonomy() {
  return STORE.taxonomy || DEFAULT_TAXONOMY;
}

function buildDerivedState(nextState = {}) {
  const taxonomy = getThoughtTaxonomy();
  const runtimeState = nextState.runtimeState || STORE.runtimeState || getProfileRuntimeState();
  const entries = Array.isArray(nextState.entries) ? nextState.entries.slice() : [];
  const normalizedEntries = entries
    .map((entry) => ({
      id: normalizeString(entry?.id || '') || buildEntryId(),
      text: normalizeComposerText(entry?.text || '').trim(),
      audience: normalizeAudience(entry?.audience || 'private', taxonomy),
      category: normalizeCategory(entry?.category || '', taxonomy),
      createdAt: normalizeString(entry?.createdAt || '') || new Date().toISOString()
    }))
    .filter((entry) => entry.text)
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));

  const privateEntries = normalizedEntries.filter((entry) => entry.audience === 'private');
  const publicEntries = normalizedEntries.filter((entry) => entry.audience === 'public');
  const currentAudience = normalizeAudience(nextState.composerAudience || STORE.state?.composerAudience || 'private', taxonomy);
  const currentCategory = normalizeCategory(nextState.composerCategory || STORE.state?.composerCategory || '', taxonomy);

  return {
    runtimeState,
    taxonomy,
    storageKey: nextState.storageKey || STORE.storageKey || buildStorageKey(runtimeState),
    entries: normalizedEntries,
    privateEntries,
    publicEntries,
    totalEntries: normalizedEntries.length,
    composerAudience: currentAudience,
    composerCategory: currentCategory,
    composerText: normalizeComposerText(
      Object.prototype.hasOwnProperty.call(nextState, 'composerText')
        ? nextState.composerText
        : STORE.state?.composerText || ''
    ),
    submitStatus: nextState.submitStatus || STORE.state?.submitStatus || 'idle',
    submitMessage: nextState.submitMessage || STORE.state?.submitMessage || '',
    categoryCounts: taxonomy.categories.map((category) => ({
      ...category,
      count: normalizedEntries.filter((entry) => entry.category === category.key).length
    }))
  };
}

/* =============================================================================
   07) STORE HELPERS
   ============================================================================= */

function notifySubscribers() {
  STORE.subscribers.forEach((subscriber) => {
    try {
      subscriber(getProfileThoughtState());
    } catch (error) {
      console.error('[profile-thought-store] Subscriber update failed.', error);
    }
  });
}

function setThoughtState(nextState = {}) {
  STORE.state = buildDerivedState(nextState);
  notifySubscribers();
}

export function getProfileThoughtState() {
  return STORE.state || buildDerivedState();
}

export function subscribeProfileThoughtState(subscriber) {
  if (typeof subscriber !== 'function') {
    return () => {};
  }

  STORE.subscribers.add(subscriber);
  subscriber(getProfileThoughtState());

  return () => {
    STORE.subscribers.delete(subscriber);
  };
}

function hydrateThoughtState(runtimeState = STORE.runtimeState || getProfileRuntimeState()) {
  STORE.runtimeState = runtimeState;

  const storageKey = buildStorageKey(runtimeState);
  const shouldReloadEntries = storageKey !== STORE.storageKey;
  STORE.storageKey = storageKey;

  const entries = shouldReloadEntries ? readEntries(storageKey) : (STORE.state?.entries || []);

  setThoughtState({
    runtimeState,
    storageKey,
    entries,
    composerText: shouldReloadEntries ? '' : STORE.state?.composerText || '',
    composerAudience: STORE.state?.composerAudience || 'private',
    composerCategory: STORE.state?.composerCategory || '',
    submitStatus: shouldReloadEntries ? 'idle' : STORE.state?.submitStatus || 'idle',
    submitMessage: shouldReloadEntries ? '' : STORE.state?.submitMessage || ''
  });
}

/* =============================================================================
   08) COMPOSER ACTIONS
   ============================================================================= */

export function updateProfileThoughtComposer(patch = {}) {
  setThoughtState({
    ...STORE.state,
    composerText: Object.prototype.hasOwnProperty.call(patch, 'composerText')
      ? normalizeComposerText(patch.composerText)
      : STORE.state?.composerText || '',
    composerAudience: Object.prototype.hasOwnProperty.call(patch, 'composerAudience')
      ? patch.composerAudience
      : STORE.state?.composerAudience || 'private',
    composerCategory: Object.prototype.hasOwnProperty.call(patch, 'composerCategory')
      ? patch.composerCategory
      : STORE.state?.composerCategory || '',
    submitStatus: patch.resetStatus ? 'idle' : STORE.state?.submitStatus || 'idle',
    submitMessage: patch.resetStatus ? '' : STORE.state?.submitMessage || ''
  });
}

export function submitProfileThought() {
  const state = getProfileThoughtState();
  const runtimeState = state.runtimeState || getProfileRuntimeState();
  const text = normalizeComposerText(state.composerText).trim();

  if (runtimeState.viewerState !== 'authenticated') {
    setThoughtState({
      ...state,
      submitStatus: 'error',
      submitMessage: 'Authenticate to activate the thought composer.'
    });
    return;
  }

  if (!text) {
    setThoughtState({
      ...state,
      submitStatus: 'error',
      submitMessage: 'Write a thought before saving it to your profile surface.'
    });
    return;
  }

  const nextEntry = {
    id: buildEntryId(),
    text,
    audience: normalizeAudience(state.composerAudience, state.taxonomy),
    category: normalizeCategory(state.composerCategory, state.taxonomy),
    createdAt: new Date().toISOString()
  };

  const entries = [nextEntry, ...(state.entries || [])];
  persistEntries(state.storageKey, entries);

  setThoughtState({
    ...state,
    entries,
    composerText: '',
    submitStatus: 'success',
    submitMessage: nextEntry.audience === 'public'
      ? (runtimeState.publicViewAvailable
          ? 'Thought added to your public-writing lane.'
          : 'Thought staged for your public route. Complete route readiness to publish it outward.')
      : 'Thought saved to your private bank.'
  });
}

/* =============================================================================
   09) RUNTIME SYNC
   ============================================================================= */

function bindRuntimeState() {
  subscribeProfileRuntime((runtimeState) => {
    hydrateThoughtState(runtimeState);
  });
}

/* =============================================================================
   10) INITIALIZATION
   ============================================================================= */

function initProfileThoughtStore() {
  if (STORE.initialized) return;
  STORE.initialized = true;

  STORE.runtimeState = getProfileRuntimeState();
  STORE.storageKey = buildStorageKey(STORE.runtimeState);
  STORE.state = buildDerivedState({
    runtimeState: STORE.runtimeState,
    storageKey: STORE.storageKey,
    entries: readEntries(STORE.storageKey)
  });

  bindRuntimeState();

  void loadProfileThoughtTaxonomy().then(() => {
    hydrateThoughtState(STORE.runtimeState || getProfileRuntimeState());
  });

  window.NeuroartanProfileThoughtStore = Object.freeze({
    getState: getProfileThoughtState,
    subscribe: subscribeProfileThoughtState,
    updateComposer: updateProfileThoughtComposer,
    submitThought: submitProfileThought,
    loadTaxonomy: loadProfileThoughtTaxonomy
  });
}

initProfileThoughtStore();
