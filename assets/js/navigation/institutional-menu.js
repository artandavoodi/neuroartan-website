/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) DOM AND SYSTEM REFERENCES
   03) STATE FLAGS
   04) DOM HELPERS
   05) SCHEDULING HELPERS
   06) MENU QUERIES
   07) COUNTRY SELECTOR QUERIES
   08) PAGE STATE HELPERS
   09) COUNTRY OVERLAY STATE
   10) GEOMETRY HELPERS
   11) SECONDARY TOGGLE BINDING
   12) RIBBON BINDING
   13) TRANSLATION APPLICATION
   14) COUNTRY SELECTOR BINDING
   15) PANEL SYSTEM BINDING
   15A) SEARCH INDEX HELPERS
   15B) SEARCH RESULTS RENDERING
   15C) ACCOUNT DRAWER TRIGGER BINDING
   15D) ACCOUNT DRAWER STATE SYNCHRONIZATION
   15E) ACCOUNT DRAWER OPEN-REQUEST ROUTING
   15F) COOKIE CONSENT OVERLAY COORDINATION
   16) MAIN INITIALIZATION
   17) LIFECYCLE HOOKS
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */

(function () {
  'use strict';

  /* =============================================================================
     02) DOM AND SYSTEM REFERENCES
  ============================================================================= */
  const body = document.body;
  const desktopQuery = window.matchMedia('(min-width: 761px)');
  const MAX_RETRIES = 24;

  /* =============================================================================
     03) STATE FLAGS
  ============================================================================= */
  let initScheduled = false;
  let retryCount = 0;
  let globalBound = false;
  let searchEntriesPromise = null;
  let searchPanelSnapshot = null;

  /* =============================================================================
     04) DOM HELPERS
  ============================================================================= */
  function byId(id) {
    return document.getElementById(id);
  }

  function q(selector, root = document) {
    return root.querySelector(selector);
  }

  function qa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function isDesktop() {
    return desktopQuery.matches;
  }

  function isElement(value) {
    return value instanceof Element;
  }

  /* =============================================================================
     05) SCHEDULING HELPERS
  ============================================================================= */
  function nextFrame(fn) {
    window.requestAnimationFrame(() => window.requestAnimationFrame(fn));
  }

  function scheduleInit() {
    if (initScheduled) return;
    initScheduled = true;

    window.requestAnimationFrame(() => {
      initScheduled = false;
      initInstitutionalMenu();
    });
  }

  /* =============================================================================
     06) MENU QUERIES
  ============================================================================= */
  function getMenu() {
    return byId('institutional-menu');
  }

  function getPanelContainer(menu = getMenu()) {
    return menu ? q('.institutional-menu-panels', menu) : null;
  }

  function getTriggers(menu = getMenu()) {
    return menu ? qa('.institutional-menu-panel-trigger', menu) : [];
  }

  function getPanels(menu = getMenu()) {
    return menu ? qa('.institutional-menu-panel', menu) : [];
  }

  function getBackdrop(menu = getMenu()) {
    return menu ? q('.institutional-menu-panels-backdrop', menu) : null;
  }

  function getShells(menu = getMenu()) {
    return menu ? qa('.institutional-menu-panel-shell', menu) : [];
  }

  function getSearchInput(menu = getMenu()) {
    return menu ? q('#institutional-menu-search-input', menu) : null;
  }

  function getMicButton(menu = getMenu()) {
    return menu ? q('.institutional-menu-mic-button', menu) : null;
  }

  function getAccountDrawerTrigger(menu = getMenu()) {
    return menu
      ? q(
          '[data-account-drawer-trigger="true"], '
          + '#account-drawer-trigger, '
          + '[aria-controls="account-drawer"], '
          + '[data-panel-target="account"], '
          + '[data-nav-panel-target="account"], '
          + '[data-account-trigger]',
          menu
        )
      : null;
  }

  function getSearchPanel(menu = getMenu()) {
    return menu ? q('#institutional-menu-panel-search', menu) : null;
  }

  function getSearchLinksHost(menu = getMenu()) {
    const panel = getSearchPanel(menu);
    return panel ? q('.institutional-menu-search-links', panel) : null;
  }

  function getSearchTitleElement(menu = getMenu()) {
    const panel = getSearchPanel(menu);
    return panel
      ? q('.institutional-menu-search-links-title, .institutional-menu-search-results-title, .institutional-menu-panel-label', panel)
      : null;
  }

  function ensureSearchTitleElement(menu = getMenu()) {
    const existing = getSearchTitleElement(menu);
    if (existing) return existing;

    const host = getSearchLinksHost(menu);
    if (!host || !host.parentElement) return null;

    const title = document.createElement('p');
    title.className = 'institutional-menu-panel-label institutional-menu-search-links-title';
    host.parentElement.insertBefore(title, host);
    return title;
  }

  function getSecondaryToggle() {
    return byId('institutional-menu-secondary-toggle');
  }

  function getLegacyMenuButton() {
    return byId('menu-button');
  }

  function getOverlay() {
    return byId('menu-overlay');
  }

  /* =============================================================================
     07) COUNTRY SELECTOR QUERIES
  ============================================================================= */
  function getCountrySelector() {
    return (
      byId('country-selector') ||
      q('[data-country-toggle]') ||
      q('.country-selector') ||
      q('.country-current')
    );
  }

  function getCountryOptions() {
    return qa([
      '.country-option',
      '[data-country-option]',
      '[data-region-option]',
      '#country-overlay button',
      '#country-overlay [role="option"]',
      '.country-overlay button',
      '.country-overlay [role="option"]',
      '.country-dropdown button',
      '.country-dropdown a',
      '.country-list button',
      '.country-list a'
    ].join(','));
  }

  /* =============================================================================
     08) PAGE STATE HELPERS
  ============================================================================= */
  function isHomePage() {
    return !!(byId('home-hero') || q('.stage-circle') || byId('home-essence'));
  }

  /* =============================================================================
     09) COUNTRY OVERLAY STATE
  ============================================================================= */
  function setCountryOverlayState(open) {
    body.classList.toggle('country-overlay-open', !!open);
    body.classList.toggle('country-selector-open', !!open);

    const selector = getCountrySelector();
    if (selector) {
      selector.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  }

  /* =============================================================================
     10) GEOMETRY HELPERS
  ============================================================================= */
  function getPageTop(el) {
    const rect = el.getBoundingClientRect();
    const pageY = window.scrollY || window.pageYOffset || 0;
    return rect.top + pageY;
  }

  function getOuterHeight(el) {
    const rect = el.getBoundingClientRect();
    return rect.height || el.offsetHeight || window.innerHeight || 0;
  }

  /* =============================================================================
     11) SECONDARY TOGGLE BINDING
  ============================================================================= */
  function bindSecondaryToggle() {
    const trigger = getSecondaryToggle();
    const overlay = getOverlay();
    const legacyButton = getLegacyMenuButton();

    if (!trigger || trigger.dataset.menuSecondaryBound === 'true') return;
    trigger.dataset.menuSecondaryBound = 'true';

    trigger.addEventListener('click', (event) => {
      event.preventDefault();

      if (legacyButton && typeof legacyButton.click === 'function') {
        legacyButton.click();
      }
    });

    if (overlay && !overlay.dataset.menuSecondaryObserved) {
      const syncState = () => {
        const open = overlay.getAttribute('aria-hidden') === 'false' || overlay.classList.contains('is-open');
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      };

      const observer = new MutationObserver(syncState);
      observer.observe(overlay, { attributes: true, attributeFilter: ['aria-hidden', 'class'] });
      overlay.dataset.menuSecondaryObserved = 'true';
      syncState();
    }
  }

  /* =============================================================================
     12) RIBBON BINDING
  ============================================================================= */
  function bindRibbon() {
    const menu = getMenu();
    const hero = byId('home-hero');
    const stage = q('.stage-circle');
    const essence = byId('home-essence');
    const siteMain = byId('site-main');

    if (!body || !menu || menu.dataset.ribbonBound === 'true') return;
    menu.dataset.ribbonBound = 'true';
    body.classList.remove('menu-ribbon-active');

    const applyRibbonState = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      let threshold = Number.POSITIVE_INFINITY;

      if (isHomePage()) {
        if (essence) {
          threshold = getPageTop(essence) + 48;
        } else if (hero) {
          threshold = getPageTop(hero) + getOuterHeight(hero) + 220;
        } else if (stage) {
          threshold = getPageTop(stage) + getOuterHeight(stage) + 220;
        }
      } else if (siteMain) {
        threshold = Math.max(12, getPageTop(siteMain) + 12);
      } else {
        threshold = 12;
      }

      if (!Number.isFinite(threshold)) {
        threshold = 12;
      }

      body.classList.toggle('menu-ribbon-active', scrollY > threshold);
    };

    let ticking = false;
    const requestApply = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        applyRibbonState();
        ticking = false;
      });
    };

    window.addEventListener('scroll', requestApply, { passive: true });
    window.addEventListener('resize', requestApply, { passive: true });
    window.addEventListener('orientationchange', requestApply, { passive: true });
    window.addEventListener('load', requestApply, { passive: true, once: true });

    nextFrame(() => {
      requestApply();
      if (!isHomePage()) {
        body.classList.add('menu-ribbon-active');
      }
    });
    requestApply();
  }

  /* =============================================================================
     13) TRANSLATION APPLICATION
  ============================================================================= */
  function applyTranslations() {
    const translationEngine = window.NEUROARTAN_TRANSLATION;
    const menu = getMenu();
    if (!translationEngine || typeof translationEngine.applyLanguage !== 'function' || !menu) return;

    const storedLanguage =
      localStorage.getItem('neuroartan_language') ||
      localStorage.getItem('neuroartan-language') ||
      document.documentElement.lang ||
      'en';

    const normalizedLanguage = String(storedLanguage).toLowerCase().split('-')[0] || 'en';
    translationEngine.applyLanguage(normalizedLanguage, menu);
  }

  /* =============================================================================
     14) COUNTRY SELECTOR BINDING
  ============================================================================= */
  function bindCountrySelector() {
    const selector = getCountrySelector();
    const options = getCountryOptions();

    if (selector && selector.dataset.countrySelectorBound !== 'true') {
      selector.dataset.countrySelectorBound = 'true';
      selector.setAttribute('aria-expanded', 'false');

      selector.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setCountryOverlayState(!body.classList.contains('country-overlay-open'));
      });
    }

    options.forEach((option) => {
      if (!isElement(option) || option.dataset.countryOptionBound === 'true') return;
      option.dataset.countryOptionBound = 'true';

      option.addEventListener('click', () => {
        setCountryOverlayState(false);
      });
    });

    if (!document.documentElement.dataset.countryDismissBound) {
      document.documentElement.dataset.countryDismissBound = 'true';

      document.addEventListener('click', (event) => {
        const target = event.target;
        const selectorEl = getCountrySelector();

        if (!body.classList.contains('country-overlay-open')) return;
        if (!isElement(target)) return;
        if (selectorEl && selectorEl.contains(target)) return;
        if (target.closest('.country-overlay, #country-overlay, .country-dropdown, .country-list')) return;

        setCountryOverlayState(false);
      });
    }
  }

  /* =============================================================================
     15) PANEL SYSTEM BINDING
  ============================================================================= */
  function bindPanels() {
    const menu = getMenu();
    const container = getPanelContainer(menu);
    const triggers = getTriggers(menu);
    const panels = getPanels(menu);
    const backdrop = getBackdrop(menu);
    const shells = getShells(menu);
    const searchInput = getSearchInput(menu);
    const micButton = getMicButton(menu);
    const accountDrawerTrigger = getAccountDrawerTrigger(menu);
    /* =============================================================================
       15C) ACCOUNT DRAWER TRIGGER BINDING
    ============================================================================= */
    function openAccountDrawerFromMenu(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      clearCloseTimer();
      closePanels();

      document.dispatchEvent(new CustomEvent('account-drawer:open-request', {
        detail: {
          source: 'institutional-menu',
          state: 'guest',
          surface: 'entry'
        }
      }));
    }

    if (accountDrawerTrigger && accountDrawerTrigger.dataset.accountDrawerBound !== 'true') {
      accountDrawerTrigger.dataset.accountDrawerBound = 'true';
      accountDrawerTrigger.setAttribute('aria-expanded', 'false');
      accountDrawerTrigger.addEventListener('click', openAccountDrawerFromMenu);
    }

    if (menu && menu.dataset.accountDrawerDelegateBound !== 'true') {
      menu.dataset.accountDrawerDelegateBound = 'true';

      menu.addEventListener('click', (event) => {
        const trigger = event.target.closest(
          '[data-account-drawer-trigger="true"], '
          + '#account-drawer-trigger, '
          + '[aria-controls="account-drawer"], '
          + '[data-panel-target="account"], '
          + '[data-nav-panel-target="account"], '
          + '[data-account-trigger]'
        );

        if (!trigger || !menu.contains(trigger)) return;
        openAccountDrawerFromMenu(event);
      });
    }

    /* =============================================================================
       15D) ACCOUNT DRAWER STATE SYNCHRONIZATION
    ============================================================================= */
    if (!document.documentElement.dataset.accountDrawerMenuSyncBound) {
      document.documentElement.dataset.accountDrawerMenuSyncBound = 'true';

      document.addEventListener('account-drawer:opened', () => {
        const liveTrigger = getAccountDrawerTrigger(getMenu());
        if (!liveTrigger) return;
        liveTrigger.setAttribute('aria-expanded', 'true');
      });

      document.addEventListener('account-drawer:closed', () => {
        const liveTrigger = getAccountDrawerTrigger(getMenu());
        if (!liveTrigger) return;
        liveTrigger.setAttribute('aria-expanded', 'false');
      });
    }

    /* =============================================================================
       15E) ACCOUNT DRAWER OPEN-REQUEST ROUTING
    ============================================================================= */

    /* =============================================================================
       15F) COOKIE CONSENT OVERLAY COORDINATION
    ============================================================================= */
    if (!document.documentElement.dataset.cookieConsentMenuSyncBound) {
      document.documentElement.dataset.cookieConsentMenuSyncBound = 'true';

      document.addEventListener('cookie-consent:open-request', () => {
        clearCloseTimer();
        closePanels();
      });

      document.addEventListener('cookie-consent:opened', () => {
        clearCloseTimer();
        closePanels();
      });
    }

    if (!body || !menu || !container || !triggers.length || !panels.length || !backdrop) return false;
    if (menu.dataset.panelsBound === 'true') return true;
    menu.dataset.panelsBound = 'true';

    let activePanelKey = null;
    let closeTimer = null;
    let recognition = null;
    let isListening = false;
    const searchLinksHost = getSearchLinksHost(menu);

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;

    /* =============================================================================
       15A) SEARCH INDEX HELPERS
    ============================================================================= */
    function normalizeSearchValue(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function cleanupSearchTitleArtifacts() {
      if (!searchLinksHost || !searchLinksHost.parentElement) return;

      qa('.institutional-menu-search-links-title', searchLinksHost.parentElement).forEach((title) => {
        if (!searchLinksHost.contains(title)) {
          title.remove();
        }
      });
    }

    function ensureSearchPanelSnapshot() {
      if (searchPanelSnapshot || !searchLinksHost) return;
      cleanupSearchTitleArtifacts();

      searchPanelSnapshot = {
        markup: searchLinksHost.innerHTML
      };
    }

    function ensureSearchTitleElement(label = 'Quick Links') {
      if (!searchLinksHost) return null;
      cleanupSearchTitleArtifacts();

      let title = q('.institutional-menu-search-links-title, .institutional-menu-search-results-title, .institutional-menu-panel-label', searchLinksHost);
      if (!title) {
        title = document.createElement('p');
        title.className = 'institutional-menu-panel-label institutional-menu-search-links-title';
        searchLinksHost.prepend(title);
      }

      title.textContent = label;
      return title;
    }

    function restoreQuickLinks() {
      if (!searchLinksHost) return;
      ensureSearchPanelSnapshot();
      if (!searchPanelSnapshot) return;

      cleanupSearchTitleArtifacts();
      searchLinksHost.innerHTML = searchPanelSnapshot.markup;
    }

    function deriveSearchContextLabel(href = '') {
      const value = String(href || '').trim();
      if (!value) return '';

      const normalized = value
        .replace(/^https?:\/\/[^/]+/i, '')
        .replace(/^\/+/, '')
        .replace(/\/index\.html?$/i, '')
        .replace(/\.html?$/i, '');

      const parts = normalized.split('/').filter(Boolean);
      if (!parts.length) return '';

      const labelMap = {
        pages: '',
        products: 'Products',
        product: 'Products',
        icos: 'ICOS',
        knowledge: 'Knowledge',
        research: 'Research',
        updates: 'Updates',
        update: 'Updates',
        careers: 'Careers',
        legal: 'Legal',
        support: 'Support',
        business: 'Business',
        company: 'Company',
        overview: 'Overview'
      };

      const labels = parts
        .map((part) => labelMap[part.toLowerCase()] || '')
        .filter(Boolean);

      const unique = Array.from(new Set(labels));
      if (!unique.length) return '';
      if (unique.length === 1) return unique[0];
      return `${unique[0]} · ${unique[1]}`;
    }

    function collectMenuSearchEntries() {
      const entryMap = new Map();

      const registerEntry = ({ title, href = '', description = '' }) => {
        const cleanTitle = String(title || '').trim();
        const cleanHref = String(href || '').trim();
        const cleanDescription = String(description || '').trim();
        if (!cleanTitle) return;

        const key = `${cleanTitle}::${cleanHref}`;
        if (entryMap.has(key)) return;

        entryMap.set(key, {
          title: cleanTitle,
          href: cleanHref,
          description: cleanDescription || deriveSearchContextLabel(cleanHref),
          haystack: normalizeSearchValue([cleanTitle, cleanDescription, cleanHref].join(' '))
        });
      };

      qa('a[href]', menu).forEach((link) => {
        registerEntry({
          title: link.textContent,
          href: link.getAttribute('href') || '',
          description: link.getAttribute('aria-label') || ''
        });
      });

      qa('.institutional-menu-panel-trigger', menu).forEach((trigger) => {
        const panelKey = trigger.dataset.menuPanel || '';
        const panel = panelKey ? panels.find((item) => item.dataset.menuPanelContent === panelKey) : null;
        const firstLink = panel ? q('a[href]', panel) : null;

        registerEntry({
          title: trigger.textContent,
          href: firstLink ? firstLink.getAttribute('href') || '' : '',
          description: trigger.getAttribute('aria-label') || ''
        });
      });

      return Array.from(entryMap.values());
    }

    function loadSearchEntries() {
      if (!searchEntriesPromise) {
        searchEntriesPromise = Promise.resolve(collectMenuSearchEntries());
      }
      return searchEntriesPromise;
    }

    /* =============================================================================
       15B) SEARCH RESULTS RENDERING
    ============================================================================= */
    function renderSearchResults(query = '') {
      if (!searchLinksHost) return;

      ensureSearchPanelSnapshot();

      const normalizedQuery = normalizeSearchValue(query);
      if (!normalizedQuery) {
        restoreQuickLinks();
        return;
      }

      loadSearchEntries().then((entries) => {
        if (!menu.isConnected || !searchLinksHost) return;

        const sourceEntries = Array.isArray(entries) ? entries : [];
        const matches = sourceEntries
          .filter((entry) => entry.haystack.includes(normalizedQuery))
          .slice(0, 8);

        cleanupSearchTitleArtifacts();
        searchLinksHost.innerHTML = '';
        ensureSearchTitleElement('Suggested Searches');

        if (!matches.length) {
          const empty = document.createElement('p');
          empty.className = 'institutional-menu-search-results-empty';
          empty.textContent = `No results for “${query.trim()}”.`;
          searchLinksHost.appendChild(empty);
          return;
        }

        matches.forEach((entry) => {
          const item = document.createElement(entry.href ? 'a' : 'div');
          item.className = 'institutional-menu-search-result';

          if (entry.href && item instanceof HTMLAnchorElement) {
            item.href = entry.href;
          }

          if (entry.description) {
            const meta = document.createElement('span');
            meta.className = 'institutional-menu-search-result-meta';
            meta.textContent = `${entry.description} `;
            item.appendChild(meta);
          }

          const itemTitle = document.createElement('span');
          itemTitle.className = 'institutional-menu-search-result-title';
          itemTitle.textContent = entry.title;
          item.appendChild(itemTitle);

          searchLinksHost.appendChild(item);
        });
      });
    }

    function clearCloseTimer() {
      if (!closeTimer) return;
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }

    function syncPanelHeight() {
      const activePanel = panels.find((panel) => panel.classList.contains('is-active'));
      const height = activePanel ? activePanel.offsetHeight : 0;
      menu.style.setProperty('--institutional-menu-panel-height', `${height}px`);
    }

    function syncMicState() {
      if (!micButton) return;
      micButton.setAttribute('aria-pressed', isListening ? 'true' : 'false');
      micButton.classList.toggle('is-listening', isListening);
      micButton.setAttribute('aria-label', isListening ? 'Stop voice search' : 'Start voice search');
    }

    function stopRecognitionIfNeeded() {
      if (recognition && isListening) {
        recognition.stop();
      }
    }

    function closePanels() {
      activePanelKey = null;
      body.classList.remove('institutional-menu-panel-open');
      menu.removeAttribute('data-active-menu-panel');
      container.setAttribute('aria-hidden', 'true');

      triggers.forEach((trigger) => {
        trigger.setAttribute('aria-expanded', 'false');
      });

      panels.forEach((panel) => {
        panel.classList.remove('is-active');
      });

      menu.style.setProperty('--institutional-menu-panel-height', '0px');
      restoreQuickLinks();
      stopRecognitionIfNeeded();
    }

    function openPanel(panelKey) {
      if (!panelKey) return;
      const nextPanel = panels.find((panel) => panel.dataset.menuPanelContent === panelKey);
      if (!nextPanel) return;

      activePanelKey = panelKey;
      body.classList.add('institutional-menu-panel-open');
      menu.setAttribute('data-active-menu-panel', panelKey);
      container.setAttribute('aria-hidden', 'false');

      triggers.forEach((trigger) => {
        const active = trigger.dataset.menuPanel === panelKey;
        trigger.setAttribute('aria-expanded', active ? 'true' : 'false');
      });

      panels.forEach((panel) => {
        panel.classList.toggle('is-active', panel.dataset.menuPanelContent === panelKey);
      });

      nextFrame(() => {
        syncPanelHeight();
        if (panelKey === 'search' && searchInput) {
          searchInput.focus();
          renderSearchResults(searchInput.value || '');
        } else if (panelKey !== 'search') {
          restoreQuickLinks();
        }
      });
    }

    function scheduleClose(delay = 90) {
      clearCloseTimer();
      closeTimer = window.setTimeout(() => {
        closePanels();
      }, delay);
    }

    function isWithinMenuExperience(target) {
      if (!isElement(target)) return false;
      return menu.contains(target) || container.contains(target);
    }

    function openFromTrigger(trigger) {
      if (!isDesktop() || !trigger) return;
      const panelKey = trigger.dataset.menuPanel || '';
      if (!panelKey || panelKey === 'search') return;

      clearCloseTimer();
      if (activePanelKey === panelKey && body.classList.contains('institutional-menu-panel-open')) return;
      openPanel(panelKey);
    }

    function ensureRecognition() {
      if (!SpeechRecognitionCtor) return null;
      if (recognition) return recognition;

      recognition = new SpeechRecognitionCtor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.addEventListener('start', () => {
        isListening = true;
        syncMicState();
        clearCloseTimer();
      });

      recognition.addEventListener('result', (event) => {
        if (!searchInput) return;
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript || '')
          .join('')
          .trim();

        searchInput.value = transcript;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        renderSearchResults(searchInput.value || '');
      });

      recognition.addEventListener('end', () => {
        isListening = false;
        syncMicState();
        if (activePanelKey === 'search' && searchInput) {
          nextFrame(() => searchInput.focus());
        }
      });

      recognition.addEventListener('error', () => {
        isListening = false;
        syncMicState();
      });

      return recognition;
    }

    if (searchInput && searchInput.dataset.searchResultsBound !== 'true') {
      searchInput.dataset.searchResultsBound = 'true';
      searchInput.setAttribute('autocomplete', 'off');
      searchInput.setAttribute('spellcheck', 'false');

      searchInput.addEventListener('input', () => {
        renderSearchResults(searchInput.value || '');
      });

      searchInput.addEventListener('focus', () => {
        renderSearchResults(searchInput.value || '');
      });
    }

    triggers.forEach((trigger) => {
      if (trigger.dataset.panelTriggerBound === 'true') return;
      trigger.dataset.panelTriggerBound = 'true';

      trigger.addEventListener('mouseenter', () => openFromTrigger(trigger));
      trigger.addEventListener('pointerenter', () => openFromTrigger(trigger));
      trigger.addEventListener('focus', () => openFromTrigger(trigger));

      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearCloseTimer();

        const panelKey = trigger.dataset.menuPanel || '';
        if (!panelKey) return;

        if (activePanelKey === panelKey) {
          closePanels();
          return;
        }

        openPanel(panelKey);
      });
    });

    menu.addEventListener('mouseover', (event) => {
      const trigger = event.target.closest('.institutional-menu-panel-trigger');
      if (!trigger || !menu.contains(trigger)) return;
      openFromTrigger(trigger);
    });

    menu.addEventListener('pointerover', (event) => {
      const trigger = event.target.closest('.institutional-menu-panel-trigger');
      if (!trigger || !menu.contains(trigger)) return;
      openFromTrigger(trigger);
    });

    menu.addEventListener('focusin', (event) => {
      const trigger = event.target.closest('.institutional-menu-panel-trigger');
      if (!trigger || !menu.contains(trigger)) return;
      openFromTrigger(trigger);
    });

    if (micButton && micButton.dataset.micBound !== 'true') {
      micButton.dataset.micBound = 'true';
      syncMicState();

      micButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearCloseTimer();

        if (activePanelKey !== 'search') {
          openPanel('search');
        }

        if (!SpeechRecognitionCtor) {
          if (searchInput) searchInput.focus();
          return;
        }

        const speech = ensureRecognition();
        if (!speech) return;

        if (isListening) {
          speech.stop();
          return;
        }

        speech.lang = document.documentElement.lang || 'en';
        speech.start();
      });
    }

    menu.addEventListener('mouseleave', (event) => {
      if (!isDesktop()) return;
      if (isWithinMenuExperience(event.relatedTarget)) return;
      scheduleClose(60);
    });

    container.addEventListener('mouseenter', clearCloseTimer);
    container.addEventListener('pointerenter', clearCloseTimer);
    container.addEventListener('mouseleave', (event) => {
      if (!isDesktop()) return;
      if (isWithinMenuExperience(event.relatedTarget)) return;
      scheduleClose(60);
    });
    container.addEventListener('pointerleave', (event) => {
      if (!isDesktop()) return;
      if (isWithinMenuExperience(event.relatedTarget)) return;
      scheduleClose(60);
    });

    shells.forEach((shell) => {
      shell.addEventListener('mouseenter', clearCloseTimer);
      shell.addEventListener('pointerenter', clearCloseTimer);
      shell.addEventListener('mouseleave', (event) => {
        if (!isDesktop()) return;
        if (isWithinMenuExperience(event.relatedTarget)) return;
        scheduleClose(60);
      });
      shell.addEventListener('pointerleave', (event) => {
        if (!isDesktop()) return;
        if (isWithinMenuExperience(event.relatedTarget)) return;
        scheduleClose(60);
      });
    });

    backdrop.addEventListener('mouseenter', () => {
      if (!isDesktop()) return;
      clearCloseTimer();
      closePanels();
    });
    backdrop.addEventListener('pointerenter', () => {
      if (!isDesktop()) return;
      clearCloseTimer();
      closePanels();
    });
    backdrop.addEventListener('mouseover', () => {
      if (!isDesktop()) return;
      clearCloseTimer();
      closePanels();
    });
    backdrop.addEventListener('click', () => {
      clearCloseTimer();
      closePanels();
    });

    if (!globalBound) {
      globalBound = true;

      document.addEventListener('keydown', (event) => {
        const liveMenu = getMenu();
        if (!liveMenu || liveMenu.dataset.panelsBound !== 'true') return;
        if (event.key !== 'Escape') return;
        clearCloseTimer();
        closePanels();
      });

      document.addEventListener('click', (event) => {
        const liveMenu = getMenu();
        const liveContainer = getPanelContainer(liveMenu);
        if (!liveMenu || !liveContainer || liveMenu.dataset.panelsBound !== 'true') return;
        if (liveMenu.contains(event.target) || liveContainer.contains(event.target)) return;
        clearCloseTimer();
        closePanels();
      });

      window.addEventListener('resize', () => {
        const liveMenu = getMenu();
        if (!liveMenu || liveMenu.dataset.panelsBound !== 'true') return;

        if (!isDesktop()) {
          closePanels();
          return;
        }

        if (!body.classList.contains('institutional-menu-panel-open')) return;
        syncPanelHeight();
      }, { passive: true });
    }

    closePanels();
    return true;
  }

  /* =============================================================================
     16) MAIN INITIALIZATION
  ============================================================================= */
  function initInstitutionalMenu() {
    bindSecondaryToggle();
    bindRibbon();
    applyTranslations();
    bindCountrySelector();

    const panelsBound = bindPanels();

    if (panelsBound) {
      retryCount = 0;
      return;
    }

    if (retryCount >= MAX_RETRIES) return;
    retryCount += 1;
    window.setTimeout(scheduleInit, 120);
  }

  /* =============================================================================
     17) LIFECYCLE HOOKS
  ============================================================================= */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInit, { once: true });
  } else {
    scheduleInit();
  }

  window.addEventListener('load', scheduleInit, { once: true });
  document.addEventListener('institutional-menu:mounted', scheduleInit);
})();