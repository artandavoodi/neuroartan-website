/* =============================================================================
   PROFILE PRIVATE SIDEBAR
============================================================================= */

import {
  getProfileNavigationState,
  subscribeProfileNavigation
} from '../navigation/profile-navigation.js';

const PROFILE_SIDEBAR_RAIL_STORAGE_KEY = 'neuroartan.profile.sidebar.rail';
const PROFILE_SIDEBAR_RAIL_COOKIE_KEY = 'neuroartan_profile_sidebar_rail';

function sidebarRoots(){
  return Array.from(document.querySelectorAll('[data-profile-private-sidebar]'));
}

function storageAvailable(){
  return typeof window !== 'undefined' && 'localStorage' in window;
}

function readStoredSidebarRail(){
  if(storageAvailable()){
    try{
      const value = window.localStorage.getItem(PROFILE_SIDEBAR_RAIL_STORAGE_KEY);
      if(value === 'collapsed' || value === 'expanded') return value;
    }catch(_){
      // Fall through to cookie storage.
    }
  }

  const cookie = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${PROFILE_SIDEBAR_RAIL_COOKIE_KEY}=`));
  const value = decodeURIComponent(cookie?.split('=').slice(1).join('=') || '');
  return value === 'collapsed' || value === 'expanded' ? value : '';
}

function writeStoredSidebarRail(state){
  if(state !== 'collapsed' && state !== 'expanded') return;

  if(storageAvailable()){
    try{
      window.localStorage.setItem(PROFILE_SIDEBAR_RAIL_STORAGE_KEY, state);
      return;
    }catch(_){
      // Fall through to cookie storage.
    }
  }

  document.cookie = `${PROFILE_SIDEBAR_RAIL_COOKIE_KEY}=${encodeURIComponent(state)}; path=/; max-age=31536000; SameSite=Lax`;
}

function sidebarItems(root){
  return Array.from(root.querySelectorAll('[data-profile-nav-section]'));
}

function renderSidebar(root, state = getProfileNavigationState()){
  const editProfilePanes = new Set(['identity', 'route', 'privacy']);
  const settingsPanes = new Set(['password', 'verification']);
  const homeSections = new Set(['posts', 'thoughts', 'models', 'organizations']);
  sidebarItems(root).forEach((item) => {
    const section = item.dataset.profileNavSection || '';
    const pane = item.dataset.profileNavPane || '';
    const link = item.dataset.profileNavLink || '';
    const searchTrigger = item.dataset.profileSearchTrigger || '';
    
    let active = false;
    
    if (link || searchTrigger) {
      active = false;
    } else if (section === 'home') {
      active = homeSections.has(state.section) || state.section === 'home';
    } else if (section === 'settings') {
      active = state.section === 'settings' && (
        pane === state.settingsPane || 
        (pane === 'identity' && editProfilePanes.has(state.settingsPane)) ||
        (pane === 'password' && settingsPanes.has(state.settingsPane))
      );
    } else if (section === 'dashboard') {
      active = state.section === 'dashboard';
    }

    item.classList.toggle('is-active', active);

    if(active){
      item.setAttribute('aria-current', 'page');
      item.setAttribute('aria-pressed', 'true');
    }else{
      item.removeAttribute('aria-current');
      item.setAttribute('aria-pressed', 'false');
    }
  });
}

function setSidebarRail(root, state, options = {}){
  const normalized = state === 'collapsed' ? 'collapsed' : 'expanded';
  const toggle = root.querySelector('[data-profile-sidebar-rail-toggle]');
  const toggleIconHost = root.querySelector('[data-profile-sidebar-rail-toggle-icon-host]');
  const toggleIcon = root.querySelector('[data-profile-sidebar-rail-toggle-icon]');
  const layout = root.closest('.profile-workspace__layout');

  root.setAttribute('data-profile-sidebar-rail', normalized);
  layout?.setAttribute('data-profile-sidebar-rail', normalized);

  if(toggle){
    const isExpanded = normalized === 'expanded';
    toggle.setAttribute('aria-pressed', isExpanded ? 'true' : 'false');
    toggle.setAttribute(
      'aria-label',
      isExpanded ? 'Collapse profile sidebar' : 'Expand profile sidebar'
    );
  }

  const expandedIcon = (
    toggleIconHost?.getAttribute('data-profile-sidebar-rail-icon-expanded')
    || toggleIcon?.getAttribute('data-profile-sidebar-rail-icon-expanded')
    || ''
  ).trim();

  const collapsedIcon = (
    toggleIconHost?.getAttribute('data-profile-sidebar-rail-icon-collapsed')
    || toggleIcon?.getAttribute('data-profile-sidebar-rail-icon-collapsed')
    || ''
  ).trim();

  const nextIcon = normalized === 'expanded' ? expandedIcon : collapsedIcon;

  if(toggleIconHost && expandedIcon && collapsedIcon){
    toggleIconHost.setAttribute('data-profile-sidebar-rail-icon-expanded', expandedIcon);
    toggleIconHost.setAttribute('data-profile-sidebar-rail-icon-collapsed', collapsedIcon);
  }

  if(toggleIconHost && nextIcon){
    const currentIcon = (
      toggleIconHost.getAttribute('data-profile-sidebar-rail-current-icon') || ''
    ).trim();

    if(currentIcon !== nextIcon){
      toggleIconHost.setAttribute('data-profile-sidebar-rail-current-icon', nextIcon);
      toggleIconHost.innerHTML = `<img class="ui-icon-theme-aware" src="${nextIcon}" alt="" data-profile-sidebar-rail-toggle-icon data-profile-sidebar-rail-icon-expanded="${expandedIcon}" data-profile-sidebar-rail-icon-collapsed="${collapsedIcon}">`;

      window.dispatchEvent(new CustomEvent('fragment:mounted', {
        detail: {
          name: 'profile-sidebar-rail-toggle-icon',
          root: toggleIconHost,
        },
      }));
    }
  }

  document.dispatchEvent(new CustomEvent('profile:sidebar-rail-change', {
    detail: { state: normalized }
  }));

  if(options.persist !== false){
    writeStoredSidebarRail(normalized);
  }
}

function bindSidebar(){
  if(document.documentElement.dataset.profileSidebarBound === 'true') return;
  document.documentElement.dataset.profileSidebarBound = 'true';

  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-profile-sidebar-rail-toggle]');
    if(toggle){
      const root = toggle.closest('[data-profile-private-sidebar]');
      if(!root) return;

      setSidebarRail(
        root,
        root.getAttribute('data-profile-sidebar-rail') === 'collapsed'
          ? 'expanded'
          : 'collapsed'
      );
      return;
    }

    const item = event.target.closest('[data-profile-private-sidebar] [data-profile-nav-section], [data-profile-private-sidebar] [data-profile-nav-link], [data-profile-private-sidebar] [data-profile-search-trigger]');
    if(!item) return;

    if(item.dataset.profileSearchTrigger){
      event.preventDefault();
      document.dispatchEvent(new CustomEvent('neuroartan:home-search-shell-open-requested', {
        detail: { source: 'sidebar' }
      }));
      return;
    }

    if(item.dataset.profileNavLink){
      window.location.href = item.dataset.profileNavLink;
      return;
    }

    document.dispatchEvent(new CustomEvent('profile:navigate-request', {
      detail: {
        section: item.dataset.profileNavSection || 'home',
        settingsPane: item.dataset.profileNavPane || 'identity'
      }
    }));
  });
}

function bootSidebar(){
  sidebarRoots().forEach((root) => {
    renderSidebar(root, getProfileNavigationState());
    const storedState = readStoredSidebarRail();
    setSidebarRail(
      root,
      window.matchMedia?.('(max-width: 980px)').matches === true
        ? 'collapsed'
        : storedState
          || (root.getAttribute('data-profile-sidebar-rail') === 'collapsed'
            ? 'collapsed'
            : 'expanded'),
      {
        persist: window.matchMedia?.('(max-width: 980px)').matches !== true
      }
    );
  });
}

export function initProfileSidebar(){
  bindSidebar();
  bootSidebar();
}

subscribeProfileNavigation((state) => {
  sidebarRoots().forEach((root) => renderSidebar(root, state));
});

document.addEventListener('fragment:mounted', (event) => {
  if(event?.detail?.name !== 'profile-private-sidebar') return;
  initProfileSidebar();
});

window.addEventListener('resize', () => {
  if(window.matchMedia?.('(max-width: 980px)').matches !== true) return;
  sidebarRoots().forEach((root) => setSidebarRail(root, 'collapsed', { persist:false }));
}, { passive:true });

initProfileSidebar();
