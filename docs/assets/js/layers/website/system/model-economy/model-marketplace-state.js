// MARK: - FSC-T-0007 Model Marketplace State

export const modelMarketplaceState = Object.freeze({
  status: "conceptOnly",
  visibility: "blockedUntilReview",
  allowedStates: [
    "notEligible",
    "reviewPending",
    "eligible",
    "approved",
    "suspended",
    "revoked"
  ],
  rule: "Marketplace visibility must remain blocked until governance, legal, product, and implementation review."
});

export function getModelMarketplaceState() {
  return modelMarketplaceState;
}
