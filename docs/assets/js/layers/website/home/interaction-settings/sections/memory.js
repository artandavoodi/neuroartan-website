/* =========================================================
   HOME INTERACTION SETTINGS — MEMORY SECTION
   ========================================================= */

const SECTION_NAME = "memory";

function initializeSection() {
  const section = document.querySelector(`[data-home-interaction-settings-section="${SECTION_NAME}"]`);
  if (!section) return;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSection, { once: true });
} else {
  initializeSection();
}
