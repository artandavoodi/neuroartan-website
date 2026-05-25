


/* =============================================================================
   FSC-T-0007) ACCOUNT MODEL POLICY EXTENSION
============================================================================= */

export const ACCOUNT_MODEL_ECONOMY_POLICY = Object.freeze({
  defaultPersonalModel: "freeByDefault",
  additionalModels: "requiresEntitlementExpansion",
  monetizationEligibility: "requiresReview",
  hiringEligibility: "requiresReview",
  marketplaceVisibility: "requiresReview",
  publicPositioning: "blockedUntilReview"
});
