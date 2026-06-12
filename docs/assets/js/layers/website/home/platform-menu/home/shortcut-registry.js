export const HOME_SHORTCUT_ITEMS = [
  {
    id: 'stage',
    label: 'Stage',
    icon: '/registry/icons/public/assets/core/system/stage/stage.svg',
    href: '/',
    priority: 1,
  },
  {
    id: 'feed',
    label: 'Feed',
    icon: '/registry/icons/public/assets/core/navigation/feed/feed.svg',
    href: '/feed/',
    priority: 2,
  },
  {
    id: 'thoughts',
    label: 'Thoughts',
    icon: '/registry/icons/public/assets/layers/website/profile/actions/thoughts.svg',
    href: '/profile.html#thoughts',
    priority: 3,
  },
  {
    id: 'model',
    label: 'Model',
    icon: '/registry/icons/public/assets/core/cognition/model/model.svg',
    href: '/model/#model/foundation/overview',
    priority: 4,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '/registry/icons/public/assets/core/navigation/dashboard/dashboard.svg',
    href: '/#home-platform-workspace-dashboard',
    priority: 5,
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: '/registry/icons/public/assets/core/identity/profile/profile.svg',
    href: '/profile.html#profile',
    priority: 6,
  },
  {
    id: 'training',
    label: 'Training',
    icon: '/registry/icons/public/assets/layers/website/model/sidebar/training.svg',
    href: '/model/#model/training/protocol',
    priority: 7,
  },
  {
    id: 'discovery',
    label: 'Discovery',
    icon: '/registry/icons/public/assets/layers/website/model/sidebar/discovery.svg',
    href: '/model/#model/discovery/directory',
    priority: 8,
  },
  {
    id: 'source',
    label: 'Source',
    icon: '/registry/icons/public/assets/layers/website/model/tabs/source.svg',
    href: '/model/#model/foundation/sources',
    priority: 9,
  },
  {
    id: 'voice',
    label: 'Voice',
    icon: '/registry/icons/public/assets/layers/website/model/tabs/voice.svg',
    href: '/model/#model/foundation/voice',
    priority: 10,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '/registry/icons/public/assets/core/system/settings/settings.svg',
    href: '/#home-platform-settings-home',
    priority: 11,
  },
  {
    id: 'connectors',
    label: 'Connectors',
    icon: '/registry/icons/public/assets/layers/website/home/platform-menu/settings/platform-menue-settings-connectors.svg',
    href: '/#home-platform-settings-connectors',
    priority: 12,
  },
  {
    id: 'memory',
    label: 'Memory',
    icon: '/registry/icons/public/assets/layers/website/model/tabs/memory.svg',
    href: '/model/#model/foundation/memory',
    priority: 13,
  },
  {
    id: 'personalization',
    label: 'Personalization',
    icon: '/registry/icons/public/assets/layers/website/model/sidebar/personalization.svg',
    href: '/#home-platform-settings-personalization',
    priority: 14,
  },
  {
    id: 'changelog',
    label: 'Changelog',
    icon: '/registry/icons/public/assets/layers/website/settings/changelog/changelog.svg',
    href: '/#home-platform-settings-changelog',
    priority: 15,
  },
];

export function getDefaultHomeShortcutEnabled() {
  return HOME_SHORTCUT_ITEMS.reduce((enabled, item) => {
    enabled[item.id] = true;
    return enabled;
  }, {});
}

export function getDefaultHomeShortcutPriority() {
  return HOME_SHORTCUT_ITEMS.reduce((priority, item) => {
    priority[item.id] = item.priority;
    return priority;
  }, {});
}

export function normalizeHomeShortcutState(shortcuts = {}) {
  const defaultEnabled = getDefaultHomeShortcutEnabled();
  const defaultPriority = getDefaultHomeShortcutPriority();
  const storedEnabled = shortcuts.enabled && typeof shortcuts.enabled === 'object'
    ? shortcuts.enabled
    : {};
  const storedPriority = shortcuts.priority && typeof shortcuts.priority === 'object'
    ? shortcuts.priority
    : {};

  return {
    ...shortcuts,
    enabled: HOME_SHORTCUT_ITEMS.reduce((enabled, item) => {
      const legacyValue = typeof shortcuts[item.id] === 'boolean' ? shortcuts[item.id] : undefined;
      enabled[item.id] = typeof storedEnabled[item.id] === 'boolean'
        ? storedEnabled[item.id]
        : legacyValue ?? defaultEnabled[item.id];
      return enabled;
    }, {}),
    priority: HOME_SHORTCUT_ITEMS.reduce((priority, item) => {
      const storedValue = Number(storedPriority[item.id]);
      priority[item.id] = Number.isFinite(storedValue) && storedValue > 0
        ? storedValue
        : defaultPriority[item.id];
      return priority;
    }, {}),
  };
}

export function getOrderedHomeShortcutItems(shortcuts = {}, { enabledOnly = false } = {}) {
  const normalized = normalizeHomeShortcutState(shortcuts);
  return [...HOME_SHORTCUT_ITEMS]
    .filter((item) => !enabledOnly || normalized.enabled[item.id] !== false)
    .sort((itemA, itemB) => {
      const priorityA = normalized.priority[itemA.id] || itemA.priority;
      const priorityB = normalized.priority[itemB.id] || itemB.priority;
      return priorityA - priorityB;
    });
}
