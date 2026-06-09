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

function normalizeEvent(event = {}, source = 'Profile') {
  return {
    id: normalizeString(event.id || `${source}-${event.created_at || Math.random()}`),
    source,
    area: normalizeString(event.event_area || event.area || source.toLowerCase()),
    action: normalizeString(event.event_action || event.action || ''),
    title: normalizeString(event.event_title || event.title || event.action || 'Change recorded'),
    detail: normalizeString(event.event_detail || event.detail || ''),
    createdAt: normalizeString(event.created_at || event.createdAt || '')
  };
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

    const title = document.createElement('strong');
    title.className = 'settings-changelog__title';
    title.textContent = event.title;

    const meta = document.createElement('span');
    meta.className = 'settings-changelog__meta';
    meta.textContent = [event.source, event.area, formatDate(event.createdAt)].filter(Boolean).join(' · ');

    item.append(title, meta);
    if (event.detail) {
      const detail = document.createElement('p');
      detail.className = 'settings-changelog__detail';
      detail.textContent = event.detail;
      item.append(detail);
    }
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
