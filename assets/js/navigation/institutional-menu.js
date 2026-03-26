/* =================== Institutional Primary Menu =================== */

(function () {
  'use strict';

  const body = document.body;
  const desktopQuery = window.matchMedia('(min-width: 761px)');

  let initScheduled = false;
  let retryCount = 0;
  const MAX_RETRIES = 24;

  let mountObserver = null;
  let globalBound = false;

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

  function disconnectMountObserver() {
    if (!mountObserver) return;
    mountObserver.disconnect();
    mountObserver = null;
  }

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

  function getSecondaryToggle() {
    return byId('institutional-menu-secondary-toggle');
  }

  function getLegacyMenuButton() {
    return byId('menu-button');
  }

  function getOverlay() {
    return byId('menu-overlay');
  }

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

  function setCountryOverlayState(open) {
    body.classList.toggle('country-overlay-open', !!open);
    body.classList.toggle('country-selector-open', !!open);

    const selector = getCountrySelector();
    if (selector) {
      selector.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
  }

  function getPageTop(el) {
    const rect = el.getBoundingClientRect();
    const pageY = window.scrollY || window.pageYOffset || 0;
    return rect.top + pageY;
  }

  function getOuterHeight(el) {
    const rect = el.getBoundingClientRect();
    return rect.height || el.offsetHeight || window.innerHeight || 0;
  }

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

  function bindRibbon() {
    const menu = getMenu();
    const hero = byId('home-hero');
    const stage = q('.stage-circle');
    const essence = byId('home-essence');

    if (!body || !menu || menu.dataset.ribbonBound === 'true') return;
    menu.dataset.ribbonBound = 'true';
    body.classList.remove('menu-ribbon-active');

    const applyRibbonState = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      let threshold = Number.POSITIVE_INFINITY;

      if (essence) {
        threshold = getPageTop(essence) + 48;
      } else if (hero) {
        threshold = getPageTop(hero) + getOuterHeight(hero) + 220;
      } else if (stage) {
        threshold = getPageTop(stage) + getOuterHeight(stage) + 220;
      }

      if (!Number.isFinite(threshold)) {
        threshold = Number.POSITIVE_INFINITY;
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

    nextFrame(requestApply);
    requestApply();
  }

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

  function bindPanels() {
    const menu = getMenu();
    const container = getPanelContainer(menu);
    const triggers = getTriggers(menu);
    const panels = getPanels(menu);
    const backdrop = getBackdrop(menu);
    const shells = getShells(menu);
    const searchInput = getSearchInput(menu);
    const micButton = getMicButton(menu);

    if (!body || !menu || !container || !triggers.length || !panels.length || !backdrop) return false;
    if (menu.dataset.panelsBound === 'true') return true;
    menu.dataset.panelsBound = 'true';

    let activePanelKey = null;
    let closeTimer = null;
    let recognition = null;
    let isListening = false;

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;

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

    function bindHoverAwayClose() {
      if (menu.dataset.hoverAwayBound === 'true') return;
      menu.dataset.hoverAwayBound = 'true';

      const mapLayerSelectors = [
        '.stage-circle',
        '.stage',
        '#home-hero',
        '.home-hero',
        '.hero-map',
        '.map-layer',
        '.map-stage',
        '.globe-wrap',
        '.hero-visual'
      ].join(',');

      const isMapLayerTarget = (target) => {
        if (!isElement(target)) return false;
        return !!target.closest(mapLayerSelectors);
      };

      const handleHoverAway = (event) => {
        if (!isDesktop()) return;
        if (!body.classList.contains('institutional-menu-panel-open')) return;
        if (isWithinMenuExperience(event.target)) {
          clearCloseTimer();
          return;
        }
        if (!isMapLayerTarget(event.target)) return;
        scheduleClose(60);
      };

      document.addEventListener('pointermove', handleHoverAway, true);
      document.addEventListener('mousemove', handleHoverAway, true);
      document.addEventListener('pointerover', handleHoverAway, true);
      document.addEventListener('mouseover', handleHoverAway, true);
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
      clearCloseTimer();
    });

    container.addEventListener('mouseenter', clearCloseTimer);
    container.addEventListener('pointerenter', clearCloseTimer);
    container.addEventListener('mouseleave', (event) => {
      if (!isDesktop()) return;
      if (isWithinMenuExperience(event.relatedTarget)) return;
      clearCloseTimer();
    });
    container.addEventListener('pointerleave', (event) => {
      if (!isDesktop()) return;
      if (isWithinMenuExperience(event.relatedTarget)) return;
      clearCloseTimer();
    });

    shells.forEach((shell) => {
      shell.addEventListener('mouseenter', clearCloseTimer);
      shell.addEventListener('pointerenter', clearCloseTimer);
      shell.addEventListener('mouseleave', (event) => {
        if (!isDesktop()) return;
        if (isWithinMenuExperience(event.relatedTarget)) return;
        clearCloseTimer();
      });
      shell.addEventListener('pointerleave', (event) => {
        if (!isDesktop()) return;
        if (isWithinMenuExperience(event.relatedTarget)) return;
        clearCloseTimer();
      });
    });

    backdrop.addEventListener('mouseenter', () => {
      if (!isDesktop()) return;
      scheduleClose(40);
    });
    backdrop.addEventListener('pointerenter', () => {
      if (!isDesktop()) return;
      scheduleClose(40);
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

    bindHoverAwayClose();
    closePanels();
    return true;
  }

  function initInstitutionalMenu() {
    bindSecondaryToggle();
    bindRibbon();
    applyTranslations();
    bindCountrySelector();

    const panelsBound = bindPanels();

    if (panelsBound) {
      retryCount = 0;
      disconnectMountObserver();
      return;
    }

    if (retryCount >= MAX_RETRIES) return;
    retryCount += 1;

    window.setTimeout(scheduleInit, 120);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInit, { once: true });
  } else {
    scheduleInit();
  }

  window.addEventListener('load', scheduleInit, { once: true });
  document.addEventListener('institutional-menu:mounted', scheduleInit);

  mountObserver = new MutationObserver(() => {
    const menu = getMenu();
    if (!menu) return;
    scheduleInit();
  });

  mountObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();