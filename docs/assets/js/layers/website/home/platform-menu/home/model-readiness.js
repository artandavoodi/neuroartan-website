export function mountHomeModelReadiness(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="model-readiness"]')
    || root?.matches?.('[data-home-overview-module="model-readiness"]') && root;

  if (!(scope instanceof Element)) return;

  const value = scope.querySelector('[data-home-readiness-value]');
  const nodes = [...scope.querySelectorAll('[data-readiness-node]')];

  nodes.forEach((node) => {
    node.addEventListener("click", () => {
      nodes.forEach((item) => item.classList.toggle("is-active", item === node));
      if (value) value.textContent = node.textContent.trim();
    });
  });
}
