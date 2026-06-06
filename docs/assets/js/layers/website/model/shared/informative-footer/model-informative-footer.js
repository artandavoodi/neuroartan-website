// MARK: - Model Informative Footer

let modelInformativeFooter = null;
let modelInformativeFooterMounted = false;
let modelInformativeFooterHost = null;

// MARK: - Public API

export async function mountModelInformativeFooter(root = document, host = null) {
  const resolvedHost = resolveModelInformativeFooterHost(root, host);

  if (modelInformativeFooterMounted && modelInformativeFooter && modelInformativeFooterHost === resolvedHost) {
    return getModelInformativeFooter();
  }

  modelInformativeFooter = resolvedHost.querySelector?.('[data-model-informative-footer]') || null;

  if (!modelInformativeFooter) {
    await loadModelInformativeFooterFragment(resolvedHost);
    modelInformativeFooter = resolvedHost.querySelector('[data-model-informative-footer]');
  }

  if (!modelInformativeFooter) {
    return null;
  }

  modelInformativeFooterHost = resolvedHost;
  modelInformativeFooterMounted = true;
  return modelInformativeFooter;
}

export function getModelInformativeFooter() {
  return modelInformativeFooter || document.querySelector('[data-model-informative-footer]');
}

export async function showModelInformativeFooter({ title = '', copy = '', html = '', host = null } = {}) {
  const footer = await mountModelInformativeFooter(document, host);
  if (!footer) return null;

  const titleTarget = footer.querySelector('[data-model-informative-footer-title]');
  const copyTarget = footer.querySelector('[data-model-informative-footer-copy]');

  if (titleTarget) {
    titleTarget.textContent = title;
    titleTarget.hidden = !title;
  }

  if (copyTarget) {
    if (html) {
      copyTarget.innerHTML = html;
    } else {
      copyTarget.textContent = copy;
    }
    copyTarget.hidden = !copy && !html;
  }

  footer.hidden = false;
  return footer;
}

export function hideModelInformativeFooter({ remove = false } = {}) {
  const footer = getModelInformativeFooter();
  if (!footer) return;

  if (remove === true) {
    footer.remove();
    modelInformativeFooter = null;
    modelInformativeFooterMounted = false;
    modelInformativeFooterHost = null;
    return;
  }

  footer.hidden = true;
}

function resolveModelInformativeFooterHost(root = document, host = null) {
  if (host instanceof HTMLElement) {
    return host;
  }

  const activeFoundationGroup = root.querySelector?.('.model-management__foundation-group:not([hidden])');
  if (activeFoundationGroup instanceof HTMLElement) {
    return activeFoundationGroup;
  }

  const activePanel = root.querySelector?.('[data-model-panel]:not([hidden]), [data-profile-private-panel]:not([hidden])');
  if (activePanel instanceof HTMLElement) {
    return activePanel;
  }

  const modelManagement = root.querySelector?.('[data-model-management], .model-management');
  if (modelManagement instanceof HTMLElement) {
    return modelManagement;
  }

  return document.body;
}

// MARK: - Fragment Loading

async function loadModelInformativeFooterFragment(host) {
  const response = await fetch('/assets/fragments/layers/website/model/shared/informative-footer/model-informative-footer.html', {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Unable to load model informative footer fragment.');
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = await response.text();

  const footer = wrapper.querySelector('[data-model-informative-footer]');
  if (footer) {
    host.append(footer);
  }
}