const CONTROL_CENTER_ROUTES = Object.freeze({
  tokens: '/control-center/registry/tokens/manifests/runtime-tokens.json',
  themes: '/control-center/registry/themes/website-themes.json',
  icons: '/control-center/registry/icons/manifests/icon-manifest.json',
  studio: '/control-center/registry/studio/core/index.json'
});

async function fetchJSON(route) {
  const response = await fetch(route);
  if (!response.ok) {
    throw new Error(`${response.status} ${route}`);
  }

  return response.json();
}

function getTokenCount(tokens) {
  if (tokens && typeof tokens === 'object' && !Array.isArray(tokens)) {
    return Object.keys(tokens).length;
  }

  return 0;
}

function getIconCount(iconManifest) {
  if (Array.isArray(iconManifest?.icons)) return iconManifest.icons.length;
  if (iconManifest && typeof iconManifest.icons === 'object') {
    return Object.keys(iconManifest.icons).length;
  }
  if (iconManifest && typeof iconManifest === 'object') {
    return Object.keys(iconManifest).length;
  }

  return 0;
}

function renderPanel(panel, title, value, detail) {
  panel.innerHTML = `
    <div class="studio-panel-label">${title}</div>
    <strong class="studio-panel-value">${value}</strong>
    <p class="studio-panel-detail">${detail}</p>
  `;
}

function bindStudioNavigation() {
  document.querySelectorAll('.studio-nav-button').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.studio-nav-button').forEach((item) => {
        item.classList.toggle('is-active', item === button);
      });
    });
  });
}

async function initializeStudioRuntime() {
  document.body.classList.add('studio-active');

  const panels = [...document.querySelectorAll('.studio-panel')];

  try {
    const [tokens, themes, icons, studio] = await Promise.all([
      fetchJSON(CONTROL_CENTER_ROUTES.tokens),
      fetchJSON(CONTROL_CENTER_ROUTES.themes),
      fetchJSON(CONTROL_CENTER_ROUTES.icons),
      fetchJSON(CONTROL_CENTER_ROUTES.studio)
    ]);

    renderPanel(
      panels[0],
      'Token Runtime',
      `${getTokenCount(tokens)} registered tokens`,
      'Runtime token registry is reachable and synchronized from the achieved website token layer.'
    );

    renderPanel(
      panels[1],
      'Registry Graph',
      `${getIconCount(icons)} registered icons`,
      'Icon and asset registry is reachable through the Control Center route surface.'
    );

    renderPanel(
      panels[2],
      'Theme Engine',
      themes.palettes?.[themes.active]?.label || themes.active || 'Active theme',
      'Website theme registry is active and points to the achieved Neuroartan palette.'
    );

    renderPanel(
      panels[3],
      'Propagation Status',
      studio.system || 'CONTROL_CENTER',
      'Studio registry is connected to the Control Center runtime index.'
    );

    window.dispatchEvent(new CustomEvent('CC_STUDIO_READY', {
      detail: {
        tokenCount:getTokenCount(tokens),
        iconCount:getIconCount(icons),
        activeTheme:themes.active
      }
    }));
  } catch (error) {
    panels.forEach((panel) => {
      renderPanel(
        panel,
        'Runtime Error',
        'Registry unavailable',
        error.message
      );
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  bindStudioNavigation();
  initializeStudioRuntime();
});
