export function mountHomeUsageInteraction(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="usage-interaction"]')
    || root?.matches?.('[data-home-overview-module="usage-interaction"]') && root;

  if (!(scope instanceof Element)) return;

  const value = scope.querySelector('[data-home-usage-value]');
  const nodes = [...scope.querySelectorAll('[data-home-usage-view]')];

  nodes.forEach((node) => {
    node.addEventListener("click", () => {
      nodes.forEach((item) => item.classList.toggle("is-active", item === node));
      if (value) value.textContent = node.textContent.trim();
    });
  });
}
