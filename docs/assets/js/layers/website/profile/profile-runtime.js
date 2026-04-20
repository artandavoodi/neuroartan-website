/* =============================================================================
   01) MODULE IMPORTS
   02) MODULE STATE
   03) CONSTANTS
   04) ASSET HELPERS
   05) SHARED FORMAT HELPERS
   06) PRIVATE PROFILE STATE DERIVATION
   07) PUBLIC PROFILE STATE DERIVATION
   08) RUNTIME STORE
   09) PROFILE ACTION DISPATCH
   10) EVENT BINDING
   11) INITIALIZATION
   ============================================================================= */

/* =============================================================================
   01) MODULE IMPORTS
   ============================================================================= */

import {
  REQUIRED_PROFILE_FIELDS,
  buildPublicProfileDisplay,
  buildPublicProfilePath,
  buildPublicProfileUrl,
  loadProfileIdentityPolicy,
  normalizeGenderValue,
  normalizeString,
  normalizeUsername
} from '../system/account-profile-identity.js';

/* =============================================================================
   02) MODULE STATE
   ============================================================================= */

const RUNTIME = (window.__NEUROARTAN_PROFILE_RUNTIME__ ||= {
  initialized: false,
  actionBound: false,
  stateBound: false,
  state: null,
  subscribers: new Set()
});

/* =============================================================================
   03) CONSTANTS
   ============================================================================= */

/* =============================================================================
   04) ASSET HELPERS
   ============================================================================= */

function assetPath(path) {
  if (window.NeuroartanFragmentAuthorities?.assetPath) {
    return window.NeuroartanFragmentAuthorities.assetPath(path);
  }

  const normalized = normalizeString(path);
  if (!normalized) return '';
  return normalized.startsWith('/') ? normalized.slice(1) : normalized;
}

/* =============================================================================
   05) SHARED FORMAT HELPERS
   ============================================================================= */

