const PLATFORM_STATUS_REGISTRY_PATH = '/assets/data/support/status.json';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePositiveInteger(value, fallback) {
  const normalized = Number.parseInt(value, 10);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : fallback;
}

function setText(root, selector, value) {
  const node = root.querySelector(selector);
  if (!node) return;
  node.textContent = value;
}

function formatCopyright(holder, startYear) {
  const currentYear = new Date().getFullYear();
  const normalizedStartYear = normalizePositiveInteger(startYear, currentYear);
  const yearLabel = normalizedStartYear < currentYear
    ? `${normalizedStartYear}-${currentYear}`
    : String(currentYear);

  return `© ${yearLabel} ${holder}. All rights reserved.`;
}

async function fetchPlatformStatusRegistry() {
  const response = await fetch(PLATFORM_STATUS_REGISTRY_PATH, {
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${PLATFORM_STATUS_REGISTRY_PATH}: HTTP ${response.status}`);
  }

  return response.json();
}

function renderSystemInformation(root, registry = {}) {
  const platform = registry?.platform || {};
  const build = platform?.build || {};
  const copyright = platform?.copyright || {};
  const company = normalizeString(platform.name) || 'Neuroartan';
  const currentPhase = normalizeString(build.current_phase) || 'Foundation integration';
  const phaseCount = normalizePositiveInteger(build.phase_count, 1);
  const phasePosition = Math.min(normalizePositiveInteger(build.phase_position, 1), phaseCount);
  const progressMeter = root.querySelector('[data-more-system-progress-meter]');

  setText(root, '[data-more-system-copyright]', formatCopyright(
    normalizeString(copyright.holder) || company,
    copyright.start_year
  ));
  setText(root, '[data-more-system-version]', normalizeString(platform.version) || 'v1.0.0');
  setText(root, '[data-more-system-build-label]', normalizeString(build.label) || 'In development');

  if (progressMeter instanceof HTMLProgressElement) {
    progressMeter.max = phaseCount;
    progressMeter.value = phasePosition;
    progressMeter.setAttribute('aria-valuetext', `${currentPhase}, phase ${phasePosition} of ${phaseCount}`);
  }
}

export async function mountHomePlatformDestination(root) {
  if (!(root instanceof Element)) return;

  try {
    renderSystemInformation(root, await fetchPlatformStatusRegistry());
  } catch (error) {
    console.error('[home-more-overview] Platform status registry could not be loaded.', error);
  }
}
