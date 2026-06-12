import { mountSettingsCategory } from '../_shared/settings-category.js';
import { listProfileChangelogEvents } from '../../../../system/profile/profile-changelog-store.js';
import {
  getOwnedCanonicalModel,
  listModelChangelogEvents
} from '../../../../system/model/model-store.js';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function humanizeIdentifier(value = '') {
  return normalizeString(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^./, (character) => character.toUpperCase());
}

function normalizeChangeValue(value) {
  if (value === null || typeof value === 'undefined') return '';
  if (value === true) return 'On';
  if (value === false) return 'Off';
  return normalizeString(String(value).replace(/[_-]+/g, ' '));
}

function generateEventHref(event = {}) {
  const source = normalizeString(event.source || '');
  const area = normalizeString(event.area || '');

  if (source === 'Profile') {
    if (area === 'personalization') return '/profile.html#profile/personalization';
    if (area === 'privacy') return '/profile.html#profile/privacy';
    if (area === 'security') return '/profile.html#profile/security';
    if (area === 'accessibility') return '/profile.html#profile/accessibility';
    if (area === 'notifications') return '/profile.html#profile/notifications';
    return '/profile.html#profile';
  }

  if (source === 'Model') {
    if (area.includes('personalization')) return '/model/#model/personalization';
    if (area.includes('training')) return '/model/#model/training/protocol';
    if (area.includes('discovery')) return '/model/#model/discovery/directory';
    if (area.includes('source')) return '/model/#model/foundation/sources';
    if (area.includes('voice')) return '/model/#model/foundation/voice';
    return '/model/#model/foundation/overview';
  }

  return '';
}

function normalizeEvent(event = {}, source = 'Profile') {
  const metadata = event.event_metadata || event.metadata || {};
  const fromValue = normalizeString(metadata.from_value || metadata.fromValue || '');
  const toValue = normalizeString(metadata.to_value || metadata.toValue || '');
  const detail = normalizeString(event.event_detail || event.detail || '');
  const action = normalizeString(event.event_action || event.action || '');
  const fieldLabel = normalizeString(
    event.label
    || event.field_label
    || metadata.changed_field_label
    || metadata.changedFieldLabel
    || humanizeIdentifier(event.field || metadata.changed_field || metadata.changedField || '')
  );
  const auditFromValue = normalizeChangeValue(event.value_from ?? event.from ?? metadata.value_from ?? metadata.from);
  const auditToValue = normalizeChangeValue(event.value_to ?? event.to ?? metadata.value_to ?? metadata.to);

  let constructedDetail = detail;
  if (fieldLabel && auditFromValue && auditToValue) {
    constructedDetail = `${fieldLabel} . ${auditFromValue} → ${auditToValue}`;
  } else if (fieldLabel && (auditFromValue || auditToValue)) {
    constructedDetail = `${fieldLabel} . ${auditFromValue || auditToValue}`;
  } else if (fromValue && toValue) {
    constructedDetail = `${fieldLabel || detail} . ${fromValue} → ${toValue}`.trim();
  } else if (fromValue || toValue) {
    constructedDetail = `${fieldLabel || detail} . ${fromValue || toValue}`.trim();
  } else if (fieldLabel && (!detail || detail === action)) {
    constructedDetail = fieldLabel;
  }

  if (!constructedDetail && action) {
    constructedDetail = humanizeIdentifier(action);
  }

  return {
    id: normalizeString(event.id || `${source}-${event.created_at || Math.random()}`),
    source,
    area: normalizeString(event.event_area || event.area || source.toLowerCase()),
    action,
    title: normalizeString(event.event_title || event.title || event.action || 'Change recorded'),
    detail: constructedDetail,
    createdAt: normalizeString(event.created_at || event.createdAt || '')
  };
}

function navigateChangelogEvent(event, href = '') {
  const destination = String(href || '').trim();
  if (!destination) return;

  event.preventDefault();
  document.dispatchEvent(new CustomEvent('home:platform-shell-close-request', {
    detail: {
      clearPersistedState: true,
      source: 'settings-changelog'
    }
  }));
  window.requestAnimationFrame(() => {
    window.location.assign(destination);
  });
}

function renderEvents(root, events = []) {
  const list = root.querySelector('[data-settings-changelog-list]');
  if (!(list instanceof HTMLElement)) return;

  list.innerHTML = '';

  if (!events.length) {
    const empty = document.createElement('p');
    empty.className = 'home-platform-theme__section-copy';
    empty.textContent = 'No changelog events are available yet.';
    list.append(empty);
    return;
  }

  events.forEach((event) => {
    const item = document.createElement('article');
    item.className = 'settings-changelog__item';
    item.setAttribute('role', 'listitem');

    const href = generateEventHref(event);
    const title = document.createElement('a');
    title.className = 'settings-changelog__title';
    title.textContent = event.source;
    if (href) {
      title.href = href;
      title.addEventListener('click', (clickEvent) => {
        navigateChangelogEvent(clickEvent, href);
      });
    }

    const meta = document.createElement('span');
    meta.className = 'settings-changelog__meta';
    meta.textContent = event.detail || humanizeIdentifier(event.area);

    const date = document.createElement('div');
    date.className = 'settings-changelog__date';
    date.textContent = formatDate(event.createdAt);

    item.append(title, meta, date);
    list.append(item);
  });
}

async function refreshChangelog(root) {
  const list = root.querySelector('[data-settings-changelog-list]');
  if (list instanceof HTMLElement) {
    list.innerHTML = '<p class="home-platform-theme__section-copy">Loading changelog...</p>';
  }

  try {
    const profileEvents = await listProfileChangelogEvents({ range: 'all' })
      .then((events) => events.map((event) => normalizeEvent(event, 'Profile')))
      .catch(() => []);
    const model = await getOwnedCanonicalModel().catch(() => null);
    const modelEvents = model?.id
      ? await listModelChangelogEvents(model.id, { range: 'all' })
        .then((events) => events.map((event) => normalizeEvent(event, 'Model')))
        .catch(() => [])
      : [];

    const events = [...profileEvents, ...modelEvents]
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
      .slice(0, 100);

    renderEvents(root, events);
  } catch (error) {
    console.error('[settings-changelog] Failed to load global changelog.', error);
    renderEvents(root, []);
  }
}

export function mountHomePlatformDestination(root, options = {}) {
  mountSettingsCategory(root, options);
  void refreshChangelog(root);

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-settings-changelog-refresh]')) {
      void refreshChangelog(root);
    }
  });
}

export function updateHomePlatformDestination(root) {
  void refreshChangelog(root);
}
