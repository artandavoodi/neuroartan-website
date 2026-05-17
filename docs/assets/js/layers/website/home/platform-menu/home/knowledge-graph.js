export function mountHomeKnowledgeGraph(root) {
  const scope = root?.querySelector?.('[data-home-overview-module="knowledge-graph"]')
    || root?.matches?.('[data-home-overview-module="knowledge-graph"]') && root;

  if (!(scope instanceof Element)) return;

  const value = scope.querySelector('[data-home-graph-value]');
  const nodes = [...scope.querySelectorAll('[data-home-graph-node]')];

  nodes.forEach((node) => {
    node.addEventListener("click", () => {
      nodes.forEach((item) => item.classList.toggle("is-active", item === node));
      if (value) value.textContent = node.textContent.trim();
    });
  });
}
