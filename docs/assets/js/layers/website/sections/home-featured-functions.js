/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) DATA SOURCE
   03) SECTION SELECTORS
   04) RENDER HELPERS
   05) CARD TEMPLATE
   06) SECTION RENDERER
   07) SLIDE STATE HELPERS
   08) CONTROLS, GESTURES, AND AUTOPLAY
   09) INITIALIZATION BOOTSTRAP
   10) INITIALIZATION EXECUTION
   11) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
(function () {
  'use strict';

  /* ==========================================================================
     02) DATA SOURCE
     ========================================================================== */
  const FEATURED_FUNCTIONS_DATA_PATH = '/collections/featured/icos-featured-functions/icos-featured-functions.json';
  const FEATURED_FUNCTIONS_SCENES_BASE_PATH = '/collections/featured/icos-featured-functions/scenes';

  /* ==========================================================================
     03) SECTION SELECTORS
     ========================================================================== */
  const SECTION_SELECTOR = '[data-home-featured-functions]';
  const TITLE_SELECTOR = '[data-home-featured-functions-title]';
  const DESCRIPTION_SELECTOR = '[data-home-featured-functions-description]';
  const VIEWPORT_SELECTOR = '[data-home-featured-functions-viewport]';
  const TRACK_SELECTOR = '[data-home-featured-functions-track]';
  const TIMELINE_SELECTOR = '[data-home-featured-functions-timeline]';
  const TIMELINE_PROGRESS_SELECTOR = '[data-home-featured-functions-timeline-progress]';
  const DOTS_SELECTOR = '[data-home-featured-functions-dots]';
  const DOT_SELECTOR = '[data-home-featured-functions-dot]';
  const PREVIOUS_SELECTOR = '[data-home-featured-functions-previous]';
  const NEXT_SELECTOR = '[data-home-featured-functions-next]';
  const CONTROLS_SELECTOR = '.home-featured-functions-controls';
  const DOTS_WRAPPER_SELECTOR = '.home-featured-functions-dots';
  const CARD_SELECTOR = '[data-home-featured-functions-card]';
  const READY_CLASS = 'home-featured-functions-ready';
  const INITIALIZED_ATTRIBUTE = 'data-home-featured-functions-initialized';
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
    return suffix ? `home_featured_functions_${base}_${suffix}` : `home_featured_functions_${base}`;
  }

  async function loadFeaturedFunctionsData() {
    const response = await fetch(FEATURED_FUNCTIONS_DATA_PATH, {
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
      : `${FEATURED_FUNCTIONS_SCENES_BASE_PATH}/${encodeURIComponent(raw)}.scene.json`;

    const response = await fetch(scenePath, {
      credentials: 'same-origin',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to load featured function scene: ${scenePath} (${response.status})`);
    }

    return response.json();
  }

  async function loadFeaturedFunctionScenes(items) {
    const entries = await Promise.all(
      items.map(async (item) => {
        const id = String(item?.id || '').trim();
        const sceneRef = String(item?.scene || id).trim();

        if (!id || !sceneRef) {
          return [id, null];
        }

        try {
          const scene = await loadSceneConfig(sceneRef);
          return [id, scene];
        } catch (error) {
          console.warn(`[home-featured-functions] Failed to load scene config for ${id}.`, error);
          return [id, null];
        }
      })
    );

    return new Map(entries.filter(([id]) => Boolean(id)));
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

  /* ==========================================================================
     05) CARD TEMPLATE
     ========================================================================== */
  function createCardMarkup(item) {
    const label = escapeHtml(item.label || '');
    const title = escapeHtml(item.title || '');
    const description = escapeHtml(item.description || '');
    const href = escapeHtml(item.href || '/404.html');
    const image = escapeHtml(item.image || '');
    const isVideo = /\.webm$/i.test(image);
    const icon = escapeHtml(item.icon || '');
    const theme = escapeHtml(item.theme || 'dark');
    const id = escapeHtml(item.id || 'feature-card');
    const sceneId = escapeHtml(item.scene?.id || item.id || '');
    const sceneType = escapeHtml(item.scene?.scene_type || '');
    const hasScene = Boolean(sceneId);
    const i18nBase = createI18nKey(item.id || item.title || 'item');
    const labelI18nKey = `${i18nBase}_label`;
    const titleI18nKey = `${i18nBase}_title`;
    const descriptionI18nKey = `${i18nBase}_description`;
    const linkAriaI18nKey = `${i18nBase}_link_aria_label`;

    return `
      <article class="home-featured-functions-card" data-home-featured-functions-card data-feature-id="${id}" data-theme="${theme}">
        <a class="home-featured-functions-card-visual-link" href="${href}" aria-label="${title}" data-i18n-aria-label-key="${linkAriaI18nKey}">
          <div class="home-featured-functions-card-visual" aria-hidden="true">
            <div class="home-featured-functions-card-scene" data-home-featured-functions-scene data-scene-id="${sceneId}" data-scene-type="${sceneType}"></div>
            ${image
              ? isVideo
                ? `<video src="${image}" autoplay muted loop playsinline preload="metadata" aria-hidden="true"></video>`
                : `<img src="${image}" alt="" loading="lazy">`
              : hasScene
                ? ''
                : '<span class="home-featured-functions-card-placeholder"></span>'}
          </div>
        </a>
        <div class="home-featured-functions-card-copy">
          <div class="home-featured-functions-card-summary">
            ${icon ? `<span class="home-featured-functions-card-icon" aria-hidden="true"><img src="${icon}" alt="" loading="lazy"></span>` : ''}
            <p class="home-featured-functions-card-label" data-i18n-key="${labelI18nKey}">${label}</p>
          </div>
          <a class="home-featured-functions-card-text-link" href="${href}" aria-label="${title}">
            <h3 class="home-featured-functions-card-title" data-i18n-key="${titleI18nKey}">${title}</h3>
            <p class="home-featured-functions-card-description" data-i18n-key="${descriptionI18nKey}">${description}</p>
          </a>
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

    const sectionData = data.section || {};
    const items = sortItems(Array.isArray(data.items) ? data.items : []);

    if (title) {
      title.textContent = sectionData.title || '';
      title.setAttribute('data-i18n-key', 'home_featured_functions_section_title');
    }

    if (description) {
      description.textContent = sectionData.description || '';
      description.setAttribute('data-i18n-key', 'home_featured_functions_section_description');
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
            class="home-featured-functions-dot"
            data-home-featured-functions-dot
            data-slide-index="${index}"
            aria-label="${dotLabel}"
            data-i18n-aria-label-key="${dotI18nKey}"></button>
        `;
        })
        .join('');
    }

    section.classList.add(READY_CLASS);

    return {
      section: sectionData,
      items
    };
  }

  function resolveInterfaceDirection() {
    const rootDir = document.documentElement.getAttribute('dir');
    const bodyDir = document.body?.getAttribute('dir');
    const computedDir = window.getComputedStyle(document.documentElement).direction;
    const normalized = String(rootDir || bodyDir || computedDir || 'ltr').toLowerCase();
    return normalized === 'rtl' ? 'rtl' : 'ltr';
  }

  function enforcePhysicalLTR(section) {
    if (!section) {
      return;
    }

    const viewport = section.querySelector(VIEWPORT_SELECTOR);
    const track = section.querySelector(TRACK_SELECTOR);
    const controls = section.querySelector(CONTROLS_SELECTOR);
    const dots = section.querySelector(DOTS_WRAPPER_SELECTOR);
    const previousButton = section.querySelector(PREVIOUS_SELECTOR);
    const nextButton = section.querySelector(NEXT_SELECTOR);
    const uiDirection = resolveInterfaceDirection();

    section.setAttribute('dir', 'ltr');
    section.style.direction = 'ltr';
    section.setAttribute('data-home-featured-functions-ui-direction', uiDirection);

    [viewport, track].forEach((node) => {
      if (!node) {
        return;
      }

      node.setAttribute('dir', 'ltr');
      node.style.direction = 'ltr';
    });

    [controls, dots, previousButton, nextButton].forEach((node) => {
      if (!node) {
        return;
      }

      node.setAttribute('dir', uiDirection);
      node.style.direction = uiDirection;
    });
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

  function updateRail(state) {
    const track = state.section.querySelector(TRACK_SELECTOR);

    if (!track) {
      return;
    }

    state.cardsPerView = getCardsPerView();
    state.currentIndex = clamp(state.currentIndex, 0, getMaxIndex(state.totalItems, state.cardsPerView));

    const { step } = getTrackMetrics(track);
    const offset = step > 0 ? state.currentIndex * step * -1 : 0;

    state.section.style.setProperty('--home-featured-functions-rail-offset', `${offset}px`);
    updateDots(state);
    updateControls(state);
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
    state.section.style.setProperty('--home-featured-functions-timeline-progress-scale', '0');

    if (duration <= 0 || state.totalItems <= 1) {
      return;
    }

    window.requestAnimationFrame(() => {
      progress.style.transition = `transform ${duration}ms linear`;
      state.section.style.setProperty('--home-featured-functions-timeline-progress-scale', '1');
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

  function watchDirectionChanges(section) {
    if (!section || section.__featuredFunctionsDirectionObserver) {
      return;
    }

    const observer = new MutationObserver(() => {
      enforcePhysicalLTR(section);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir', 'lang']
    });

    section.__featuredFunctionsDirectionObserver = observer;
  }

  /* ==========================================================================
     09) INITIALIZATION BOOTSTRAP
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

      void initHomeFeaturedFunctions();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    return observer;
  }

  /* ==========================================================================
     10) INITIALIZATION EXECUTION
     ========================================================================== */
  async function initHomeFeaturedFunctions() {
    const section = getSection();

    if (!section || isInitialized(section)) {
      return;
    }

    try {
      const data = await loadFeaturedFunctionsData();
      const baseItems = sortItems(Array.isArray(data.items) ? data.items : []);
      const scenesById = await loadFeaturedFunctionScenes(baseItems);
      const hydratedData = {
        ...data,
        items: baseItems.map((item) => ({
          ...item,
          scene: scenesById.get(String(item?.id || '').trim()) || null
        }))
      };
      const renderedData = renderSection(section, hydratedData);
      section.__featuredFunctionsData = hydratedData;
      section.dispatchEvent(new CustomEvent('home-featured-functions:rendered', {
        bubbles: false,
        detail: {
          data: hydratedData
        }
      }));
      const interactionState = createInteractionState(section, renderedData);
      enforcePhysicalLTR(section);
      watchDirectionChanges(section);
      bindControls(interactionState);
      markInitialized(section);
    } catch (error) {
      console.error('[home-featured-functions] Failed to initialize featured functions section.', error);
    }
  }

  const initializationObserver = startInitializationBootstrap();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void initHomeFeaturedFunctions();
    }, { once: true });
  } else {
    void initHomeFeaturedFunctions();
  }

  window.addEventListener('load', () => {
    void initHomeFeaturedFunctions();
  }, { once: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void initHomeFeaturedFunctions();
    }
  });

  if (initializationObserver) {
    window.addEventListener('beforeunload', () => {
      initializationObserver.disconnect();
      const section = getSection();

      if (section) {
        section.style.removeProperty('--home-featured-functions-rail-offset');
        if (section.__featuredFunctionsDirectionObserver) {
          section.__featuredFunctionsDirectionObserver.disconnect();
          section.__featuredFunctionsDirectionObserver = null;
        }
      }
    }, { once: true });
  }
})();

/* =============================================================================
   11) END OF FILE
============================================================================= */