/* =============================================================================
   00) FILE INDEX
   01) DEVELOPER MODE TOPBAR
   02) END OF FILE
============================================================================= */

import { subscribeHomeSurfaceState } from '../../core/home-surface-state.js';

/* =============================================================================
   01) DEVELOPER MODE TOPBAR
============================================================================= */
(() => {
  'use strict';

  const TOPBAR_STATE = {
    snapshot: null,
  };

  const TOPBAR_SELECTORS = {
    root: '.home-dashboard-topbar',
    settingsTrigger: '[data-home-developer-mode-settings-trigger]',
    profileTrigger: '[data-home-topbar-profile-trigger]',
  };

  const TOPBAR_EVENTS = {
    settingsRequested: 'neuroartan:home-developer-settings-requested',
    settingsRegisterRequested: 'neuroartan:home-developer-mode-settings-register-requested',
    settingsOpenRequested: 'neuroartan:home-developer-mode-settings-open-requested',
  };

  function getTopbarRoot(root = document) {
    return root.querySelector(TOPBAR_SELECTORS.root);
  }

  function getSettingsTrigger(root = document) {
    const topbar = getTopbarRoot(root);
    return topbar?.querySelector(TOPBAR_SELECTORS.settingsTrigger) || null;
  }

  function getProfileTrigger(root = document) {
    const topbar = getTopbarRoot(root);
    return topbar?.querySelector(TOPBAR_SELECTORS.profileTrigger) || null;
  }

  function dispatchTopbarEvent(type, detail = {}) {
    document.dispatchEvent(new CustomEvent(type, {
      bubbles: true,
      detail: {
        source: 'developer-mode-topbar',
        ...detail,
      },
    }));
  }

  function handleSettingsTriggerClick(event) {
    event.preventDefault();
    dispatchTopbarEvent(TOPBAR_EVENTS.settingsRequested);
    dispatchTopbarEvent(TOPBAR_EVENTS.settingsOpenRequested, {
      section: 'overview',
    });
  }

  function handleProfileTriggerClick(event) {
    event.preventDefault();
    const snapshot = TOPBAR_STATE.snapshot || {};

    if (!snapshot?.account?.signedIn) {
      // User is not signed in, redirect to sign in
      dispatchTopbarEvent('account:entry-request', {
        surface: 'sign-in',
      });
      return;
    }

    // User is signed in, open profile
    dispatchTopbarEvent('home:platform-shell-open-request', {
      destination: 'profile',
      source: 'developer-mode-topbar',
    });
  }

  function renderDeveloperModeTopbar(snapshot) {
    TOPBAR_STATE.snapshot = snapshot;
  }

  function bindTopbarSettingsTrigger(root = document) {
    const topbar = getTopbarRoot(root);
    if (!topbar) return;

    const settingsTrigger = getSettingsTrigger(root);
    if (!(settingsTrigger instanceof HTMLElement)) return;
    if (settingsTrigger.dataset.developerModeSettingsTriggerBound === 'true') return;

    settingsTrigger.dataset.developerModeSettingsTriggerBound = 'true';
    settingsTrigger.addEventListener('click', handleSettingsTriggerClick);
  }

  function bindTopbarProfileTrigger(root = document) {
    const topbar = getTopbarRoot(root);
    if (!topbar) return;

    const profileTrigger = getProfileTrigger(root);
    if (!(profileTrigger instanceof HTMLElement)) return;
    if (profileTrigger.dataset.developerModeProfileTriggerBound === 'true') return;

    profileTrigger.dataset.developerModeProfileTriggerBound = 'true';
    profileTrigger.addEventListener('click', handleProfileTriggerClick);
  }

  function registerSettingsAuthority() {
    dispatchTopbarEvent(TOPBAR_EVENTS.settingsRegisterRequested, {
      fragmentId: 'home-developer-mode-settings-panel-shell',
      sections: [
        'overview',
        'environments',
        'connectors',
        'analytics',
        'data-control',
        'privacy',
        'runtime',
        'approvals',
        'logs-history',
        'notifications',
        'security-access',
        'provider-model',
        'workspace-project-bindings',
      ],
    });
  }

  function initDeveloperModeTopbar(root = document) {
    bindTopbarSettingsTrigger(root);
    bindTopbarProfileTrigger(root);
    subscribeHomeSurfaceState(renderDeveloperModeTopbar);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initDeveloperModeTopbar(document);
  });

  document.addEventListener('fragment:mounted', (event) => {
    const name = event?.detail?.name || '';
    if (name === 'home-developer-mode-topbar') {
      initDeveloperModeTopbar(document);
      registerSettingsAuthority();
    }
  });

  document.addEventListener('neuroartan:fragments-mounted', () => {
    initDeveloperModeTopbar(document);
    registerSettingsAuthority();
  });

  window.DeveloperModeTopbar = {
    init: initDeveloperModeTopbar,
    registerSettingsAuthority,
  };
})();

/* =============================================================================
   02) END OF FILE
============================================================================= */
