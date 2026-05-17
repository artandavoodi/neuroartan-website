/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) DOM OWNERSHIP
   04) HOMEPAGE TOPBAR CONTROL
   05) DEVELOPER CONSOLE STATE-CONTROLLED MOUNT
   06) EVENT BINDINGS
   07) BOOT
   08) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
const DEVELOPER_CONSOLE_SHELL_CONTROLLER = {
  isBound: false,
  isMounted: false,
  isMounting: false,
  lastMountedFragment: '',
};

const DEVELOPER_CONSOLE_WORKSPACE_MOUNT_SELECTOR = '#home-developer-mode-workspace-mount';
const DEVELOPER_CONSOLE_SHELL_SELECTOR = '[data-home-developer-mode-shell]';
const DEVELOPER_CONSOLE_TOPBAR_MOUNT_SELECTOR = '#home-dashboard-topbar-mount';

/* =============================================================================
   02) IMPORTS
============================================================================= */
import { mountHomeDeveloperModeShell } from './developer-mode-shell.js';

/* =============================================================================
   03) DOM OWNERSHIP
============================================================================= */
function getDeveloperConsoleWorkspaceMount() {
  return document.querySelector(DEVELOPER_CONSOLE_WORKSPACE_MOUNT_SELECTOR);
}

function getDeveloperConsoleShell() {
  const workspaceMount = getDeveloperConsoleWorkspaceMount();

  if (workspaceMount instanceof HTMLElement) {
    return workspaceMount.querySelector(DEVELOPER_CONSOLE_SHELL_SELECTOR);
  }

  return document.querySelector(DEVELOPER_CONSOLE_SHELL_SELECTOR);
}

/* =============================================================================
   04) HOMEPAGE TOPBAR CONTROL
============================================================================= */
function syncDeveloperConsoleHomepageTopbar(isActive) {
  const topbarMount = document.querySelector(DEVELOPER_CONSOLE_TOPBAR_MOUNT_SELECTOR);

  if (!(topbarMount instanceof HTMLElement)) return;

  topbarMount.hidden = isActive;
  topbarMount.setAttribute('aria-hidden', String(isActive));
}

/* =============================================================================
   05) DEVELOPER CONSOLE STATE-CONTROLLED MOUNT
============================================================================= */
async function mountDeveloperConsoleShell() {
  if (DEVELOPER_CONSOLE_SHELL_CONTROLLER.isMounting) return;

  DEVELOPER_CONSOLE_SHELL_CONTROLLER.isMounting = true;

  try {
    const workspaceMount = getDeveloperConsoleWorkspaceMount();

    if (!(workspaceMount instanceof HTMLElement)) return;

    syncDeveloperConsoleHomepageTopbar(true);

    workspaceMount.hidden = false;
    workspaceMount.setAttribute('aria-hidden', 'false');

    const shell = getDeveloperConsoleShell();

    if (!(shell instanceof HTMLElement)) return;

    shell.hidden = false;
    shell.setAttribute('aria-hidden', 'false');

    await mountHomeDeveloperModeShell(shell);
    DEVELOPER_CONSOLE_SHELL_CONTROLLER.lastMountedFragment = 'home-developer-mode-shell';
    DEVELOPER_CONSOLE_SHELL_CONTROLLER.isMounted = true;
  } finally {
    DEVELOPER_CONSOLE_SHELL_CONTROLLER.isMounting = false;
  }
}

function unmountDeveloperConsoleShell() {
  const workspaceMount = getDeveloperConsoleWorkspaceMount();
  const shell = getDeveloperConsoleShell();

  if (shell instanceof HTMLElement) {
    shell.hidden = true;
    shell.setAttribute('aria-hidden', 'true');
  }

  if (workspaceMount instanceof HTMLElement) {
    workspaceMount.hidden = true;
    workspaceMount.setAttribute('aria-hidden', 'true');
  }

  syncDeveloperConsoleHomepageTopbar(false);

  DEVELOPER_CONSOLE_SHELL_CONTROLLER.isMounted = false;
}

function isDeveloperConsoleActive() {
  return document.documentElement.dataset.homeDeveloperMode === 'active';
}

/* =============================================================================
   06) EVENT BINDINGS
============================================================================= */
function bindDeveloperConsoleShellController() {
  if (DEVELOPER_CONSOLE_SHELL_CONTROLLER.isBound) return;

  DEVELOPER_CONSOLE_SHELL_CONTROLLER.isBound = true;

  document.addEventListener('home-developer-mode:activated', () => {
    void mountDeveloperConsoleShell();
  });

  document.addEventListener('home-developer-mode:deactivated', () => {
    unmountDeveloperConsoleShell();
  });

  document.addEventListener('fragment:mounted', (event) => {
    if (!isDeveloperConsoleActive()) return;
    if (DEVELOPER_CONSOLE_SHELL_CONTROLLER.isMounted) return;
    if (DEVELOPER_CONSOLE_SHELL_CONTROLLER.isMounting) return;
    if (event instanceof CustomEvent && event.detail?.source === 'developer-console-shell-controller') return;

    void mountDeveloperConsoleShell();
  });
}

/* =============================================================================
   07) BOOT
============================================================================= */
function bootDeveloperConsoleShellController() {
  bindDeveloperConsoleShellController();

  if (isDeveloperConsoleActive()) {
    void mountDeveloperConsoleShell();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootDeveloperConsoleShellController, { once: true });
} else {
  bootDeveloperConsoleShellController();
}

/* =============================================================================
   08) END OF FILE
============================================================================= */