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
} from '../system/profile-router.js';
import {
  getPublicProfileState,
  subscribePublicProfileState
} from '../system/profile-state.js';

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
      : `@${username} | Neuroartan`;
    const description = state.outcome === 'found_renderable'
      ? state.publicProfile?.public_summary || 'Public continuity profile on Neuroartan.'
      : 'Public profile route on Neuroartan.';
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

  /* =========================================================
     06. ROUTE ENTRY HELPERS
     ========================================================= */

  function getPublicRouteRoot() {
    return document.querySelector('[data-public-profile-route-root]');
  }

  function getNotFoundRoot() {
    return document.querySelector('[data-not-found-root]');
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

  function activateNotFoundShell() {
    const publicRoot = getPublicRouteRoot();
    const notFoundRoot = getNotFoundRoot();

    document.body.classList.add('page-404');
    document.body.classList.remove('profile-page', PUBLIC_ROUTE_ACTIVE_CLASS);
    delete document.body.dataset.profilePage;
    delete document.body.dataset.profileRouteOutcome;
    delete document.documentElement.dataset.profileSurface;

    if (publicRoot instanceof HTMLElement) {
      publicRoot.hidden = true;
      publicRoot.setAttribute('aria-hidden', 'true');
    }

    if (notFoundRoot instanceof HTMLElement) {
      notFoundRoot.hidden = false;
      notFoundRoot.setAttribute('aria-hidden', 'false');
    }

    applyDefaultMeta();
  }

  function renderRouteEntry() {
    const route = getPublicRouteState();
    const publicState = getPublicProfileState();

    if (route.handleAsPublicRoute) {
      activatePublicRouteShell(publicState);
      return;
    }

    activateNotFoundShell();
  }

  /* =========================================================
     07. SHADER LAYER BOOTSTRAP
     ========================================================= */

  function get404ShaderMount() {
    return document.querySelector(SHADER_MOUNT_SELECTOR);
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
    if (getPublicRouteState().handleAsPublicRoute) {
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
      return;
    }

    document.body.classList.add(PAGE_READY_CLASS);
    bind404Actions();
    renderRouteEntry();

    subscribePublicRoute(() => {
      renderRouteEntry();

      if (!getPublicRouteState().handleAsPublicRoute) {
        void mount404ShaderLayer();
      }
    });

    subscribePublicProfileState(() => {
      renderRouteEntry();
    });

    if (!getPublicRouteState().handleAsPublicRoute) {
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
