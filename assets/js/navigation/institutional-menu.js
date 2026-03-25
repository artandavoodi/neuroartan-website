/* =================== Institutional Primary Menu =================== */

(function () {
  'use strict';

  let institutionalMenuInitScheduled = false;
  let institutionalMenuRetryCount = 0;
  const INSTITUTIONAL_MENU_MAX_RETRIES = 24;
  let institutionalMenuGlobalBound = false;

  function scheduleInstitutionalMenuInit() {
    if (institutionalMenuInitScheduled) return;
    institutionalMenuInitScheduled = true;

    window.requestAnimationFrame(() => {
      institutionalMenuInitScheduled = false;
      initInstitutionalMenu();
    });
  }

  function bindInstitutionalSecondaryToggle() {
    const trigger = document.getElementById('institutional-menu-secondary-toggle');
    const overlay = document.getElementById('menu-overlay');
    const legacyButton = document.getElementById('menu-button');

    if (!trigger || trigger.__neuroartanBound) return;
    trigger.__neuroartanBound = true;

    trigger.addEventListener('click', () => {
      if (legacyButton && typeof legacyButton.click === 'function') {
        legacyButton.click();
      }

      const isExpanded = overlay ? overlay.getAttribute('aria-hidden') === 'false' : false;
      trigger.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    });

    if (overlay && !overlay.__neuroartanSecondaryObserved) {
      const syncState = () => {
        const isExpanded = overlay.getAttribute('aria-hidden') === 'false';
        trigger.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      };

      const observer = new MutationObserver(syncState);
      observer.observe(overlay, { attributes: true, attributeFilter: ['aria-hidden'] });
      overlay.__neuroartanSecondaryObserved = true;
      syncState();
    }
  }

  function bindInstitutionalMenuRibbon() {
    const body = document.body;
    const hero = document.getElementById('home-hero');
    const stage = document.querySelector('.stage-circle');
    const menu = document.getElementById('institutional-menu');
    const essence = document.getElementById('home-essence');

    const getPageTop = (el) => {
      const rect = el.getBoundingClientRect();
      const pageY = window.scrollY || window.pageYOffset || 0;
      return rect.top + pageY;
    };

    const getOuterHeight = (el) => {
      const rect = el.getBoundingClientRect();
      return rect.height || el.offsetHeight || window.innerHeight || 0;
    };

    if (!body || !menu || menu.__neuroartanRibbonBound) return;
    menu.__neuroartanRibbonBound = true;
    body.classList.remove('menu-ribbon-active');

    const applyRibbonState = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      let threshold = Number.POSITIVE_INFINITY;

      if (essence) {
        const essenceTop = getPageTop(essence);
        threshold = essenceTop + 48;
      } else if (hero) {
        const heroBottom = getPageTop(hero) + getOuterHeight(hero);
        threshold = heroBottom + 220;
      } else if (stage) {
        const stageBottom = getPageTop(stage) + getOuterHeight(stage);
        threshold = stageBottom + 220;
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

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(requestApply);
    });

    requestApply();
  }

  function applyInstitutionalMenuTranslations() {
    const translationEngine = window.NEUROARTAN_TRANSLATION;
    const menu = document.getElementById('institutional-menu');
    if (!translationEngine || typeof translationEngine.applyLanguage !== 'function' || !menu) return;

    const storedLanguage =
      localStorage.getItem('neuroartan_language') ||
      localStorage.getItem('neuroartan-language') ||
      document.documentElement.lang ||
      'en';

    const normalizedLanguage = String(storedLanguage).toLowerCase().split('-')[0] || 'en';
    translationEngine.applyLanguage(normalizedLanguage, menu);
  }

  function bindInstitutionalMenuPanels() {
    const body = document.body;
    const menu = document.getElementById('institutional-menu');

    if (!body || !menu) return false;

    const panelContainer = menu.querySelector('.institutional-menu-panels');
    const triggers = Array.from(menu.querySelectorAll('.institutional-menu-panel-trigger'));
    const panels = Array.from(menu.querySelectorAll('.institutional-menu-panel'));
    const searchInput = menu.querySelector('#institutional-menu-search-input');
    const micButton = menu.querySelector('.institutional-menu-mic-button');
    const panelShells = Array.from(menu.querySelectorAll('.institutional-menu-panel-shell'));
    const panelBackdrop = menu.querySelector('.institutional-menu-panels-backdrop');

    if (!panelContainer || !triggers.length || !panels.length || !panelBackdrop) return false;
    if (menu.__neuroartanPanelsBound) return true;
    menu.__neuroartanPanelsBound = true;

    let activePanelKey = null;
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    let closeTimer = null;
    let speechRecognition = null;
    let speechListening = false;

    const isDesktopMenuMode = () => window.matchMedia('(min-width: 761px)').matches;

    const getTriggerFromTarget = (target) => {
      if (!(target instanceof Element)) return null;
      return target.closest('.institutional-menu-panel-trigger');
    };

    const syncPanelHeight = () => {
      const activePanel = panels.find((panel) => panel.classList.contains('is-active'));
      const height = activePanel ? activePanel.offsetHeight : 0;
      menu.style.setProperty('--institutional-menu-panel-height', `${height}px`);
    };

    const clearCloseTimer = () => {
      if (!closeTimer) return;
      window.clearTimeout(closeTimer);
      closeTimer = null;
    };

    const syncMicState = () => {
      if (!micButton) return;

      micButton.setAttribute('aria-pressed', speechListening ? 'true' : 'false');
      micButton.classList.toggle('is-listening', speechListening);
      micButton.setAttribute(
        'aria-label',
        speechListening ? 'Stop voice search' : 'Start voice search'
      );
    };

    const closePanels = () => {
      activePanelKey = null;
      body.classList.remove('institutional-menu-panel-open');
      panelContainer.setAttribute('aria-hidden', 'true');

      if (speechRecognition && speechListening) {
        speechRecognition.stop();
      }

      triggers.forEach((trigger) => {
        trigger.setAttribute('aria-expanded', 'false');
      });

      panels.forEach((panel) => {
        panel.classList.remove('is-active');
      });

      menu.style.setProperty('--institutional-menu-panel-height', '0px');
      menu.removeAttribute('data-active-menu-panel');
    };

    const openPanel = (panelKey) => {
      if (!panelKey) return;

      const nextPanel = panels.find((panel) => panel.dataset.menuPanelContent === panelKey);
      if (!nextPanel) return;

      activePanelKey = panelKey;
      body.classList.add('institutional-menu-panel-open');
      panelContainer.setAttribute('aria-hidden', 'false');
      menu.setAttribute('data-active-menu-panel', panelKey);

      triggers.forEach((trigger) => {
        const isActive = trigger.dataset.menuPanel === panelKey;
        trigger.setAttribute('aria-expanded', isActive ? 'true' : 'false');
      });

      panels.forEach((panel) => {
        panel.classList.toggle('is-active', panel.dataset.menuPanelContent === panelKey);
      });

      window.requestAnimationFrame(() => {
        syncPanelHeight();

        if (panelKey === 'search' && searchInput) {
          searchInput.focus();
        }
      });
    };

    const scheduleClose = (delay = 120) => {
      clearCloseTimer();
      closeTimer = window.setTimeout(() => {
        closePanels();
      }, delay);
    };

    const openFromTrigger = (trigger) => {
      if (!trigger || !isDesktopMenuMode()) return;

      const panelKey = trigger.dataset.menuPanel || '';
      if (!panelKey || panelKey === 'search') return;

      clearCloseTimer();
      openPanel(panelKey);
    };

    const ensureSpeechRecognition = () => {
      if (!SpeechRecognitionCtor) return null;
      if (speechRecognition) return speechRecognition;

      speechRecognition = new SpeechRecognitionCtor();
      speechRecognition.continuous = false;
      speechRecognition.interimResults = true;
      speechRecognition.maxAlternatives = 1;

      speechRecognition.addEventListener('start', () => {
        speechListening = true;
        clearCloseTimer();
        syncMicState();
      });

      speechRecognition.addEventListener('result', (event) => {
        if (!searchInput) return;

        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript || '')
          .join('')
          .trim();

        searchInput.value = transcript;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      });

      speechRecognition.addEventListener('end', () => {
        speechListening = false;
        syncMicState();

        if (activePanelKey === 'search' && searchInput) {
          window.requestAnimationFrame(() => {
            searchInput.focus();
          });
        }
      });

      speechRecognition.addEventListener('error', () => {
        speechListening = false;
        syncMicState();
      });

      return speechRecognition;
    };

    triggers.forEach((trigger) => {
      trigger.addEventListener('mouseenter', () => {
        openFromTrigger(trigger);
      });

      trigger.addEventListener('pointerenter', () => {
        openFromTrigger(trigger);
      });

      trigger.addEventListener('focus', () => {
        const panelKey = trigger.dataset.menuPanel || '';
        if (panelKey === 'search') return;
        openFromTrigger(trigger);
      });

      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearCloseTimer();

        const panelKey = trigger.dataset.menuPanel || '';

        if (panelKey === 'search') {
          if (activePanelKey === 'search') {
            closePanels();
            return;
          }

          openPanel('search');
          return;
        }

        if (activePanelKey === panelKey) {
          closePanels();
          return;
        }

        openPanel(panelKey);
      });
    });

    menu.addEventListener('mouseover', (event) => {
      const trigger = getTriggerFromTarget(event.target);
      if (!trigger || !menu.contains(trigger)) return;
      openFromTrigger(trigger);
    });

    menu.addEventListener('pointerover', (event) => {
      const trigger = getTriggerFromTarget(event.target);
      if (!trigger || !menu.contains(trigger)) return;
      openFromTrigger(trigger);
    });

    menu.addEventListener('focusin', (event) => {
      const trigger = getTriggerFromTarget(event.target);
      if (!trigger || !menu.contains(trigger)) return;
      openFromTrigger(trigger);
    });

    if (micButton) {
      syncMicState();

      micButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        clearCloseTimer();

        if (!isDesktopMenuMode()) return;

        if (activePanelKey !== 'search') {
          openPanel('search');
        }

        if (!SpeechRecognitionCtor) {
          if (searchInput) searchInput.focus();
          return;
        }

        const recognition = ensureSpeechRecognition();
        if (!recognition) return;

        if (speechListening) {
          recognition.stop();
          return;
        }

        recognition.lang = document.documentElement.lang || 'en';
        recognition.start();
      });
    }

    menu.addEventListener('mouseleave', () => {
      if (!isDesktopMenuMode()) return;
      scheduleClose();
    });

    panelContainer.addEventListener('mouseenter', () => {
      if (!isDesktopMenuMode()) return;
      clearCloseTimer();
    });

    panelContainer.addEventListener('pointerenter', () => {
      if (!isDesktopMenuMode()) return;
      clearCloseTimer();
    });

    panelContainer.addEventListener('mouseleave', () => {
      if (!isDesktopMenuMode()) return;
      scheduleClose(90);
    });

    panelContainer.addEventListener('pointerleave', () => {
      if (!isDesktopMenuMode()) return;
      scheduleClose(90);
    });

    panelShells.forEach((shell) => {
      shell.addEventListener('mouseenter', () => {
        if (!isDesktopMenuMode()) return;
        clearCloseTimer();
      });

      shell.addEventListener('pointerenter', () => {
        if (!isDesktopMenuMode()) return;
        clearCloseTimer();
      });

      shell.addEventListener('mouseleave', () => {
        if (!isDesktopMenuMode()) return;
        scheduleClose(70);
      });

      shell.addEventListener('pointerleave', () => {
        if (!isDesktopMenuMode()) return;
        scheduleClose(70);
      });
    });

    panelBackdrop.addEventListener('mouseenter', () => {
      if (!isDesktopMenuMode()) return;
      scheduleClose(40);
    });

    panelBackdrop.addEventListener('pointerenter', () => {
      if (!isDesktopMenuMode()) return;
      scheduleClose(40);
    });

    if (!institutionalMenuGlobalBound) {
      institutionalMenuGlobalBound = true;

      document.addEventListener('keydown', (event) => {
        const liveMenu = document.getElementById('institutional-menu');
        if (!liveMenu || !liveMenu.__neuroartanPanelsBound) return;

        if (event.key === 'Escape') {
          clearCloseTimer();
          closePanels();
        }
      });

      document.addEventListener('click', (event) => {
        const liveMenu = document.getElementById('institutional-menu');
        if (!liveMenu || !liveMenu.__neuroartanPanelsBound) return;
        if (liveMenu.contains(event.target)) return;
        clearCloseTimer();
        closePanels();
      });

      window.addEventListener('resize', () => {
        const liveMenu = document.getElementById('institutional-menu');
        if (!liveMenu || !liveMenu.__neuroartanPanelsBound) return;

        if (!isDesktopMenuMode()) {
          if (speechRecognition && speechListening) speechRecognition.stop();
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

  function initInstitutionalMenu() {
    bindInstitutionalSecondaryToggle();
    bindInstitutionalMenuRibbon();
    applyInstitutionalMenuTranslations();

    const panelsBound = bindInstitutionalMenuPanels();

    if (panelsBound) {
      institutionalMenuRetryCount = 0;
      return;
    }

    if (institutionalMenuRetryCount >= INSTITUTIONAL_MENU_MAX_RETRIES) return;
    institutionalMenuRetryCount += 1;

    window.setTimeout(() => {
      scheduleInstitutionalMenuInit();
    }, 120);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInstitutionalMenuInit, { once: true });
  } else {
    scheduleInstitutionalMenuInit();
  }

  window.addEventListener('load', scheduleInstitutionalMenuInit, { once: true });
  document.addEventListener('institutional-menu:mounted', scheduleInstitutionalMenuInit);

  const menuMountObserver = new MutationObserver(() => {
    const menu = document.getElementById('institutional-menu');
    if (!menu) return;
    scheduleInstitutionalMenuInit();
  });

  menuMountObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();