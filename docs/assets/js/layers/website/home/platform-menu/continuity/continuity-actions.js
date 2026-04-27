export function mountHomePlatformDestination(root, context = {}) {
  if (!(root instanceof Element)) {
    return;
  }

  root.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-home-platform-continuity-action]');
    if (!trigger || !root.contains(trigger)) {
      return;
    }

    const action = String(trigger.getAttribute('data-home-platform-continuity-action') || '').trim().toLowerCase();

    if (action === 'voice') {
      context.closeShell?.();
      context.requestMicrophoneInteraction?.();
      return;
    }

    if (action === 'history') {
      window.location.href = '/pages/continuity-history/index.html';
      return;
    }

    if (action === 'knowledge') {
      window.location.href = '/pages/knowledge-research/index.html';
    }
  });
}
