/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) ROUTE BUTTONS
   03) PANEL ROUTING
   04) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/home/developer-mode/developer-mode-navigation.js */

/* =============================================================================
   02) ROUTE BUTTONS
============================================================================= */
export function renderHomeDeveloperRouteButtons(container, items = []) {
  if (!container) return;

  container.replaceChildren();
  items.forEach((item) => {
    const button = document.createElement('button');
    button.className = 'home-developer-mode-route';
    button.type = 'button';
    button.dataset.homeDeveloperRoutePanel = item.panel || 'repositories';
    button.dataset.homeDeveloperRouteMode = item.mode || '';
    button.textContent = item.label || item.id || 'Route';
    button.setAttribute('aria-pressed', 'false');
    container.append(button);
  });
}

/* =============================================================================
   03) PANEL ROUTING
============================================================================= */
export function setHomeDeveloperActivePanel(root, panelId = 'repositories') {
  root.querySelectorAll('[data-home-developer-panel]').forEach((panel) => {
    const isActive = panel.dataset.homeDeveloperPanel === panelId;
    panel.hidden = !isActive;
    panel.setAttribute('aria-hidden', String(!isActive));
  });

  root.querySelectorAll('[data-home-developer-route-panel]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.homeDeveloperRoutePanel === panelId));
  });
}

/* =============================================================================
   04) END OF FILE
============================================================================= */
