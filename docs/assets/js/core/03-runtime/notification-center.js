/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) STATE
   03) STORAGE
   04) NOTIFICATION API
   05) EVENT BRIDGES
   06) BOOT
============================================================================= */

(() => {
  'use strict';

  /* =============================================================================
     01) MODULE IDENTITY
  ============================================================================= */
  const MODULE_ID = 'notification-center';
  const MODULE_PATH = '/website/docs/assets/js/core/03-runtime/notification-center.js';
  const STORAGE_KEY = 'neuroartan.notifications';

  /* =============================================================================
     02) STATE
  ============================================================================= */
  const state = {
    notifications: [],
    bound: false
  };

  const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

  const normalizeNotification = (entry = {}) => {
    const id = normalizeString(entry.id) || `notification-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const title = normalizeString(entry.title);
    const body = normalizeString(entry.body || entry.message || entry.copy);

    if (!title && !body) return null;

    return {
      id,
      title: title || 'Notification',
      body,
      href: normalizeString(entry.href || ''),
      source: normalizeString(entry.source || 'system'),
      priority: normalizeString(entry.priority || 'normal'),
      createdAt: normalizeString(entry.createdAt || new Date().toISOString()),
      readAt: normalizeString(entry.readAt || '')
    };
  };

  const getUnreadCount = () => {
    return state.notifications.filter((entry) => !entry.readAt).length;
  };

  const getSnapshot = () => {
    const unreadCount = getUnreadCount();

    return {
      notifications: state.notifications.map((entry) => ({ ...entry })),
      unreadCount,
      state: unreadCount > 9 ? 'high' : unreadCount > 0 ? 'new' : 'idle',
      permission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
    };
  };

  const emit = () => {
    document.dispatchEvent(new CustomEvent('neuroartan:notifications-updated', {
      detail: {
        source: MODULE_ID,
        communication: {
          notifications: getSnapshot()
        }
      }
    }));
  };

  /* =============================================================================
     03) STORAGE
  ============================================================================= */
  const load = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      state.notifications = Array.isArray(parsed)
        ? parsed.map(normalizeNotification).filter(Boolean)
        : [];
    } catch {
      state.notifications = [];
    }
  };

  const save = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notifications));
    } catch {}
  };

  /* =============================================================================
     04) NOTIFICATION API
  ============================================================================= */
  const add = (entry = {}) => {
    const normalized = normalizeNotification(entry);
    if (!normalized) return null;

    const existingIndex = state.notifications.findIndex((item) => item.id === normalized.id);
    if (existingIndex >= 0) {
      state.notifications.splice(existingIndex, 1, {
        ...state.notifications[existingIndex],
        ...normalized
      });
    } else {
      state.notifications.unshift(normalized);
    }

    save();
    emit();
    return { ...normalized };
  };

  const markRead = (id = '') => {
    const normalizedId = normalizeString(id);
    if (!normalizedId) return;

    const entry = state.notifications.find((item) => item.id === normalizedId);
    if (!entry || entry.readAt) return;

    entry.readAt = new Date().toISOString();
    save();
    emit();
  };

  const markAllRead = () => {
    const now = new Date().toISOString();
    let changed = false;

    state.notifications.forEach((entry) => {
      if (entry.readAt) return;
      entry.readAt = now;
      changed = true;
    });

    if (!changed) return;

    save();
    emit();
  };

  const clear = () => {
    state.notifications = [];
    save();
    emit();
  };

  const requestPermission = async () => {
    if (typeof Notification === 'undefined' || typeof Notification.requestPermission !== 'function') {
      return 'unsupported';
    }

    const permission = await Notification.requestPermission();
    emit();
    return permission;
  };

  /* =============================================================================
     05) EVENT BRIDGES
  ============================================================================= */
  const bindEvents = () => {
    if (state.bound) return;
    state.bound = true;

    document.addEventListener('neuroartan:notification-create-request', (event) => {
      add(event?.detail || {});
    });

    document.addEventListener('neuroartan:notification-mark-read-request', (event) => {
      markRead(event?.detail?.id || '');
    });

    document.addEventListener('neuroartan:notification-mark-all-read-request', () => {
      markAllRead();
    });

    document.addEventListener('neuroartan:notification-clear-request', () => {
      clear();
    });

    document.addEventListener('account:profile-state-changed', (event) => {
      const profileComplete = event?.detail?.profileComplete === true || event?.detail?.profile?.profile_complete === true;
      if (!profileComplete) return;

      add({
        id: 'account-profile-ready',
        title: 'Profile ready',
        body: 'Your profile state is complete and available to the platform.',
        source: 'account',
        priority: 'normal',
        href: '/pages/profile/index.html'
      });
    });

    document.addEventListener('cookie-consent:closed', () => {
      let consentState = '';

      try {
        const consent = JSON.parse(window.localStorage.getItem('neuroartan.cookieConsent') || 'null');
        consentState = normalizeString(consent?.state || '');
      } catch {}

      if (!['accepted', 'rejected', 'customized'].includes(consentState)) return;

      add({
        id: 'cookie-preferences-saved',
        title: 'Cookie preferences saved',
        body: 'Your cookie decision is stored in this browser.',
        source: 'privacy',
        priority: 'low'
      });
    });
  };

  /* =============================================================================
     06) BOOT
  ============================================================================= */
  const boot = () => {
    load();
    bindEvents();

    const api = Object.freeze({
      add,
      markRead,
      markAllRead,
      clear,
      requestPermission,
      getSnapshot
    });

    window.NEUROARTAN_NOTIFICATION_CENTER = api;
    window.ARTAN_NOTIFICATION_CENTER = api;

    emit();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
