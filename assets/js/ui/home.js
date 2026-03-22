/* =============================================================================
   01) HOME ESSENCE — SECTION-BY-SECTION DIALOGUE FLOW
   - Treats each dialogue as its own readable viewport step.
   - Handoffs from hero → first dialogue sooner.
   - Keeps the next animation section hidden until the final dialogue is complete.
   - Avoids theme-shift body toggles and decorative jump behavior.
============================================================================= */
(() => {
  window.__artanRunAfterEnter(() => {
    const section = document.querySelector('.home-essence');
    const wrap = document.querySelector('.home-ink-reveal');
    const lines = document.querySelectorAll('.home-ink-reveal .ink-line');
    if (!section || !wrap || lines.length < 3) return;

    const nextSection = section.nextElementSibling;

    let active = false;
    let rafTick = 0;
    let currentProgress = 0;
    let targetProgress = 0;

    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + ((b - a) * t);
    const smoothstep = (edge0, edge1, x) => {
      const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
      return t * t * (3 - (2 * t));
    };

    const getHomeHeader = () =>
      document.querySelector('#site-header') ||
      document.querySelector('header') ||
      document.querySelector('.site-header');

    const ensureHeaderFx = (el) => {
      if (!el || el.dataset.essenceHeaderFx === '1') return;
      el.dataset.essenceHeaderFx = '1';
      el.style.willChange = 'opacity';
      el.style.setProperty(
        'transition',
        'opacity 650ms cubic-bezier(0.22, 1, 0.36, 1)',
        'important'
      );
    };

    const logoShow = () => {
      const header = getHomeHeader();
      if (!header) return;
      ensureHeaderFx(header);
      header.style.setProperty('opacity', '1', 'important');
      header.style.setProperty('pointer-events', '', 'important');
    };

    const logoHide = () => {
      const header = getHomeHeader();
      if (!header) return;
      ensureHeaderFx(header);
      header.style.setProperty('opacity', '0', 'important');
      header.style.setProperty('pointer-events', 'none', 'important');
    };

    const logoAuto = (progress) => {
      const header = getHomeHeader();
      if (!header || !active) return;
      ensureHeaderFx(header);
      const t = smoothstep(0.78, 0.96, progress);
      header.style.setProperty('opacity', String(1 - t), 'important');
      header.style.setProperty('pointer-events', t >= 0.98 ? 'none' : '', 'important');
    };

    const ensureSpacer = () => {
      let spacer = document.querySelector('#essence-scroll-spacer');
      if (!spacer) {
        spacer = document.createElement('div');
        spacer.id = 'essence-scroll-spacer';
        spacer.setAttribute('aria-hidden', 'true');
        section.insertAdjacentElement('afterend', spacer);
      }
      return spacer;
    };

    const spacer = ensureSpacer();

    const restore = {
      wrapStyle: wrap.getAttribute('style') || '',
      nextStyle: nextSection ? (nextSection.getAttribute('style') || '') : ''
    };

    const isRTL = () => {
      const html = document.documentElement;
      return (
        html.classList.contains('lang-rtl') ||
        html.getAttribute('dir') === 'rtl' ||
        document.body.classList.contains('lang-rtl')
      );
    };

    const setSheen = (el, t) => {
      const tt = clamp(t, 0, 1);
      el.style.setProperty('--sheen', isRTL() ? tt : (1 - tt));
    };

    const setRunwayHeight = () => {
      const h = Math.round(window.innerHeight * 3.7);
      spacer.style.height = `${h}px`;
      spacer.style.width = '1px';
    };

    const setPinned = (on) => {
      if (on) {
        wrap.style.position = 'fixed';
        wrap.style.left = '50%';
        wrap.style.right = 'auto';
        wrap.style.top = '50%';
        wrap.style.transform = 'translate(-50%, -50%)';
        wrap.style.width = 'min(74ch, calc(100vw - (2 * var(--site-gutter))))';
        wrap.style.maxWidth = 'none';
        wrap.style.margin = '0';
        wrap.style.padding = '0';
        wrap.style.display = 'flex';
        wrap.style.alignItems = 'center';
        wrap.style.justifyContent = 'center';
        wrap.style.textAlign = 'center';
        wrap.style.zIndex = '3';
        wrap.style.visibility = 'visible';
        wrap.style.opacity = '1';
        active = true;
      } else {
        if (restore.wrapStyle) wrap.setAttribute('style', restore.wrapStyle);
        else wrap.removeAttribute('style');
        active = false;
      }
    };

    const setNextSectionVisibility = (visible) => {
      if (!nextSection) return;
      nextSection.style.transition = 'opacity 700ms cubic-bezier(0.22, 1, 0.36, 1), transform 900ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear';
      if (visible) {
        nextSection.style.opacity = '1';
        nextSection.style.visibility = 'visible';
        nextSection.style.pointerEvents = 'auto';
        nextSection.style.transform = 'translateY(0)';
        return;
      }
      nextSection.style.opacity = '0';
      nextSection.style.visibility = 'hidden';
      nextSection.style.pointerEvents = 'none';
      nextSection.style.transform = 'translateY(32px)';
    };

    const getRanges = () => {
      const rect = section.getBoundingClientRect();
      const pageY = window.scrollY || window.pageYOffset || 0;
      const top = rect.top + pageY;
      const start = top - Math.round(window.innerHeight * 0.6);
      const length = spacer.getBoundingClientRect().height || Math.round(window.innerHeight * 3.7);
      const end = start + length;
      return { start, end, length, top };
    };

    const resetIfAbove = (y, start) => {
      if (y < start) {
        currentProgress = 0;
        targetProgress = 0;
        setPinned(false);
        setNextSectionVisibility(true);
        for (const el of lines) {
          el.style.setProperty('--ink', 0);
          el.style.setProperty('--sheen', 0);
          el.style.opacity = '0';
          el.style.transform = 'translateY(0)';
        }
        logoShow();
        return true;
      }
      return false;
    };

    const lineReveal = (progress, inStart, inEnd, outStart, outEnd) => {
      const reveal = smoothstep(inStart, inEnd, progress);
      const emphasis = 1 - smoothstep(outStart, outEnd, progress);
      const active = clamp(Math.min(reveal, emphasis), 0, 1);
      return {
        reveal,
        visibility: active > 0 ? (0.5 + (active * 0.5)) : 0
      };
    };

    const applyLineState = (el, state) => {
      const reveal = clamp(state.reveal, 0, 1);
      const visibility = clamp(state.visibility, 0, 1);
      el.style.setProperty('--ink', visibility);
      setSheen(el, reveal);
      el.style.opacity = visibility > 0 ? String(visibility) : '0';
      el.style.transform = 'translateY(0)';
    };

    const applyState = (progress) => {
      logoAuto(progress);

      const l1 = lineReveal(progress, 0.00, 0.18, 0.30, 0.40);
      const l2 = lineReveal(progress, 0.42, 0.58, 0.70, 0.80);
      const l3 = lineReveal(progress, 0.84, 0.94, 0.988, 1.00);

      applyLineState(lines[0], l1);
      applyLineState(lines[1], l2);
      applyLineState(lines[2], l3);
    };

    const tick = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      const { start, end, length, top } = getRanges();
      const releaseHold = Math.round(window.innerHeight * 0.32);
      const releasePoint = end + releaseHold;

      if (resetIfAbove(y, start)) {
        rafTick = 0;
        return;
      }

      if (y >= end && y < releasePoint) {
        currentProgress = 1;
        targetProgress = 1;
        if (!active) setPinned(true);
        setNextSectionVisibility(false);

        lines[0].style.setProperty('--ink', 0);
        setSheen(lines[0], 0);
        lines[0].style.opacity = '0';
        lines[0].style.transform = 'translateY(0)';

        lines[1].style.setProperty('--ink', 0);
        setSheen(lines[1], 0);
        lines[1].style.opacity = '0';
        lines[1].style.transform = 'translateY(0)';

        lines[2].style.setProperty('--ink', 1);
        setSheen(lines[2], 0.5);
        lines[2].style.opacity = '1';
        lines[2].style.transform = 'translateY(0)';

        logoHide();
        rafTick = 0;
        return;
      }

      if (y >= releasePoint) {
        currentProgress = 1;
        targetProgress = 1;
        if (active) setPinned(false);
        setNextSectionVisibility(true);

        for (const el of lines) {
          el.style.setProperty('--ink', 1);
          setSheen(el, 0);
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }

        logoHide();
        rafTick = 0;
        return;
      }

      if (!active) setPinned(true);
      setNextSectionVisibility(false);

      targetProgress = clamp((y - start) / length, 0, 1);
      currentProgress = lerp(currentProgress, targetProgress, 0.08);

      if (Math.abs(targetProgress - currentProgress) < 0.001) {
        currentProgress = targetProgress;
      }

      applyState(currentProgress);

      if (Math.abs(targetProgress - currentProgress) > 0.001) {
        rafTick = requestAnimationFrame(tick);
      } else {
        rafTick = 0;
      }
    };

    const requestTick = () => {
      if (rafTick) return;
      rafTick = requestAnimationFrame(tick);
    };

    const boot = () => {
      setRunwayHeight();
      requestTick();
      window.addEventListener('scroll', requestTick, { passive: true });
      window.addEventListener(
        'resize',
        () => {
          setRunwayHeight();
          requestTick();
        },
        { passive: true }
      );
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  });
})();