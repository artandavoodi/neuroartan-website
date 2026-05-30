/* =============================================================================
   01) MODULE IMPORTS
   02) MODULE STATE
   03) STRUCTURED TAXONOMY
   04) VALUE HELPERS
   05) STATE DERIVATION
   06) STORE HELPERS
   07) COMPOSER ACTIONS
   08) RUNTIME SYNC
   09) INITIALIZATION
   ============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
   ============================================================================= */

import { getProfileRuntimeState, subscribeProfileRuntime } from '../shell/profile-runtime.js';
import { normalizeString } from '../../../system/account/identity/account-profile-identity.js';
import {
  listProfileThoughts,
  createProfileThought,
  deleteProfileThought,
  updateProfileThought
} from '../../../system/profile/profile-thought-store.js';

/* =============================================================================
   02) MODULE STATE
   ============================================================================= */

const STORE = (window.__NEUROARTAN_PROFILE_THOUGHT_STORE__ ||= {
  initialized: false,
  taxonomy: null,
  taxonomyPromise: null,
  runtimeState: null,
  state: null,
  loading: true,
  hydrateRequestId: 0,
  subscribers: new Set()
});

/* =============================================================================
   03) STRUCTURED TAXONOMY
   ============================================================================= */

const DEFAULT_TAXONOMY = Object.freeze({
  audiences: [
    { key: 'private', label: 'Private Thought Bank', summary: 'Owner-only captured reflections and thought records.' }
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
      const audiences = DEFAULT_TAXONOMY.audiences;
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

function normalizeAudience() {
  return 'private';
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
   05) STATE DERIVATION
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
      id: normalizeString(entry?.id || ''),
      text: normalizeComposerText(entry?.text || '').trim(),
      audience: 'private',
      category: normalizeCategory(entry?.category || '', taxonomy),
      createdAt: entry?.createdAt || null,
      updatedAt: entry?.updatedAt || null,
      ownedByCurrentUser: entry?.ownedByCurrentUser || false
    }))
    .filter((entry) => entry.text)
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));

  const privateEntries = normalizedEntries;
  const publicEntries = [];
  const currentAudience = 'private';
  const currentCategory = normalizeCategory(nextState.composerCategory || STORE.state?.composerCategory || '', taxonomy);

  return {
    runtimeState,
    taxonomy,
    entries: normalizedEntries,
    loading: nextState.loading === true,
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
   06) STORE HELPERS
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
  const requestId = STORE.hydrateRequestId + 1;
  STORE.hydrateRequestId = requestId;
  setThoughtState({
    ...(STORE.state || {}),
    runtimeState,
    entries: STORE.state?.entries || [],
    loading: true
  });

  listProfileThoughts()
    .then((entries) => {
      if (requestId !== STORE.hydrateRequestId) return;
      setThoughtState({
        runtimeState,
        entries,
        composerText: STORE.state?.composerText || '',
        composerAudience: 'private',
        composerCategory: STORE.state?.composerCategory || '',
        loading: false,
        submitStatus: 'idle',
        submitMessage: ''
      });
    })
    .catch((error) => {
      if (requestId !== STORE.hydrateRequestId) return;
      const code = normalizeString(error?.code || error?.message || '');
      setThoughtState({
        ...(STORE.state || {}),
        runtimeState,
        loading: false
      });
      if (code === 'AUTH_REQUIRED') return;
      console.error('[profile-thought-store] Failed to hydrate thoughts.', error);
    });
}

/* =============================================================================
   07) COMPOSER ACTIONS
   ============================================================================= */

export function updateProfileThoughtComposer(patch = {}) {
  setThoughtState({
    ...STORE.state,
    composerText: Object.prototype.hasOwnProperty.call(patch, 'composerText')
      ? normalizeComposerText(patch.composerText)
      : STORE.state?.composerText || '',
    composerAudience: 'private',
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
    return false;
  }

  if (!text) {
    setThoughtState({
      ...state,
      submitStatus: 'error',
      submitMessage: 'Write a thought before saving it to your private Thought Bank.'
    });
    return false;
  }

  setThoughtState({
    ...state,
    submitStatus: 'submitting',
    submitMessage: 'Saving private thought...'
  });

  createProfileThought({
    text,
    audience: 'private',
    category: normalizeCategory(state.composerCategory, state.taxonomy)
  })
    .then((createdThought) => {
      const entries = [createdThought, ...(state.entries || [])];
      setThoughtState({
        ...state,
        entries,
        composerText: '',
        submitStatus: 'success',
        submitMessage: 'Thought saved to your private Thought Bank.'
      });
      hydrateThoughtState(getProfileRuntimeState());
    })
    .catch((error) => {
      console.error('[profile-thought-store] Failed to save thought.', error);
      const errorMessage = error?.message || String(error);
      setThoughtState({
        ...state,
        submitStatus: 'error',
        submitMessage: `Failed to save thought: ${errorMessage}`
      });
    });

  return true;
}

/* =============================================================================
   08) RUNTIME SYNC
   ============================================================================= */

function bindRuntimeState() {
  subscribeProfileRuntime((runtimeState) => {
    hydrateThoughtState(runtimeState);
  });

  window.addEventListener('neuroartan:supabase-ready', () => {
    hydrateThoughtState(STORE.runtimeState || getProfileRuntimeState());
  });

  document.addEventListener('account:profile-state-changed', (event) => {
    const runtimeState = event instanceof CustomEvent
      ? { ...(STORE.runtimeState || getProfileRuntimeState()), ...(event.detail || {}) }
      : STORE.runtimeState || getProfileRuntimeState();
    hydrateThoughtState(runtimeState);
  });

  document.addEventListener('profile:navigation-changed', (event) => {
    const section = event instanceof CustomEvent ? event.detail?.section : '';
    if (section !== 'thoughts') return;
    hydrateThoughtState(STORE.runtimeState || getProfileRuntimeState());
  });
}

/* =============================================================================
   09) INITIALIZATION
   ============================================================================= */

function initProfileThoughtStore() {
  if (STORE.initialized) return;
  STORE.initialized = true;

  STORE.runtimeState = getProfileRuntimeState();
  STORE.state = buildDerivedState({
    runtimeState: STORE.runtimeState,
    entries: [],
    loading: true
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
