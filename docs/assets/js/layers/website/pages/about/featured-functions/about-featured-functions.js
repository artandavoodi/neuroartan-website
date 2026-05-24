/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) DATA SOURCE
   03) SECTION SELECTORS
   04) RENDER HELPERS
   05) FRAME AND CARD TEMPLATES
   06) SECTION RENDERER
   07) SLIDE STATE HELPERS
   08) CONTROLS, GESTURES, AND AUTOPLAY
   09) INITIAL SCENE STABILIZATION
   10) INITIALIZATION BOOTSTRAP
   11) INITIALIZATION EXECUTION
   12) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(function () {
  'use strict';

  /* ==========================================================================
     02) DATA SOURCE
     ========================================================================== */
  const ABOUT_FEATURED_FUNCTIONS_DATA_PATH = '/collections/featured/icos-featured-functions/icos-featured-functions.json';
  const ABOUT_FEATURED_FUNCTIONS_SCENES_BASE_PATH = '/collections/featured/icos-featured-functions/scenes';

  /* ==========================================================================
     03) SECTION SELECTORS
     ========================================================================== */
  const SECTION_SELECTOR = '[data-about-featured-functions]';
  const TITLE_SELECTOR = '[data-about-featured-functions-title]';
  const DESCRIPTION_SELECTOR = '[data-about-featured-functions-description]';
  const ACTIVE_DESCRIPTION_SELECTOR = '[data-about-featured-functions-active-description]';
  const VIEWPORT_SELECTOR = '[data-about-featured-functions-viewport]';
  const FRAME_SELECTOR = '[data-about-featured-functions-frame]';
  const TRACK_SELECTOR = '[data-about-featured-functions-track]';
  const TIMELINE_SELECTOR = '[data-about-featured-functions-timeline]';
  const TIMELINE_PROGRESS_SELECTOR = '[data-about-featured-functions-timeline-progress]';
  const DOTS_SELECTOR = '[data-about-featured-functions-dots]';
  const DOT_SELECTOR = '[data-about-featured-functions-dot]';
  const PREVIOUS_SELECTOR = '[data-about-featured-functions-previous]';
  const NEXT_SELECTOR = '[data-about-featured-functions-next]';
  const CARD_SELECTOR = '[data-about-featured-functions-card]';
  const READY_CLASS = 'about-featured-functions-ready';
  const INITIALIZED_ATTRIBUTE = 'data-about-featured-functions-initialized';
  const LANGUAGE_DIRECTION_ATTRIBUTE = 'data-about-featured-functions-language-direction';
  const DRAG_THRESHOLD = 48;
  const AUTOPLAY_BASE_DELAY = 11800;

  /* ==========================================================================
     04) RENDER HELPERS
     ========================================================================== */
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function createI18nKey(value, suffix = '') {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const base = normalized || 'item';
    return suffix ? `about_featured_functions_${base}_${suffix}` : `about_featured_functions_${base}`;
  }

  async function loadFeaturedFunctionsData() {
    const response = await fetch(ABOUT_FEATURED_FUNCTIONS_DATA_PATH, {
      credentials: 'same-origin',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to load featured functions data: ${response.status}`);
    }

    return response.json();
  }

  async function loadSceneConfig(scenePathOrId) {
    const raw = String(scenePathOrId || '').trim();
    const scenePath = raw.endsWith('.scene.json')
      ? raw
      : `${ABOUT_FEATURED_FUNCTIONS_SCENES_BASE_PATH}/${encodeURIComponent(raw)}.scene.json`;

    const response = await fetch(scenePath, {
      credentials: 'same-origin',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to load featured function scene: ${scenePath} (${response.status})`);
    }

    return response.json();
  }

  async function loadSectionScene(sectionData) {
    const sceneRef = String(sectionData?.scene || '').trim();

    if (!sceneRef) {
      return null;
    }

    try {
      return await loadSceneConfig(sceneRef);
    } catch (error) {
      console.warn('[about-featured-functions] Failed to load unified section scene.', error);
      return null;
    }
  }

  function sortItems(items) {
    return [...items].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getAutoplayDelay(item) {
    const text = `${item?.title || ''} ${item?.description || ''}`.trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    const readableDelay = wordCount * 260;
    return AUTOPLAY_BASE_DELAY + readableDelay;
  }

  function getCardsPerView() {
    return 1;
  }

  function getTrackMetrics(track) {
    const firstCard = track.querySelector(CARD_SELECTOR);

    if (!firstCard) {
      return {
        cardWidth: 0,
        gap: 0,
        step: 0
      };
    }

    const trackStyles = window.getComputedStyle(track);
    const gap = parseFloat(trackStyles.columnGap || trackStyles.gap || '0') || 0;
    const cardWidth = firstCard.getBoundingClientRect().width;

    return {
      cardWidth,
      gap,
      step: cardWidth + gap
    };
  }

  function getMaxIndex(totalItems, cardsPerView) {
    return Math.max(0, totalItems - cardsPerView);
  }

  function resolveLanguageDirection(detail = null) {
    if (detail && typeof detail.rtl === 'boolean') {
      return detail.rtl ? 'rtl' : 'ltr';
    }

    const siteMain = document.getElementById('site-main');
    const candidates = [
      siteMain?.getAttribute('data-dir'),
      siteMain?.getAttribute('dir'),
      document.body?.getAttribute('data-dir'),
      document.body?.getAttribute('dir'),
      document.documentElement.classList.contains('lang-rtl') ? 'rtl' : ''
    ];

    const normalized = String(candidates.find(Boolean) || 'ltr').trim().toLowerCase();
    return normalized === 'rtl' ? 'rtl' : 'ltr';
  }

  function applyLanguageDirection(section, detail = null) {
    if (!section) {
      return;
    }

    section.setAttribute(LANGUAGE_DIRECTION_ATTRIBUTE, resolveLanguageDirection(detail));
  }

  function bindLanguageDirection(section) {
    if (!section || section.__featuredFunctionsLanguageDirectionHandler) {
      return;
    }

    const handleLanguageApplied = (event) => {
      applyLanguageDirection(section, event?.detail || null);
    };

    window.addEventListener('neuroartan:language-applied', handleLanguageApplied);
    section.__featuredFunctionsLanguageDirectionHandler = handleLanguageApplied;
  }

  /* ==========================================================================
     05) FRAME AND CARD TEMPLATES
     ========================================================================== */

  function createFrameSceneMarkup(scene) {
    const sceneId = escapeHtml(scene?.id || 'core-capabilities-frame');
    const sceneType = escapeHtml(scene?.scene_type || 'unified');

    return `
      <div class="about-featured-functions-frame-scene" data-about-featured-functions-scene data-scene-id="${sceneId}" data-scene-type="${sceneType}" aria-hidden="true"></div>
    `;
  }
  function createCardMarkup(item) {
    const label = escapeHtml(item.label || '');
    const title = escapeHtml(item.title || '');
    const href = escapeHtml(item.href || '/404.html');
    const icon = escapeHtml(item.icon || '');
    const theme = escapeHtml(item.theme || 'dark');
    const id = escapeHtml(item.id || 'feature-card');
    const i18nBase = createI18nKey(item.id || item.title || 'item');
    const labelI18nKey = `${i18nBase}_label`;
    const linkAriaI18nKey = `${i18nBase}_link_aria_label`;

    return `
      <article class="about-featured-functions-card" data-about-featured-functions-card data-feature-id="${id}" data-theme="${theme}">
        <div class="about-featured-functions-card-copy">
          <div class="about-featured-functions-card-summary">
            ${icon ? `<span class="about-featured-functions-card-icon" aria-hidden="true"><img class="ui-icon-theme-aware" src="${icon}" alt="" decoding="async"></span>` : ''}
            <p class="about-featured-functions-card-label" data-i18n-key="${labelI18nKey}">${label}</p>
          </div>
        </div>
      </article>
    `;
  }

  /* ==========================================================================
     06) SECTION RENDERER
     ========================================================================== */
  function renderSection(section, data) {
    const title = section.querySelector(TITLE_SELECTOR);
    const description = section.querySelector(DESCRIPTION_SELECTOR);
    const track = section.querySelector(TRACK_SELECTOR);
    const dots = section.querySelector(DOTS_SELECTOR);
    const frame = section.querySelector(FRAME_SELECTOR);

    const sectionData = data.section || {};
    const items = sortItems(Array.isArray(data.items) ? data.items : []);

    if (title) {
      title.textContent = sectionData.title || '';
      title.setAttribute('data-i18n-key', 'about_featured_functions_section_title');
    }

    if (description) {
      description.textContent = sectionData.description || '';
      description.setAttribute('data-i18n-key', 'about_featured_functions_section_description');
    }

    if (frame && data.scene && !frame.querySelector('[data-about-featured-functions-scene]')) {
      frame.insertAdjacentHTML('afterbegin', createFrameSceneMarkup(data.scene));
    }

    if (track) track.innerHTML = items.map(createCardMarkup).join('');

    if (dots) {
      dots.innerHTML = items
        .map((item, index) => {
          const dotLabel = `Go to ${escapeHtml(item.title || `slide ${index + 1}`)}`;
          const dotI18nKey = `${createI18nKey(item.id || item.title || `slide_${index + 1}`)}_dot_aria_label`;

          return `
          <button
            type="button"
            class="about-featured-functions-dot"
            data-about-featured-functions-dot
            data-slide-index="${index}"
            aria-label="${dotLabel}"
            data-i18n-aria-label-key="${dotI18nKey}"></button>
        `;
        })
        .join('');
    }


    return {
      section: sectionData,
      items
    };
  }

  /* ==========================================================================
     07) SLIDE STATE HELPERS
     ========================================================================== */
  function createInteractionState(section, data) {
    return {
      section,
      data,
      totalItems: data.items.length,
      currentIndex: 0,
      cardsPerView: getCardsPerView(),
      dragStartX: 0,
      dragDeltaX: 0,
      isPointerDown: false,
      autoplayTimer: 0,
      autoplayPaused: false
    };
  }

  function updateDots(state) {
    const dots = state.section.querySelectorAll(DOT_SELECTOR);
    const activeIndex = clamp(state.currentIndex, 0, Math.max(0, state.totalItems - 1));

    dots.forEach((dot, index) => {
      if (index === activeIndex) {
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.removeAttribute('aria-current');
      }
    });
  }

  function updateControls(state) {
    const previousButton = state.section.querySelector(PREVIOUS_SELECTOR);
    const nextButton = state.section.querySelector(NEXT_SELECTOR);
    const shouldDisable = state.totalItems <= 1;

    if (previousButton) {
      previousButton.disabled = shouldDisable;
    }

    if (nextButton) {
      nextButton.disabled = shouldDisable;
    }
  }

  function updateActiveDescription(state) {
    const activeDescription = state.section.querySelector(ACTIVE_DESCRIPTION_SELECTOR);

    if (!activeDescription) {
      return;
    }

    const activeItem = state.data.items[state.currentIndex] || null;
    activeDescription.textContent = activeItem?.description || '';

    if (activeItem) {
      activeDescription.setAttribute('data-i18n-key', `${createI18nKey(activeItem.id || activeItem.title || 'item')}_description`);
    } else {
      activeDescription.removeAttribute('data-i18n-key');
    }
  }

  function updateFrameLink(state) {
    const frame = state.section.querySelector(FRAME_SELECTOR);

    if (!frame) {
      return;
    }

    const activeItem = state.data.items[state.currentIndex] || null;
    const href = String(activeItem?.href || '').trim();
    const title = String(activeItem?.title || activeItem?.label || 'capability').trim();

    if (!href) {
      frame.removeAttribute('role');
      frame.removeAttribute('tabindex');
      frame.removeAttribute('aria-label');
      frame.removeAttribute('data-active-href');
      return;
    }

    frame.setAttribute('role', 'link');
    frame.setAttribute('tabindex', '0');
    frame.setAttribute('aria-label', `Open ${title}`);
    frame.setAttribute('data-active-href', href);
  }

  function emitSlideState(state) {
    state.section.dispatchEvent(new CustomEvent('about-featured-functions:slide-change', {
      bubbles: false,
      detail: {
        currentIndex: state.currentIndex,
        totalItems: state.totalItems
      }
    }));
  }

  function updateRail(state) {
    const track = state.section.querySelector(TRACK_SELECTOR);

    if (!track) {
      return;
    }

    state.cardsPerView = getCardsPerView();
    state.currentIndex = clamp(state.currentIndex, 0, getMaxIndex(state.totalItems, state.cardsPerView));

    const { step } = getTrackMetrics(track);
    const offset = step > 0 ? state.currentIndex * step * -1 : 0;

    state.section.style.setProperty('--about-featured-functions-rail-offset', `${offset}px`);
    updateDots(state);
    updateControls(state);
    updateActiveDescription(state);
    updateFrameLink(state);
    emitSlideState(state);
  }

  function stopAutoplay(state) {
    window.clearTimeout(state.autoplayTimer);
    state.autoplayTimer = 0;

    const progress = state.section.querySelector(TIMELINE_PROGRESS_SELECTOR);

    if (progress) {
      progress.style.transition = 'none';
    }
  }

  function updateTimeline(state, duration = 0) {
    const progress = state.section.querySelector(TIMELINE_PROGRESS_SELECTOR);

    if (!progress) {
      return;
    }

    progress.style.transition = 'none';
    state.section.style.setProperty('--about-featured-functions-timeline-progress-scale', '0');

    if (duration <= 0 || state.totalItems <= 1) {
      return;
    }

    window.requestAnimationFrame(() => {
      progress.style.transition = `transform ${duration}ms linear`;
      state.section.style.setProperty('--about-featured-functions-timeline-progress-scale', '1');
    });
  }

  function scheduleAutoplay(state) {
    stopAutoplay(state);

    if (state.autoplayPaused || state.totalItems <= 1) {
      updateTimeline(state, 0);
      return;
    }

    const activeItem = state.data.items[state.currentIndex] || null;
    const delay = getAutoplayDelay(activeItem);

    updateTimeline(state, delay);

    state.autoplayTimer = window.setTimeout(() => {
      moveToIndex(state, state.currentIndex + 1);
    }, delay);
  }

  function moveToIndex(state, nextIndex) {
    if (state.totalItems <= 0) {
      return;
    }

    const normalizedIndex = ((nextIndex % state.totalItems) + state.totalItems) % state.totalItems;
    state.currentIndex = normalizedIndex;
    updateRail(state);
    scheduleAutoplay(state);
  }

  /* ==========================================================================
     08) CONTROLS, GESTURES, AND AUTOPLAY
     ========================================================================== */
  function bindControls(state) {
    const section = state.section;
    const viewport = section.querySelector(VIEWPORT_SELECTOR);
    const previousButton = section.querySelector(PREVIOUS_SELECTOR);
    const nextButton = section.querySelector(NEXT_SELECTOR);
    const dots = section.querySelectorAll(DOT_SELECTOR);

    if (previousButton) {
      previousButton.addEventListener('click', () => {
        moveToIndex(state, state.currentIndex - 1);
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', () => {
        moveToIndex(state, state.currentIndex + 1);
      });
    }

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const requestedIndex = Number(dot.dataset.slideIndex || '0');
        moveToIndex(state, requestedIndex);
      });
    });

    if (viewport) {
      viewport.addEventListener('pointerdown', (event) => {
        state.isPointerDown = true;
        state.dragStartX = event.clientX;
        state.dragDeltaX = 0;
        state.autoplayPaused = true;
        stopAutoplay(state);
      });

      viewport.addEventListener('pointermove', (event) => {
        if (!state.isPointerDown) {
          return;
        }

        state.dragDeltaX = event.clientX - state.dragStartX;
      });

      const completePointerGesture = () => {
        if (!state.isPointerDown) {
          return;
        }

        if (state.dragDeltaX <= -DRAG_THRESHOLD) {
          moveToIndex(state, state.currentIndex + 1);
        } else if (state.dragDeltaX >= DRAG_THRESHOLD) {
          moveToIndex(state, state.currentIndex - 1);
        }

        state.autoplayPaused = false;
        state.isPointerDown = false;
        state.dragStartX = 0;
        state.dragDeltaX = 0;
      };

      viewport.addEventListener('pointerup', completePointerGesture);
      viewport.addEventListener('pointercancel', completePointerGesture);
      viewport.addEventListener('pointerleave', completePointerGesture);
    }

    window.addEventListener('resize', () => {
      updateRail(state);
      scheduleAutoplay(state);
    }, { passive: true });

    updateRail(state);
    scheduleAutoplay(state);
  }

  function bindFrameLink(state) {
    const frame = state.section.querySelector(FRAME_SELECTOR);

    if (!frame || frame.__aboutFeaturedFunctionsFrameLinkBound) {
      return;
    }

    frame.addEventListener('click', (event) => {
      if (event.target.closest('button, a')) {
        return;
      }

      const href = frame.getAttribute('data-active-href');

      if (href) {
        window.location.href = href;
      }
    });

    frame.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      const href = frame.getAttribute('data-active-href');

      if (!href) {
        return;
      }

      event.preventDefault();
      window.location.href = href;
    });

    frame.__aboutFeaturedFunctionsFrameLinkBound = true;
  }

  /* ==========================================================================
     09) INITIAL SCENE STABILIZATION
     ========================================================================== */
  function stabilizeInitialScene(state) {
    if (!state?.section) {
      return;
    }

    updateRail(state);
    emitSlideState(state);
  }

  function markReadyAfterInitialPaint(section, state = null) {
    if (!section) {
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (state) {
          stabilizeInitialScene(state);
        }

        section.classList.add(READY_CLASS);
      });
    });
  }

  /* ==========================================================================
     10) INITIALIZATION BOOTSTRAP
     ========================================================================== */
  function getSection() {
    return document.querySelector(SECTION_SELECTOR);
  }

  function isInitialized(section) {
    return section?.getAttribute(INITIALIZED_ATTRIBUTE) === 'true';
  }

  function markInitialized(section) {
    section.setAttribute(INITIALIZED_ATTRIBUTE, 'true');
  }

  function startInitializationBootstrap() {
    const observer = new MutationObserver(() => {
      const section = getSection();

      if (!section || isInitialized(section)) {
        return;
      }

      void initAboutFeaturedFunctions();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    return observer;
  }

  /* ==========================================================================
     11) INITIALIZATION EXECUTION
     ========================================================================== */
  async function initAboutFeaturedFunctions() {
    const section = getSection();

    if (!section || isInitialized(section)) {
      return;
    }

    try {
      const data = await loadFeaturedFunctionsData();
      const baseItems = sortItems(Array.isArray(data.items) ? data.items : []);
      const sectionScene = await loadSectionScene(data.section || {});
      const hydratedData = {
        ...data,
        scene: sectionScene,
        items: baseItems
      };
      const renderedData = renderSection(section, hydratedData);
      section.__featuredFunctionsData = hydratedData;
      applyLanguageDirection(section);
      section.dispatchEvent(new CustomEvent('about-featured-functions:rendered', {
        bubbles: false,
        detail: {
          data: hydratedData
        }
      }));
      const interactionState = createInteractionState(section, renderedData);
      bindLanguageDirection(section);
      bindControls(interactionState);
      bindFrameLink(interactionState);
      markReadyAfterInitialPaint(section, interactionState);
      markInitialized(section);
    } catch (error) {
      console.error('[about-featured-functions] Failed to initialize featured functions section.', error);
    }
  }

  const initializationObserver = startInitializationBootstrap();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void initAboutFeaturedFunctions();
    }, { once: true });
  } else {
    void initAboutFeaturedFunctions();
  }

  window.addEventListener('load', () => {
    void initAboutFeaturedFunctions();
  }, { once: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void initAboutFeaturedFunctions();
    }
  });

  if (initializationObserver) {
    window.addEventListener('beforeunload', () => {
      initializationObserver.disconnect();
      const section = getSection();

      if (section) {
        section.style.removeProperty('--about-featured-functions-rail-offset');

        if (section.__featuredFunctionsLanguageDirectionHandler) {
          window.removeEventListener('neuroartan:language-applied', section.__featuredFunctionsLanguageDirectionHandler);
          section.__featuredFunctionsLanguageDirectionHandler = null;
        }
      }
    }, { once: true });
  }
})();

/* =============================================================================
   12) END OF FILE
============================================================================= */