function capitalizeWords(value) {
  return normalizeString(value)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatProviderLabel(providerId) {
  switch (normalizeString(providerId)) {
    case 'google':
    case 'google.com':
      return 'Google';
    case 'apple':
    case 'apple.com':
      return 'Apple';
    case 'password':
    case 'email':
      return 'Email';
    case 'phone':
    case 'phone.com':
      return 'Phone';
    default:
      return 'Account';
  }
}

function formatDate(value) {
  const normalized = normalizeString(value);
  if (!normalized) return 'Not provided';

  const date = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return 'Not provided';

  try {
    return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch (_) {
    return normalized;
  }
}

function formatFieldLabel(value) {
  switch (value) {
    case 'first_name':
      return 'First name';
    case 'last_name':
      return 'Last name';
    case 'display_name':
      return 'Display name';
    case 'date_of_birth':
      return 'Date of birth';
    case 'username':
      return 'Username';
    case 'gender':
      return 'Gender';
    default:
      return capitalizeWords(value);
  }
}

function buildInitials(displayName, email = '') {
  const base = normalizeString(displayName || email || '');
  if (!base) return 'N';

  const words = base.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  }

  return base.slice(0, 2).toUpperCase();
}

/* =============================================================================
   06) PRIVATE PROFILE STATE DERIVATION
   ============================================================================= */

function getPrimaryProvider(user, profile = null) {
  const explicit = normalizeString(profile?.auth_provider_primary || profile?.auth_provider || '');
  if (explicit) return explicit;

  const providerData = Array.isArray(user?.providerData) ? user.providerData : [];
  const firstProvider = normalizeString(providerData[0]?.providerId || '');
  return firstProvider || 'account';
}

function buildCompletionState(profile = null) {
  if (!profile) {
    return {
      complete: false,
      percent: 0,
      status: 'missing_profile',
      missingFields: REQUIRED_PROFILE_FIELDS.slice()
    };
  }

  const canonicalMissing = Array.isArray(profile.missing_required_fields)
    ? profile.missing_required_fields.map((field) => normalizeString(field)).filter(Boolean)
    : null;

  const missingFields = canonicalMissing && canonicalMissing.length
    ? canonicalMissing
    : REQUIRED_PROFILE_FIELDS.filter((field) => {
        switch (field) {
          case 'username':
            return !normalizeString(profile.username || profile.username_normalized || profile.username_lower);
          case 'date_of_birth':
            return !normalizeString(profile.date_of_birth || profile.birth_date);
          default:
            return !normalizeString(profile[field]);
        }
      });

  const explicitPercent = Number.isFinite(profile?.profile_completion_percent)
    ? Number(profile.profile_completion_percent)
    : Math.round(((REQUIRED_PROFILE_FIELDS.length - missingFields.length) / REQUIRED_PROFILE_FIELDS.length) * 100);

  const explicitStatus = normalizeString(profile?.profile_completion_status);
  const complete = profile?.profile_complete === true
    || explicitStatus === 'complete'
    || missingFields.length === 0;

  return {
    complete,
    percent: Math.max(0, Math.min(100, explicitPercent)),
    status: explicitStatus || (complete ? 'complete' : 'incomplete'),
    missingFields
  };
}

function buildVisibilityState(profile = null, hasUsername = false) {
  const publicEnabled = profile?.public_profile_enabled === true;
  const discoverable = profile?.public_profile_discoverable === true;
  const explicitVisibility = normalizeString(profile?.profile_visibility_status || '');
  const explicitRouteStatus = normalizeString(profile?.public_route_status || '');
  const routeStatus = explicitRouteStatus || (hasUsername ? (publicEnabled ? 'ready' : 'disabled') : 'pending');

  return {
    profileVisibility: explicitVisibility || (publicEnabled ? 'controlled_public' : 'private'),
    publicEnabled,
    discoverable,
    routeStatus
  };
}

function buildUsernameState(profile = null) {
  const raw = normalizeString(profile?.username_raw || profile?.username || '');
  const normalized = normalizeUsername(profile?.username_normalized || profile?.username_lower || raw);
  const status = normalizeString(profile?.username_status || '') || (normalized ? 'reserved' : 'missing');
  const routeReady = profile?.username_route_ready === true || Boolean(normalized);

  return {
    raw: raw || normalized,
    normalized,
    status,
    routeReady
  };
}

function buildPrivateProfileState(user = null, profile = null) {
  const viewerState = user ? 'authenticated' : 'guest';
  const completion = buildCompletionState(profile);
  const username = buildUsernameState(profile);
  const visibility = buildVisibilityState(profile, Boolean(username.normalized));
  const displayName = normalizeString(profile?.display_name || user?.displayName || '');
  const email = normalizeString(profile?.auth_email || profile?.email || user?.email || '');
  const providerId = getPrimaryProvider(user, profile);
  const publicRoutePath = normalizeString(profile?.public_profile_path || profile?.public_route_path || buildPublicProfilePath(username.normalized));
  const publicRouteUrl = normalizeString(profile?.public_profile_url || profile?.public_route_url || buildPublicProfileUrl(username.normalized));
  const publicRouteDisplay = buildPublicProfileDisplay(username.normalized);
  const publicViewAvailable = visibility.publicEnabled === true && visibility.routeStatus === 'ready' && Boolean(username.normalized);
  const avatarUrl = normalizeString(profile?.avatar_url || profile?.photo_url || user?.photoURL || '');
  const avatarHasImage = Boolean(avatarUrl);
  const stateKey = !user
    ? 'guest'
    : !profile
      ? 'initializing'
      : completion.complete
        ? 'ready'
        : 'completion_required';

  const stateLine = !user
    ? 'Authenticate to enter your private continuity environment.'
    : !profile
      ? 'Your canonical profile record is still initializing.'
      : completion.complete
        ? 'Your private profile surface is active across the current website boundary.'
        : 'Core identity completion is still required before the profile surface is fully mature.';

  const summary = !user
    ? 'Continue with your Neuroartan account to activate a private owner environment for identity, route readiness, and continuity state.'
    : completion.complete
      ? 'This surface anchors your identity record, route governance, public-safe presence, and the continuity systems that extend across Neuroartan.'
      : 'Complete identity and route governance to stabilize the private profile surface and prepare the company-domain public route.';

  return {
    surface: 'private',
    viewerState,
    stateKey,
    profile,
    user,
    completion,
    username,
    visibility,
    displayName: displayName || (user ? 'Neuroartan User' : 'Private Profile'),
    firstName: normalizeString(profile?.first_name || ''),
    lastName: normalizeString(profile?.last_name || ''),
    birthDate: normalizeString(profile?.birth_date || profile?.date_of_birth || ''),
    formattedBirthDate: formatDate(profile?.birth_date || profile?.date_of_birth || ''),
    gender: normalizeGenderValue(profile?.gender || ''),
    email,
    emailVerified: user?.emailVerified === true || profile?.auth_email_verified === true,
    providerId,
    providerLabel: formatProviderLabel(providerId),
    authContextLine: user ? `${formatProviderLabel(providerId)} account connected` : 'Authentication required',
    publicRoutePath,
    publicRouteUrl,
    publicRouteDisplay,
    publicViewAvailable,
    profileRecordState: profile ? 'Canonical record active' : 'Canonical record pending',
    avatarUrl: avatarHasImage ? avatarUrl : '',
    avatarHasImage,
    avatarState: normalizeString(profile?.avatar_state || '') || (avatarHasImage ? 'active' : 'empty'),
    avatarInitials: buildInitials(displayName || normalizeString(profile?.first_name || ''), email),
    stateBadgeLabel: !user
      ? 'Guest'
      : completion.complete
        ? 'Private Surface Ready'
        : 'Completion Required',
    stateLine,
    summary,
    menuStateLine: !user
      ? 'Owner environment awaiting account access'
      : completion.complete
        ? 'Private continuity surface active'
        : 'Private profile completion in progress',
    accountButtonLabel: user ? 'Private Profile' : 'Continue',
    primaryActionLabel: !user
      ? 'Continue with Account'
      : completion.complete
        ? 'Edit Profile'
        : 'Complete Profile',
    primaryAction: !user
      ? 'account'
      : completion.complete
        ? 'edit-profile'
        : 'complete-profile',
    secondaryActionLabel: completion.complete ? 'Edit Username' : 'Open Settings',
    secondaryAction: completion.complete ? 'edit-username' : 'open-settings',
    publicActionLabel: publicViewAvailable
      ? 'View Public'
      : username.normalized
        ? 'Public Route Pending'
        : 'Public Route',
    missingFieldLabels: completion.missingFields.map(formatFieldLabel)
  };
}

/* =============================================================================
   07) PUBLIC PROFILE STATE DERIVATION
   ============================================================================= */

function buildPublicRouteCopy(outcome, username) {
  switch (outcome) {
    case 'found_renderable':
      return 'Canonical company-domain public profile is active.';
    case 'invalid_username':
      return 'This route candidate is not a canonically valid Neuroartan username.';
    case 'restricted_username':
      return 'This route candidate belongs to a protected or restricted username namespace.';
    case 'reserved_but_hidden':
      return 'This canonical username is reserved, but public rendering is hidden.';
    case 'reserved_but_not_ready':
      return 'This canonical username is reserved, but the public route is not ready for rendering yet.';
    case 'reserved_but_disabled':
      return 'This canonical username is reserved, but public route visibility is disabled.';
    case 'not_found':
      return `No public profile currently resolves for @${username || 'username'}.`;
    case 'error':
      return 'The public route could not be resolved right now.';
    case 'loading':
      return 'Resolving canonical company-domain route.';
    default:
      return 'Public profile route.';
  }
}

function buildPublicStateBadge(outcome) {
  switch (outcome) {
    case 'found_renderable':
      return 'Public Route';
    case 'invalid_username':
      return 'Invalid Route';
    case 'restricted_username':
      return 'Restricted';
    case 'reserved_but_hidden':
      return 'Hidden';
    case 'reserved_but_not_ready':
      return 'Not Ready';
    case 'reserved_but_disabled':
      return 'Disabled';
    case 'not_found':
      return 'Not Found';
    case 'error':
      return 'Route Error';
    case 'loading':
      return 'Resolving';
    default:
      return 'Public Route';
  }
}

function buildPublicProfileState(detail = {}) {
  const outcome = normalizeString(detail.outcome || '') || (detail.loading ? 'loading' : 'idle');
  const publicProfile = detail.publicProfile && typeof detail.publicProfile === 'object'
    ? detail.publicProfile
    : null;
  const normalizedUsername = normalizeUsername(detail.normalizedUsername || publicProfile?.public_username || detail.username || '');
  const publicRoutePath = normalizeString(detail.publicRoutePath || publicProfile?.public_route_path || buildPublicProfilePath(normalizedUsername));
  const publicRouteUrl = normalizeString(detail.publicRouteUrl || publicProfile?.public_route_canonical_url || buildPublicProfileUrl(normalizedUsername));
  const publicRouteDisplay = normalizeString(detail.publicRouteDisplay || buildPublicProfileDisplay(normalizedUsername));
  const displayName = normalizeString(publicProfile?.public_display_name || '');
  const avatarUrl = normalizeString(publicProfile?.public_avatar_url || '');
  const avatarHasImage = Boolean(avatarUrl);
  const publicLinks = Array.isArray(publicProfile?.public_links) ? publicProfile.public_links : [];
  const visibilityState = publicProfile?.public_profile_enabled === true
    ? capitalizeWords(publicProfile?.public_profile_visibility || 'Public')
    : outcome === 'reserved_but_hidden'
      ? 'Hidden'
      : outcome === 'reserved_but_disabled'
        ? 'Disabled'
        : 'Pending';
  const continuityState = outcome === 'found_renderable' ? 'Active' : outcome === 'loading' ? 'Resolving' : 'Pending';
  const summary = normalizeString(publicProfile?.public_summary || '')
    || buildPublicRouteCopy(outcome, normalizedUsername);

  return {
    surface: 'public',
    viewerState: 'public',
    stateKey: outcome || 'idle',
    routeOutcome: outcome,
    username: {
      raw: detail.username || normalizedUsername,
      normalized: normalizedUsername,
      status: outcome
    },
    publicProfile,
    displayName: displayName || 'Public Profile',
    publicRoutePath,
    publicRouteUrl,
    publicRouteDisplay,
    publicViewAvailable: outcome === 'found_renderable',
    avatarUrl: avatarHasImage ? avatarUrl : '',
    avatarHasImage,
    avatarInitials: buildInitials(displayName || normalizedUsername || 'Neuroartan'),
    stateBadgeLabel: buildPublicStateBadge(outcome),
    stateLine: buildPublicRouteCopy(outcome, normalizedUsername),
    summary,
    menuStateLine: outcome === 'found_renderable'
      ? 'Company-domain public identity surface'
      : buildPublicRouteCopy(outcome, normalizedUsername),
    primaryActionLabel: 'Copy Link',
    primaryAction: 'copy-link',
    routeOutcomeValue: buildPublicStateBadge(outcome),
    routeOutcomeCopy: buildPublicRouteCopy(outcome, normalizedUsername),
    visibilityState,
    visibilityCopy: outcome === 'found_renderable'
      ? (publicProfile?.public_profile_discoverable ? 'Discoverable public route' : 'Direct route with limited discovery')
      : 'Public visibility is not currently renderable.',
    continuityState,
    continuityCopy: outcome === 'found_renderable'
      ? 'This public surface is the external continuity layer for the canonical Neuroartan profile record.'
      : 'Public continuity modules remain unavailable until the canonical route becomes renderable.',
    identityLabel: normalizeString(publicProfile?.public_identity_label || '') || 'Public continuity identity',
    publicLinks,
    publicLinksAvailable: publicLinks.length > 0,
    publicPrimaryLink: normalizeString(publicProfile?.public_primary_link || publicLinks[0]?.url || ''),
    routeBadges: outcome === 'found_renderable'
      ? ['Public-safe model', 'Username resolved', 'Company domain']
      : ['Route gated', 'Canonical policy', 'Public-safe only'],
    continuityBadges: outcome === 'found_renderable'
      ? ['Identity', 'Presence', 'Continuity']
      : ['Identity', 'Route', 'Continuity'],
    publicProfileDiscoverable: publicProfile?.public_profile_discoverable === true,
    publicProfileEnabled: publicProfile?.public_profile_enabled === true
  };
}

function resolveInitialSurface() {
  return document.body?.dataset.profilePage === 'public'
    || document.body?.classList.contains('public-profile-route-active')
    ? 'public'
    : 'private';
}

function isPublicSurfaceActive() {
  return document.body?.dataset.profilePage === 'public'
    || document.body?.classList.contains('public-profile-route-active')
    || document.documentElement?.dataset.profileSurface === 'public';
}

function shouldApplyPublicState(detail = {}) {
  return isPublicSurfaceActive()
    || detail?.route?.handleAsPublicRoute === true;
}

function shouldApplyPrivateState() {
  return !isPublicSurfaceActive();
}

function getDefaultState() {
  return resolveInitialSurface() === 'public'
    ? buildPublicProfileState({ outcome: 'loading' })
    : buildPrivateProfileState(null, null);
}

/* =============================================================================
   08) RUNTIME STORE
   ============================================================================= */

function notifySubscribers() {
  RUNTIME.subscribers.forEach((subscriber) => {
    try {
      subscriber(RUNTIME.state);
    } catch (error) {
      console.error('[profile-runtime] Subscriber update failed.', error);
    }
  });
}

function setRuntimeState(nextState) {
  RUNTIME.state = nextState;
  notifySubscribers();
}

export function getProfileRuntimeState() {
  return RUNTIME.state || getDefaultState();
}

export function subscribeProfileRuntime(subscriber) {
  if (typeof subscriber !== 'function') {
    return () => {};
  }

  RUNTIME.subscribers.add(subscriber);
  subscriber(getProfileRuntimeState());

  return () => {
    RUNTIME.subscribers.delete(subscriber);
  };
}

/* =============================================================================
   09) PROFILE ACTION DISPATCH
   ============================================================================= */

function openAccountDrawer() {
  const state = getProfileRuntimeState();

  document.dispatchEvent(new CustomEvent('account-drawer:open-request', {
    detail: {
      source: 'profile-runtime',
      state: state.viewerState === 'authenticated' ? 'user' : 'guest',
      surface: state.viewerState === 'authenticated' ? 'profile' : 'entry'
    }
  }));
}

function requestPrivateNavigation(section, settingsPane = 'identity') {
  document.dispatchEvent(new CustomEvent('profile:navigate-request', {
    detail: {
      section,
      settingsPane
    }
  }));
}

function resolveCompletionSettingsPane(state) {
  const missingFields = Array.isArray(state?.completion?.missingFields)
    ? state.completion.missingFields
    : [];

  return missingFields.includes('username') ? 'route' : 'identity';
}

async function copyProfileLink(state) {
  const url = normalizeString(state.publicRouteUrl || window.location.href);
  if (!url) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return;
    }
  } catch (_) {
    /* Clipboard access fallback below. */
  }

  window.prompt('Copy public profile link', url);
}

