import { mountHomeSystemOverview } from "./system-overview.js";
import { mountHomeModelReadiness } from "./model-readiness.js";
import { mountHomeContinuityMemory } from "./continuity-memory.js";
import { mountHomeKnowledgeGraph } from "./knowledge-graph.js";
import { mountHomeUsageInteraction } from "./usage-interaction.js";
import { mountHomeSystemGuidance } from "./system-guidance.js";

const HOME_OVERVIEW_MODULES = [
  {
    id: "system-overview",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/system-overview.html",
    mount: mountHomeSystemOverview,
  },
  {
    id: "model-readiness",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/model-readiness.html",
    mount: mountHomeModelReadiness,
  },
  {
    id: "continuity-memory",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/continuity-memory.html",
    mount: mountHomeContinuityMemory,
  },
  {
    id: "knowledge-graph",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/knowledge-graph.html",
    mount: mountHomeKnowledgeGraph,
  },
  {
    id: "usage-interaction",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/usage-interaction.html",
    mount: mountHomeUsageInteraction,
  },
  {
    id: "system-guidance",
    fragment: "/assets/fragments/layers/website/home/platform-menu/home/system-guidance.html",
    mount: mountHomeSystemGuidance,
  },
];

async function loadHomeOverviewFragment(fragmentPath) {
  const response = await fetch(fragmentPath, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Home overview fragment failed: ${fragmentPath}`);
  }
  return response.text();
}

async function mountHomeOverviewModule(root, descriptor) {
  const slot = root.querySelector(`[data-home-overview-slot="${descriptor.id}"]`);
  if (!(slot instanceof Element)) return;

  const html = await loadHomeOverviewFragment(descriptor.fragment);
  slot.innerHTML = html;

  const mountedRoot = slot.firstElementChild || slot;
  descriptor.mount?.(mountedRoot);
}

export async function mountHomePlatformDestination(root) {
  if (!(root instanceof Element)) return;

  await Promise.all(
    HOME_OVERVIEW_MODULES.map((descriptor) => mountHomeOverviewModule(root, descriptor))
  );
}
