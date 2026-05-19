/* =============================================================================
   PROFILE PRIVATE SIDEBAR
============================================================================= */

import {
  getProfileNavigationState,
  subscribeProfileNavigation
} from '../navigation/profile-navigation.js';

function sidebarRoots(){
  return Array.from(document.querySelectorAll('[data-profile-private-sidebar]'));
}

function sidebarItems(root){
  return Array.from(root.querySelectorAll('[data-profile-nav-section]'));
}

function renderSidebar(root, state = getProfileNavigationState()){
  sidebarItems(root).forEach((item) => {
    const section = item.dataset.profileNavSection || '';
    const pane = item.dataset.profileNavPane || '';
    const active =
      section === state.section &&
      (section !== 'settings' || pane === state.settingsPane);

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

function setSidebarRail(root, state){
  const normalized = state === 'collapsed' ? 'collapsed' : 'expanded';
  const toggle = root.querySelector('[data-profile-sidebar-rail-toggle]');
  const icon = root.querySelector('img[data-profile-sidebar-rail-toggle-icon]');
  const layout = root.closest('.profile-workspace__layout');

  root.setAttribute('data-profile-sidebar-rail', normalized);
  layout?.setAttribute('data-profile-sidebar-rail', normalized);

  if(toggle){
    const collapsed = normalized === 'collapsed';
    toggle.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
    toggle.setAttribute(
      'aria-label',
      collapsed ? 'Expand profile sidebar' : 'Collapse profile sidebar'
    );
  }

  if(icon){
    const expandedIcon = icon.dataset.profileSidebarRailToggleExpanded || '';
    const collapsedIcon = icon.dataset.profileSidebarRailToggleCollapsed || '';
    icon.setAttribute('src', normalized === 'collapsed' ? collapsedIcon : expandedIcon);
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

    const item = event.target.closest('[data-profile-private-sidebar] [data-profile-nav-section]');
    if(!item) return;

    document.dispatchEvent(new CustomEvent('profile:navigate-request', {
      detail: {
        section: item.dataset.profileNavSection || 'overview',
        settingsPane: item.dataset.profileNavPane || 'identity'
      }
    }));
  });
}

function bootSidebar(){
  sidebarRoots().forEach((root) => {
    renderSidebar(root, getProfileNavigationState());
    setSidebarRail(
      root,
      root.getAttribute('data-profile-sidebar-rail') === 'collapsed'
        ? 'collapsed'
        : 'expanded'
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

initProfileSidebar();