export function requestProfileAction(action, detail = {}) {
  const state = getProfileRuntimeState();
  const normalizedAction = normalizeString(action);

  document.dispatchEvent(new CustomEvent('profile:action-request', {
    detail: {
      source: 'profile-runtime',
      action: normalizedAction,
      state
    }
  }));

  switch (normalizedAction) {
    case 'account':
      openAccountDrawer();
      return;
    case 'complete-profile':
      if (state.viewerState !== 'authenticated') {
        openAccountDrawer();
        return;
      }
      requestPrivateNavigation('settings', resolveCompletionSettingsPane(state));
      return;
    case 'edit-profile':
      if (state.viewerState !== 'authenticated') {
        openAccountDrawer();
        return;
      }
      requestPrivateNavigation('settings', 'identity');
      return;
    case 'edit-username':
      if (state.viewerState !== 'authenticated') {
        openAccountDrawer();
        return;
      }
      requestPrivateNavigation('settings', 'route');
      return;
    case 'change-avatar':
      if (state.viewerState !== 'authenticated') {
        openAccountDrawer();
        return;
      }
      requestPrivateNavigation('settings', 'media');
      return;
    case 'manage-visibility':
      if (state.viewerState !== 'authenticated') {
        openAccountDrawer();
        return;
      }
      requestPrivateNavigation('settings', 'visibility');
      return;
    case 'open-overview':
      requestPrivateNavigation('overview');
      return;
    case 'open-thought-bank':
      requestPrivateNavigation('thought-bank');
      return;
    case 'open-dashboard':
      requestPrivateNavigation('dashboard');
      return;
    case 'open-settings':
      requestPrivateNavigation('settings', detail?.settingsPane || 'identity');
      return;
    case 'view-public':
      if (state.publicViewAvailable && state.publicRoutePath) {
        window.location.href = state.publicRoutePath;
      }
      return;
    case 'copy-link':
      void copyProfileLink(state);
      return;
    case 'sign-out':
      document.dispatchEvent(new CustomEvent('account:sign-out-request', {
        detail: {
          source: 'profile-runtime'
        }
      }));
      return;
    case 'settings':
      requestPrivateNavigation('settings', 'identity');
      return;
    default:
      return;
  }
}

