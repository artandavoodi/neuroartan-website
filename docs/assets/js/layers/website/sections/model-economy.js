// MARK: - FSC-T-0007 Model Economy Section

export const modelEconomySection = Object.freeze({
  id: "model-economy",
  status: "concept-only",
  title: "Model Economy",
  summary:
    "Approved models may eventually become discoverable, hireable, or monetizable through governed marketplace systems.",
  launchState: "blockedUntilReview",
  blockedUntil: [
    "Founder approval",
    "Governance review",
    "Legal review",
    "Product review",
    "Website systems review",
    "Final copy review"
  ]
});

export function getModelEconomySection() {
  return modelEconomySection;
}
