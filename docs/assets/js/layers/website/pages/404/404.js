/* =========================================================
   00. FILE INDEX
   01. MODULE IMPORTS
   02. MODULE IDENTITY
   03. CONSTANTS
   04. PAGE ACTIONS
   05. DOCUMENT META HELPERS
   06. ROUTE ENTRY HELPERS
   07. SHADER LAYER BOOTSTRAP
   08. PAGE INITIALIZATION
   ========================================================= */

/* =========================================================
   01. MODULE IMPORTS
   ========================================================= */
import {
  getPublicRouteState,
  subscribePublicRoute
} from '../../system/profile/profile-router.js';
import {
  getPublicProfileState,
  subscribePublicProfileState
} from '../../system/profile/profile-state.js';

/* =========================================================
   02. MODULE IDENTITY
   ========================================================= */

(function () {
  'use strict';

  /* =========================================================
     03. CONSTANTS
     ========================================================= */

  const SHADER_FRAGMENT_PATH = '/assets/fragments/layers/website/system/404-hero-shader.html';
  const SHADER_MOUNT_SELECTOR = '[data-404-shader-mount]';
  const SHADER_FRAGMENT_SELECTOR = '[data-404-hero-shader-fragment]';
  const SHADER_SCRIPT_SELECTOR = 'script[data-404-hero-shader-script]';
  const SHADER_BODY_READY_CLASS = 'page-404-shader-ready';
  const PAGE_READY_CLASS = 'page-404-ready';
  const PAGE_LEAVING_CLASS = 'page-404-leaving';
  const PUBLIC_ROUTE_ACTIVE_CLASS = 'public-profile-route-active';
  const PUBLIC_PROFILE_LOADING_REASON = 'public-profile-route';
  const ROUTE_INTENT_REGISTRY_PATH = '/assets/data/website/routing/route-intent-registry.json';

  const DEFAULT_META = {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') || 'noindex, follow',
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
    ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
    ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
    ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content') || '',
    twitterTitle: document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') || '',
    twitterDescription: document.querySelector('meta[name="twitter:description"]')?.getAttribute('content') || ''
  };
  const DEFAULT_NOT_FOUND_COPY = {
    mark: document.querySelector('[data-404-mark]')?.textContent || '404',
    eyebrow: document.querySelector('[data-404-eyebrow]')?.textContent || 'Neuroartan',
    title: document.querySelector('[data-404-title]')?.textContent || 'This page does not exist.',
    description: document.querySelector('[data-404-description]')?.textContent || ''
  };
  const ROUTE_INTENT_STATE = {
    status: 'loading',
    registry: null
  };
  let publicRouteLoading = false;

  /* =========================================================
     04. PAGE ACTIONS
     ========================================================= */

  function bind404Actions() {
    const homeLinks = Array.from(document.querySelectorAll('[data-404-home-link]'));
    const backButtons = Array.from(document.querySelectorAll('[data-404-back-button]'));

    homeLinks.forEach((link) => {
      if (link.__neuroartanBound) return;
      link.__neuroartanBound = true;

      link.addEventListener('click', () => {
        document.body.classList.add(PAGE_LEAVING_CLASS);
      });
    });

    backButtons.forEach((button) => {
      if (button.__neuroartanBound) return;
      button.__neuroartanBound = true;

      button.addEventListener('click', (event) => {
        event.preventDefault();

        if (window.history.length > 1) {
          document.body.classList.add(PAGE_LEAVING_CLASS);
          window.history.back();
          return;
        }

        document.body.classList.add(PAGE_LEAVING_CLASS);
        window.location.href = '/';
      });
    });
  }

  /* =========================================================
     05. DOCUMENT META HELPERS
     ========================================================= */

  function setMetaContent(selector, value) {
    const element = document.querySelector(selector);
    if (!element) return;
    element.setAttribute('content', value);
  }

  function setCanonical(value) {
    const element = document.querySelector('link[rel="canonical"]');
    if (!element) return;
    element.setAttribute('href', value);
  }

  function applyDefaultMeta() {
    document.title = DEFAULT_META.title;
    setMetaContent('meta[name="description"]', DEFAULT_META.description);
    setMetaContent('meta[name="robots"]', DEFAULT_META.robots);
    setCanonical(DEFAULT_META.canonical);
    setMetaContent('meta[property="og:title"]', DEFAULT_META.ogTitle);
    setMetaContent('meta[property="og:description"]', DEFAULT_META.ogDescription);
    setMetaContent('meta[property="og:url"]', DEFAULT_META.ogUrl);
    setMetaContent('meta[name="twitter:title"]', DEFAULT_META.twitterTitle);
    setMetaContent('meta[name="twitter:description"]', DEFAULT_META.twitterDescription);
  }

  function applyPublicMeta(state) {
    const username = state.normalizedUsername || state.username || 'username';
    const displayName = state.publicProfile?.public_display_name || `@${username}`;
    const title = state.outcome === 'found_renderable'
      ? `${displayName} (@${username}) | Neuroartan`
      : `${getRouteCopy('profile-unavailable', username).title} | Neuroartan`;
    const description = state.outcome === 'found_renderable'
      ? state.publicProfile?.public_summary || 'Public continuity profile on Neuroartan.'
      : getRouteCopy('profile-unavailable', username).description;
    const canonicalUrl = state.publicRouteUrl || `${window.location.origin}${window.location.pathname}`;
    const robots = state.outcome === 'found_renderable' && state.publicProfile?.public_profile_discoverable
      ? 'index,follow'
      : 'noindex,follow';

    document.title = title;
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[name="robots"]', robots);
    setCanonical(canonicalUrl);
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', description);
    setMetaContent('meta[property="og:url"]', canonicalUrl);
    setMetaContent('meta[name="twitter:title"]', title);
    setMetaContent('meta[name="twitter:description"]', description);
  }

  function applyRouteIntentMeta(intent = 'not-found') {
    const copy = getRouteCopy(intent);
    const title = `${copy.title} | Neuroartan`;
    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;

    document.title = title;
    setMetaContent('meta[name="description"]', copy.description);
    setMetaContent('meta[name="robots"]', 'noindex,follow');
    setCanonical(canonicalUrl);
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', copy.description);
    setMetaContent('meta[property="og:url"]', canonicalUrl);
    setMetaContent('meta[name="twitter:title"]', title);
    setMetaContent('meta[name="twitter:description"]', copy.description);
  }

  /* =========================================================
     06. ROUTE ENTRY HELPERS
     ========================================================= */

  function getPublicRouteRoot() {
    return document.querySelector('[data-public-profile-route-root]');
  }

  function getNotFoundRoot() {
    return document.querySelector('[data-not-found-root]');
  }

  function normalizeRoutePath(value = '/') {
    try {
      return new URL(value, window.location.origin).pathname.replace(/\/+$/u, '') || '/';
    } catch (_) {
      return String(value || '/').split(/[?#]/u)[0].replace(/\/+$/u, '') || '/';
    }
  }

  function getRouteIntent(pathname = window.location.pathname) {
    const normalizedPath = normalizeRoutePath(pathname);
    const routes = Array.isArray(ROUTE_INTENT_STATE.registry?.routes)
      ? ROUTE_INTENT_STATE.registry.routes
      : [];

    const route = routes.find((entry) => {
      const configuredPath = normalizeRoutePath(entry?.path || '');
      if (!configuredPath || configuredPath === '/') return false;

      return entry?.match === 'prefix'
        ? normalizedPath === configuredPath || normalizedPath.startsWith(`${configuredPath}/`)
        : normalizedPath === configuredPath;
    });

    return String(route?.state || 'not-found');
  }

  function getRouteCopy(intent = 'not-found', username = '') {
    const configuredCopy = ROUTE_INTENT_STATE.registry?.states?.[intent] || {};
    const descriptionTemplate = configuredCopy.description_template || configuredCopy.description || DEFAULT_NOT_FOUND_COPY.description;

    return {
      mark: configuredCopy.mark || DEFAULT_NOT_FOUND_COPY.mark,
      eyebrow: configuredCopy.eyebrow || DEFAULT_NOT_FOUND_COPY.eyebrow,
      title: configuredCopy.title || DEFAULT_NOT_FOUND_COPY.title,
      description: String(descriptionTemplate).replace('{username}', username || 'this user')
    };
  }

  async function loadRouteIntentRegistry() {
    try {
      const response = await fetch(ROUTE_INTENT_REGISTRY_PATH, {
        credentials: 'same-origin',
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Failed to load route intent registry: ${response.status}`);
      }

      ROUTE_INTENT_STATE.registry = await response.json();
    } catch (error) {
      ROUTE_INTENT_STATE.registry = null;
      console.error('[404] Route intent registry unavailable.', error);
    } finally {
      ROUTE_INTENT_STATE.status = 'ready';
      renderRouteEntry();
    }
  }

  function setPublicRouteLoading(active) {
    if (publicRouteLoading === active) return;
    publicRouteLoading = active;

    document.dispatchEvent(new CustomEvent(
      active ? 'neuroartan:loading-start' : 'neuroartan:loading-stop',
      {
        detail: {
          reason: PUBLIC_PROFILE_LOADING_REASON,
          blocking: true
        }
      }
    ));
  }

  function setNotFoundCopy(state = null, intent = 'not-found') {
    const isProfileUnavailable = Boolean(state?.route?.handleAsPublicRoute || state?.publicRoutePath);
    const username = state?.normalizedUsername || state?.username || state?.route?.normalizedUsername || '';
    const mark = document.querySelector('[data-404-mark]');
    const eyebrow = document.querySelector('[data-404-eyebrow]');
    const title = document.querySelector('[data-404-title]');
    const description = document.querySelector('[data-404-description]');

    const copy = getRouteCopy(isProfileUnavailable ? 'profile-unavailable' : intent, username);

    if (mark) mark.textContent = copy.mark;
    if (eyebrow) eyebrow.textContent = copy.eyebrow;
    if (title) title.textContent = copy.title;
    if (description) description.textContent = copy.description;
  }

  function is404RouteEntryPage() {
    return Boolean(getPublicRouteRoot() || getNotFoundRoot());
  }

  function activatePublicRouteShell(state) {
    const publicRoot = getPublicRouteRoot();
    const notFoundRoot = getNotFoundRoot();

    document.body.classList.remove('page-404');
    document.body.classList.add('profile-page', PUBLIC_ROUTE_ACTIVE_CLASS);
    document.body.dataset.profilePage = 'public';
    document.body.dataset.profileRouteOutcome = state.outcome || 'loading';
    document.documentElement.dataset.profileSurface = 'public';
    setPublicRouteLoading(false);

    if (publicRoot instanceof HTMLElement) {
      publicRoot.hidden = false;
      publicRoot.setAttribute('aria-hidden', 'false');
    }

    if (notFoundRoot instanceof HTMLElement) {
      notFoundRoot.hidden = true;
      notFoundRoot.setAttribute('aria-hidden', 'true');
    }

    applyPublicMeta(state);
  }

  function activateNotFoundShell(state = null, intent = 'not-found') {
    const publicRoot = getPublicRouteRoot();
    const notFoundRoot = getNotFoundRoot();

    document.body.classList.add('page-404');
    document.body.classList.remove('profile-page', PUBLIC_ROUTE_ACTIVE_CLASS);
    delete document.body.dataset.profilePage;
    delete document.body.dataset.profileRouteOutcome;
    delete document.documentElement.dataset.profileSurface;
    setPublicRouteLoading(false);

    if (publicRoot instanceof HTMLElement) {
      publicRoot.hidden = true;
      publicRoot.setAttribute('aria-hidden', 'true');
    }

    if (notFoundRoot instanceof HTMLElement) {
      notFoundRoot.hidden = false;
      notFoundRoot.setAttribute('aria-hidden', 'false');
    }

    setNotFoundCopy(state, intent);

    if (state?.route?.handleAsPublicRoute || state?.publicRoutePath) {
      applyPublicMeta(state);
      return;
    }

    applyRouteIntentMeta(intent);
  }

  function activatePublicRouteLoadingShell() {
    const publicRoot = getPublicRouteRoot();
    const notFoundRoot = getNotFoundRoot();

    document.body.classList.remove('page-404', 'profile-page', PUBLIC_ROUTE_ACTIVE_CLASS);
    document.body.dataset.profileRouteOutcome = 'loading';
    delete document.body.dataset.profilePage;
    delete document.documentElement.dataset.profileSurface;

    if (publicRoot instanceof HTMLElement) {
      publicRoot.hidden = true;
      publicRoot.setAttribute('aria-hidden', 'true');
    }

    if (notFoundRoot instanceof HTMLElement) {
      notFoundRoot.hidden = true;
      notFoundRoot.setAttribute('aria-hidden', 'true');
    }

    setPublicRouteLoading(true);
  }

  function isPublicRouteResolutionPending(route, state) {
    if (!route.handleAsPublicRoute) return false;

    return state.resolved !== true;
  }

  function renderRouteEntry() {
    const route = getPublicRouteState();
    const publicState = getPublicProfileState();

    if (ROUTE_INTENT_STATE.status !== 'ready') {
      activatePublicRouteLoadingShell();
      return;
    }

    if (isPublicRouteResolutionPending(route, publicState)) {
      activatePublicRouteLoadingShell();
      return;
    }

    if (route.handleAsPublicRoute && publicState.outcome === 'found_renderable') {
      activatePublicRouteShell(publicState);
      return;
    }

    activateNotFoundShell(
      route.handleAsPublicRoute ? publicState : null,
      route.handleAsPublicRoute ? 'profile-unavailable' : getRouteIntent()
    );
  }

  /* =========================================================
     07. SHADER LAYER BOOTSTRAP
     ========================================================= */

  function get404ShaderMount() {
    return document.querySelector(SHADER_MOUNT_SELECTOR);
  }

  function shouldMount404Shader() {
    return getPublicProfileState().outcome !== 'found_renderable';
  }

  function has404ShaderFragment() {
    return Boolean(document.querySelector(SHADER_FRAGMENT_SELECTOR));
  }

  function mark404ShaderReady() {
    document.body.classList.add(SHADER_BODY_READY_CLASS);
  }

  function activate404ShaderScript() {
    const dormantScript = document.querySelector(SHADER_SCRIPT_SELECTOR);

    if (!dormantScript || dormantScript.dataset.activated === 'true') {
      return;
    }

    const runtimeScript = document.createElement('script');
    runtimeScript.src = dormantScript.src;
    runtimeScript.defer = false;
    runtimeScript.dataset.activated = 'true';

    if (dormantScript.type) {
      runtimeScript.type = dormantScript.type;
    }

    dormantScript.dataset.activated = 'true';
    dormantScript.replaceWith(runtimeScript);
  }

  async function mount404ShaderLayer() {
    if (!shouldMount404Shader()) {
      return;
    }

    const mount = get404ShaderMount();

    if (!mount || has404ShaderFragment()) {
      if (has404ShaderFragment()) {
        activate404ShaderScript();
        mark404ShaderReady();
      }
      return;
    }

    try {
      const response = await fetch(SHADER_FRAGMENT_PATH, {
        credentials: 'same-origin',
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Failed to load 404 shader fragment: ${response.status}`);
      }

      const html = await response.text();
      mount.innerHTML = html;
      activate404ShaderScript();
      mark404ShaderReady();
    } catch (error) {
      console.error('[404] Shader layer bootstrap failed.', error);
    }
  }

  /* =========================================================
     08. PAGE INITIALIZATION
     ========================================================= */

  async function init404Page() {
    if (!is404RouteEntryPage()) {
      if (get404ShaderMount()) {
        await mount404ShaderLayer();
      }
      return;
    }

    document.body.classList.add(PAGE_READY_CLASS);
    bind404Actions();
    renderRouteEntry();
    void loadRouteIntentRegistry();

    subscribePublicRoute(() => {
      renderRouteEntry();

      if (!getPublicRouteState().handleAsPublicRoute) {
        void mount404ShaderLayer();
      }
    });

    subscribePublicProfileState(() => {
      renderRouteEntry();

      if (shouldMount404Shader()) {
        void mount404ShaderLayer();
      }
    });

    if (shouldMount404Shader()) {
      await mount404ShaderLayer();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void init404Page();
    }, { once: true });
  } else {
    void init404Page();
  }
})();