/* =============================================================================
   10) EVENT BINDING
   ============================================================================= */

function bindActionDelegation() {
  if (RUNTIME.actionBound) return;
  RUNTIME.actionBound = true;

  document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element
      ? event.target.closest('[data-profile-action]')
      : null;

    if (!trigger) return;
    if (trigger instanceof HTMLButtonElement && trigger.disabled) return;
    if (trigger.getAttribute('aria-disabled') === 'true') return;

    event.preventDefault();
    requestProfileAction(trigger.getAttribute('data-profile-action') || '', {
      target: trigger
    });
  });
}

function bindProfileStateEvents() {
  if (RUNTIME.stateBound) return;
  RUNTIME.stateBound = true;

  document.addEventListener('account:profile-state-changed', (event) => {
    const detail = event instanceof CustomEvent ? event.detail || {} : {};
    if (!shouldApplyPrivateState()) return;
    setRuntimeState(buildPrivateProfileState(detail.user || null, detail.profile || null));
  });

  document.addEventListener('account:profile-signed-out', () => {
    if (!shouldApplyPrivateState()) return;
    setRuntimeState(buildPrivateProfileState(null, null));
  });

  document.addEventListener('profile:public-state-changed', (event) => {
    const detail = event instanceof CustomEvent ? event.detail || {} : {};
    if (!shouldApplyPublicState(detail)) return;
    setRuntimeState(buildPublicProfileState(detail));
  });
}

/* =============================================================================
   11) INITIALIZATION
   ============================================================================= */

function initProfileRuntime() {
  if (RUNTIME.initialized) return;
  RUNTIME.initialized = true;

  setRuntimeState(getDefaultState());
  bindActionDelegation();
  bindProfileStateEvents();

  void loadProfileIdentityPolicy().then(() => {
    const state = getProfileRuntimeState();

    if (state.surface === 'public') {
      setRuntimeState(buildPublicProfileState(state));
      return;
    }

    setRuntimeState(buildPrivateProfileState(state.user || null, state.profile || null));
  });

  window.NeuroartanProfileRuntime = Object.freeze({
    getState: getProfileRuntimeState,
    subscribe: subscribeProfileRuntime,
    requestAction: requestProfileAction,
    assetPath
  });
}

initProfileRuntime();
