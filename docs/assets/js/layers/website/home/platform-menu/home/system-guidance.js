export function mountHomeSystemGuidance(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="system-guidance"]')
    || root?.matches?.('[data-home-overview-module="system-guidance"]') && root;

  if (!(scope instanceof Element)) return;

  const value = scope.querySelector('[data-home-guidance-value]');
  const nodes = [...scope.querySelectorAll('[data-home-guidance-action]')];

  nodes.forEach((node) => {
    node.addEventListener("click", () => {
      nodes.forEach((item) => item.classList.toggle("is-active", item === node));
      if (value) value.textContent = node.textContent.trim();
    });
  });
}
