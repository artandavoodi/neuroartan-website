/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) MENU FRAGMENT INJECTION
   03) MENU INITIALIZATION
   04) MENU LINK + RAIL PREPARATION
   05) LEGACY PACK FLIP LAYER
   06) PACK VISIBILITY + ANIMATION HELPERS
   07) ACTIVE ITEM + STAGGER HELPERS
   08) LETTER HOVER PREPARATION
   09) MENU OPEN / CLOSE LIFECYCLE
   10) MENU EVENT BINDINGS
   11) OVERLAY COORDINATION
   12) HOVER PREVIEW LOGIC
   13) HOVER STABILIZER
   14) BOOT SEQUENCE
============================================================================= */

(function () {
  /* =============================================================================
     01) MODULE IDENTITY
     - Expressive menu system for the legacy/artistic menu experience.
     - Injects the shared menu fragment when inline markup is absent.
     - Preserves hover preview, pack logic, overlay coordination, and animated open/close behavior.
  ============================================================================= */

  /* =============================================================================
     02) MENU FRAGMENT INJECTION
  ============================================================================= */
  const MENU_FRAGMENT_URL = '/assets/fragments/menu.html';

  const injectMenuIfNeeded = async () => {
    const existing = document.getElementById('menu-overlay');
    if (existing) return true;

    const mount = document.getElementById('menu-mount');
    if (!mount) return false;

    // Avoid double-injection
    if (mount.dataset.menuInjected === 'true') return !!document.getElementById('menu-overlay');
    mount.dataset.menuInjected = 'true';

    try {
      const res = await fetch(MENU_FRAGMENT_URL, { cache: 'no-cache' });
      if (!res.ok) return false;
      const html = await res.text();
      mount.innerHTML = html;
      return !!document.getElementById('menu-overlay');
    } catch (_) {
      return false;
    }
  };

  /* =============================================================================
     03) MENU INITIALIZATION
  ============================================================================= */
  const initMenu = () => {
    const menuButton = document.getElementById('menu-button');
    const menuOverlay = document.getElementById('menu-overlay');
    if (!menuButton || !menuOverlay) return;

  // Safety: when the overlay is closed/hidden, it must not intercept clicks.
  // This prevents any “ghost” clicks that can trigger menu pack links (Spotify/Apple/etc.) underneath.
  menuOverlay.style.pointerEvents = 'none';
  // Hard hide overlay at boot to eliminate any ghost hitboxes
  menuOverlay.style.display = 'none';

  /* =============================================================================
     04) MENU LINK + RAIL PREPARATION
  ============================================================================= */
  const menuLinks = menuOverlay.querySelectorAll('.menu-link');
  const menuItems = menuOverlay.querySelectorAll('.menu-item');
  // Opt menu rail links out of any global "jump" hover transforms (defined elsewhere).
  // This is structural: we only tag these links, CSS decides the behavior.
  menuLinks.forEach((a) => {
    a.classList.add('menu-link-rail');
    a.setAttribute('data-no-jump', 'true');
  });
  const animatedNodes = Array.from(
    menuOverlay.querySelectorAll('.menu-col-b-section-b .menu-item, .menu-col-b-section-b .menu-sep')
  );
  const menuList = menuOverlay.querySelector('.menu-col-b-section-b .menu-list');
  const menuClose = menuOverlay.querySelector('.menu-close');
  const menuPackToggle = document.getElementById('menu-pack-toggle');
  let overlaySyncBound = false;

  /* =============================================================================
     05) LEGACY PACK FLIP LAYER
     - Legacy music/social pack logic is intentionally kept dormant until the menu ontology is fully remapped.
  ============================================================================= */
  const packMusic = document.getElementById('menu-pack-music');
  const packSocial = document.getElementById('menu-pack-social');
  const PACK_FLIP_ENABLED = false;

  // Hide optional links (kept in markup for future use)
  const hideMenuPackLinks = () => {
    const icons = Array.from(menuOverlay.querySelectorAll('.menu-pack-icon'));

    icons.forEach((el) => {
      const label = (el.getAttribute('aria-label') || '').toLowerCase().trim();
      const href = (el.getAttribute('href') || '').toLowerCase().trim();

      const isYouTubeMusic =
        label === 'youtube music' ||
        label === 'youtubemusic' ||
        href.includes('music.youtube') ||
        href.includes('youtube.com/music');

      const isGitHub =
        label === 'github' ||
        href.includes('github.com');

      if (isYouTubeMusic || isGitHub) {
        el.hidden = true;
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
      }
    });
  };

  // Run immediately and again on open (in case packs are rehydrated/reset)
  hideMenuPackLinks();
  document.addEventListener('menuOpen', hideMenuPackLinks);

  // Hard-disable the flip UI immediately (even before menu opens).
  if (!PACK_FLIP_ENABLED && menuPackToggle) {
    menuPackToggle.style.opacity = '0';
    menuPackToggle.style.visibility = 'hidden';
    menuPackToggle.style.pointerEvents = 'none';
  }

  let packMode = 'social'; // default
  let isPackAnimating = false;

  const PACK_OUT_DURATION = 520;
  const PACK_IN_DURATION = 720;
  const PACK_STAGGER = 70;

  /* =============================================================================
     06) PACK VISIBILITY + ANIMATION HELPERS
  ============================================================================= */
  const getPackIcons = (packEl) =>
    packEl ? Array.from(packEl.querySelectorAll('.menu-pack-icon')) : [];

  const setPackVisibility = (packEl, visible, opts = {}) => {
    if (!packEl) return;

    // Cancel any lingering animations
    try {
      packEl.getAnimations?.().forEach((a) => a.cancel());
    } catch (_) {}

    const icons = getPackIcons(packEl);
    icons.forEach((el) => {
      try {
        el.getAnimations?.().forEach((a) => a.cancel());
      } catch (_) {}
    });

    // Keep layout stable (no display toggles), but ensure visibility is explicit.
    // This prevents a CSS `visibility:hidden` / `opacity:0` state from keeping the incoming pack invisible.
    packEl.style.opacity = visible ? '1' : '0';
    packEl.style.visibility = visible ? 'visible' : 'hidden';
    packEl.style.pointerEvents = visible ? 'auto' : 'none';

    if (visible && !opts.preserveInline) {
      icons.forEach((el) => {
        el.style.transform = '';
        el.style.visibility = '';
        el.style.opacity = '';
      });
    }
  };

  const animateIconsOut = async (icons) => {
    const reversed = icons.slice().reverse();
    const handles = reversed.map((el, i) => {
      const a = el.animate(
        [
          { opacity: 1, transform: 'translateY(0) scale(1)' },
          { opacity: 1, transform: 'translateY(-6px) scale(1.02)', offset: 0.22 },
          { opacity: 0, transform: 'translateY(22px) scale(0.98)' }
        ],
        {
          duration: PACK_OUT_DURATION,
          delay: i * PACK_STAGGER,
          easing: 'cubic-bezier(0.22,1,0.36,1)',
          fill: 'both'
        }
      );
      return { el, a };
    });

    await Promise.all(handles.map(({ a }) => a.finished.catch(() => {})));

    // Lock the end state in inline styles BEFORE canceling,
    // so we never snap back (flicker) when WAAPI fill is removed.
    handles.forEach(({ el }) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(22px) scale(0.98)';
      el.style.visibility = '';
    });

    // Remove WAAPI fill effects so hover/next flips remain clean.
    handles.forEach(({ a }) => {
      try { a.cancel(); } catch (_) {}
    });
  };

  const animateIconsIn = async (icons) => {
    const handles = icons.map((el, i) => {
      const a = el.animate(
        [
          { opacity: 0, transform: 'translateY(-22px) scale(0.98)' },
          { opacity: 1, transform: 'translateY(8px) scale(1.03)', offset: 0.58 },
          { opacity: 1, transform: 'translateY(0) scale(1)' }
        ],
        {
          duration: PACK_IN_DURATION,
          delay: i * PACK_STAGGER,
          easing: 'cubic-bezier(0.22,1,0.36,1)',
          fill: 'both'
        }
      );
      return { el, a };
    });

    await Promise.all(handles.map(({ a }) => a.finished.catch(() => {})));

    // Lock the end state BEFORE canceling to avoid snap/flicker.
    handles.forEach(({ el }) => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0) scale(1)';
      el.style.visibility = '';
    });

    // Remove WAAPI fill effects so hover/next flips start clean.
    handles.forEach(({ a }) => {
      try { a.cancel(); } catch (_) {}
    });

    // Release inline transforms so CSS owns hover again,
    // but keep opacity clean (CSS + pack visibility will drive it).
    icons.forEach((el) => {
      el.style.transform = '';
      el.style.visibility = '';
      el.style.opacity = '';
    });
  };

  const applyPackModeInstant = (mode) => {
    if (!PACK_FLIP_ENABLED) return;
    packMode = mode === 'social' ? 'social' : 'music';

    // Hard reset any in-flight inline animation state
    [packMusic, packSocial].forEach((p) => {
      if (!p) return;
      p.style.transform = '';
      p.style.transition = '';
      const icons = getPackIcons(p);
      icons.forEach((el) => {
        el.style.transform = '';
        el.style.opacity = '';
      });
    });

    setPackVisibility(packMusic, packMode === 'music');
    setPackVisibility(packSocial, packMode === 'social');
  };

  const flipPackModeAnimated = async () => {
    if (!PACK_FLIP_ENABLED) return;
    if (isPackAnimating) return;
    if (!packMusic || !packSocial) return;
    isPackAnimating = true;

    const fromPack = packMode === 'music' ? packMusic : packSocial;
    const toPack = packMode === 'music' ? packSocial : packMusic;

    const fromIcons = getPackIcons(fromPack);
    const toIcons = getPackIcons(toPack);

    // Prepare the incoming pack (visible but non-interactive until fully in)
    // Preserve inline priming state for the in-animation.
    setPackVisibility(toPack, true, { preserveInline: true });
    // Ensure it cannot stay invisible due to CSS.
    toPack.style.visibility = 'visible';
    toPack.style.pointerEvents = 'none';

    // Ensure the outgoing pack is interactive until it fully exits
    fromPack.style.pointerEvents = '';

    // Prime incoming icons for the in-animation
    toIcons.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-22px) scale(0.98)';
      el.style.visibility = '';
    });

    await animateIconsOut(fromIcons);

    // Hide outgoing pack without removing it from layout.
    setPackVisibility(fromPack, false);
    fromPack.style.pointerEvents = 'none';

    // Swap mode before in-animation
    packMode = packMode === 'music' ? 'social' : 'music';

    await animateIconsIn(toIcons);

    // Enforce final state after in-animation.
    setPackVisibility(toPack, true);
    setPackVisibility(fromPack, false);

    // Interaction: only the visible pack can receive pointer events.
    toPack.style.pointerEvents = 'auto';
    toPack.style.visibility = 'visible';
    fromPack.style.pointerEvents = 'none';
    fromPack.style.visibility = 'hidden';

    // Cleanup any priming state so CSS hover stays pure.
    toIcons.forEach((el) => {
      el.style.opacity = '';
      el.style.transform = '';
      el.style.visibility = '';
    });

    isPackAnimating = false;
  };

  const resetPacksOnOpen = () => {
    // Social-only: keep music pack hidden/disabled
    if (packMusic) setPackVisibility(packMusic, false);
    if (packSocial) setPackVisibility(packSocial, true);

    // Disable the toggle UI interaction (keep markup for future use).
    if (menuPackToggle) {
      menuPackToggle.style.opacity = '0';
      menuPackToggle.style.visibility = 'hidden';
      menuPackToggle.style.pointerEvents = 'none';
    }

    packMode = 'social';
    isPackAnimating = false;
    document.body.classList.add('menu-packs-unified');
  };

  /* =============================================================================
     07) ACTIVE ITEM + STAGGER HELPERS
  ============================================================================= */
  function setActiveItem(next) {
    menuItems.forEach((it) => it.classList.toggle('is-active', it === next));
  }

  function staggerIn() {
    animatedNodes.forEach((el, i) => {
      el.style.transitionDelay = `${i * STAGGER_IN_STEP}ms`;
      el.classList.add('menu-animate-in');
      el.classList.remove('menu-animate-out');
    });
  }

  function staggerOut() {
    animatedNodes.slice().reverse().forEach((el, i) => {
      el.style.transitionDelay = `${i * STAGGER_OUT_STEP}ms`;
      el.classList.add('menu-animate-out');
      el.classList.remove('menu-animate-in');
    });
  }

  /* =============================================================================
     08) LETTER HOVER PREPARATION
  ============================================================================= */
  function letterify(el) {
    if (el.dataset.letterified === 'true') return;

    const inner = el.querySelector('.menu-link-inner');
    if (!inner) return;

    const text = inner.textContent;
    inner.textContent = '';

    [...text].forEach(ch => {
      const span = document.createElement('span');
      span.textContent = ch;
      span.style.display = 'inline-block';
      span.style.transition = 'transform 220ms ease, opacity 220ms ease';
      inner.appendChild(span);
    });

    el.dataset.letterified = 'true';
  }

  function hoverIn(el) {
    /* handled purely by CSS scale */
  }

  function hoverOut(el) {
    /* handled purely by CSS scale */
  }

  const previewTitle = document.getElementById('menu-preview-title');
  const previewSub = document.getElementById('menu-preview-sub');
  const previewIcon = document.getElementById('menu-preview-icon');

  let isOpen = false;
  let isAnimating = false;
  const CLOSE_DURATION = 420;
  const STAGGER_IN_START_DELAY = 220;
  const STAGGER_IN_STEP = 95;
  const STAGGER_OUT_STEP = 70;

  /* =============================================================================
     09) MENU OPEN / CLOSE LIFECYCLE
  ============================================================================= */
  function openMenu() {
    if (isAnimating) return;
    isAnimating = true;

    menuButton.classList.add('menu-open');
    menuOverlay.classList.add('active');
    menuOverlay.style.display = 'block';
    menuOverlay.setAttribute('aria-hidden', 'false');
    menuOverlay.style.pointerEvents = 'auto';
    animatedNodes.forEach(el => { el.style.transitionDelay = ''; });
    setTimeout(staggerIn, STAGGER_IN_START_DELAY);
    document.body.classList.add('menu-active');
    resetPacksOnOpen();
    const firstItem = menuItems[0];
    if (firstItem && firstItem.__onEnter) {
      firstItem.__onEnter();
      setActiveItem(firstItem);
    }

    isOpen = true;
    document.dispatchEvent(new CustomEvent('menuOpen'));

    requestAnimationFrame(() => {
      isAnimating = false;
    });
  }

  function closeMenu() {
    if (isAnimating) return;
    isAnimating = true;

    isOpen = false;
    menuOverlay.classList.add('closing');
    menuOverlay.setAttribute('aria-hidden', 'true');
    menuOverlay.style.pointerEvents = 'none';
    staggerOut();
    document.body.classList.remove('menu-active');

    document.dispatchEvent(new CustomEvent('menuClose'));

    setTimeout(() => {
      menuOverlay.classList.remove('active', 'closing');
      menuOverlay.style.display = 'none';
      menuOverlay.style.pointerEvents = 'none';
      menuOverlay.setAttribute('aria-hidden', 'true');
      menuButton.classList.remove('menu-open');
      animatedNodes.forEach(el => {
        el.style.transitionDelay = '';
        el.classList.remove('menu-animate-in', 'menu-animate-out');
      });
      isAnimating = false;
    }, CLOSE_DURATION);
  }

  /* =============================================================================
     10) MENU EVENT BINDINGS
  ============================================================================= */
  menuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen ? closeMenu() : openMenu();
  });

  if (menuClose) {
    menuClose.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isOpen) closeMenu();
    });
  }

  // Prevent the pack toggle button from triggering overlay close
  if (menuPackToggle) {
    menuPackToggle.addEventListener('click', (e) => {
      if (!PACK_FLIP_ENABLED) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    });

    menuPackToggle.addEventListener('pointerenter', (e) => {
      if (!PACK_FLIP_ENABLED) return;
      if (!isOpen) return;
      e.stopPropagation();
      flipPackModeAnimated();
    });
  }

  // Backdrop click closes (only when clicking outside the columns)
  menuOverlay.addEventListener('click', (e) => {
    if (!isOpen) return;
    if (e.target.closest('#menu-pack-toggle')) return;
    if (e.target.closest('.menu-columns')) return;
    closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeMenu();
  });

  /* =============================================================================
     11) OVERLAY COORDINATION
     - When premium overlays open, the expressive menu overlay must close cleanly
       so panel systems never compete for focus, pointer, or scroll state.
  ============================================================================= */
  if (!overlaySyncBound) {
    overlaySyncBound = true;

    document.addEventListener('account-drawer:open-request', () => {
      if (!isOpen) return;
      closeMenu();
    });

    document.addEventListener('account-drawer:opened', () => {
      if (!isOpen) return;
      closeMenu();
    });

    document.addEventListener('cookie-consent:open-request', () => {
      if (!isOpen) return;
      closeMenu();
    });

    document.addEventListener('cookie-consent:opened', () => {
      if (!isOpen) return;
      closeMenu();
    });
  }

  /* =============================================================================
     12) HOVER PREVIEW LOGIC
  ============================================================================= */

  if ((previewTitle || previewSub) && menuItems.length) {
    menuItems.forEach((item) => {
      const link = item.querySelector('.menu-link');
      if (!link) return;

      letterify(link);

      const titleKey =
        link.dataset.previewTitleI18n ||
        link.getAttribute('data-preview-title-i18n');

      const subKey =
        link.dataset.previewSubI18n ||
        link.getAttribute('data-preview-sub-i18n');

      const rawTitle =
        link.dataset.previewTitle ||
        link.getAttribute('data-preview-title') ||
        link.dataset.text ||
        link.textContent.trim();

      const rawSub =
        link.dataset.previewSub ||
        link.getAttribute('data-preview-sub') ||
        '';

      const onEnter = () => {
        const t = window.NEUROARTAN_TRANSLATION || window.ARTAN_TRANSLATION;

        const title = titleKey && t && typeof t.t === 'function'
          ? (t.t(titleKey) || rawTitle)
          : rawTitle;

        const sub = subKey && t && typeof t.t === 'function'
          ? (t.t(subKey) || rawSub)
          : rawSub;

        if (previewIcon) {
          const iconSrc =
            link.dataset.previewIcon ||
            link.getAttribute('data-preview-icon') ||
            item.dataset.previewIcon ||
            item.getAttribute('data-preview-icon') ||
            '';

          // Support BOTH markup styles:
          // 1) #menu-preview-icon is a container (div/span) -> we inject an <img>
          // 2) #menu-preview-icon is itself an <img> -> we set its src
          const isImgEl = previewIcon.tagName && previewIcon.tagName.toLowerCase() === 'img';

          if (isImgEl) {
            if (iconSrc) {
              previewIcon.src = iconSrc;
              previewIcon.removeAttribute('aria-hidden');
            } else {
              previewIcon.removeAttribute('src');
              previewIcon.setAttribute('aria-hidden', 'true');
            }
            // Ensure native SVG colors (no inherited filters)
            previewIcon.style.filter = 'none';
            previewIcon.style.opacity = '1';
            previewIcon.style.transform = 'none';
          } else {
            previewIcon.innerHTML = iconSrc
              ? `<img class="menu-preview-icon-img" src="${iconSrc}" alt="" />`
              : '';

            const img = previewIcon.querySelector('img.menu-preview-icon-img');
            if (img) {
              img.style.filter = 'none';
              img.style.opacity = '1';
              img.style.transform = 'none';
            }
          }
        }
        if (previewSub) previewSub.textContent = sub;
        menuOverlay.classList.add('has-preview');
        menuOverlay.style.setProperty(
          '--menu-accent',
          link.dataset.accent || 'rgba(255,255,255,0.06)'
        );
      };

      const onLeave = () => {
        menuOverlay.classList.remove('has-preview');
      };


      item.__onEnter = onEnter;
      item.__onLeave = onLeave;
      // Fallback: some pages may not match the rail selector used by the stabilizer.
      // Bind direct hover so previews work everywhere the menu markup exists.
      if (!menuList) {
        item.addEventListener('pointerenter', () => {
          if (!isOpen) return;
          setActiveItem(item);
          if (item.__onEnter) item.__onEnter();
        });
      }
    });
  }

  /* =============================================================================
     13) HOVER STABILIZER
  ============================================================================= */
  if (menuList && menuItems.length) {
    let active = null;
    let raf = 0;

    const pickNearest = (x) => {
      let best = null;
      let bestD = Infinity;
      menuItems.forEach((it) => {
        const r = it.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const d = Math.abs(cx - x);
        if (d < bestD) {
          bestD = d;
          best = it;
        }
      });
      return best;
    };

    const activate = (it) => {
      if (!it || it === active) return;

      if (active && active.__onLeave) active.__onLeave();
      active = it;
      setActiveItem(active);
      if (active.__onEnter) active.__onEnter();
    };

    const onMove = (e) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const item = el ? el.closest('.menu-item') : null;
        activate(item || pickNearest(e.clientX));
      });
    };

    const onLeaveRail = () => {
      if (active && active.__onLeave) active.__onLeave();
      active = null;
      setActiveItem(null);
    };

    menuList.addEventListener('pointermove', onMove);
    menuList.addEventListener('pointerleave', onLeaveRail);
  }
  };

  /* =============================================================================
     14) BOOT SEQUENCE
     - Injects the menu fragment if needed, then initializes the expressive menu runtime.
  ============================================================================= */
  const boot = async () => {
    await injectMenuIfNeeded();
    initMenu();
  };

  // Run after DOM is ready to ensure #menu-mount exists on all pages.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();