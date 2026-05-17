export function mountHomeContinuityMemory(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="continuity-memory"]')
    || root?.matches?.('[data-home-overview-module="continuity-memory"]') && root;

  if (!(scope instanceof Element)) return;

  const value = scope.querySelector('[data-home-continuity-value]');
  const nodes = [...scope.querySelectorAll('[data-continuity-thread]')];

  nodes.forEach((node) => {
    node.addEventListener("click", () => {
      nodes.forEach((item) => item.classList.toggle("is-active", item === node));
      if (value) value.textContent = node.textContent.trim();
    });
  });
}
