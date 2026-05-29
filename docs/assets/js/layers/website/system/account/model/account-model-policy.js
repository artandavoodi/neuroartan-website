/* =============================================================================
   FSC-T-0007) ACCOUNT MODEL POLICY EXTENSION
============================================================================= */

export const ACCOUNT_MODEL_ECONOMY_POLICY = Object.freeze({
  canonicalPersonalModel: "freeByDefault",
  oneProfileOneCanonicalModel: true,
  additionalCanonicalPersonalModels: "blocked",
  paidMultiModelPersonalExpansion: "blocked",
  premiumDepthControls: "allowedByEntitlement",
  monetizationEligibility: "blockedUntilReview",
  hiringEligibility: "blockedUntilReview",
  marketplaceVisibility: "blockedUntilReview",
  interModelCoordination: "blockedUntilReview",
  deviceIntegrityBoundary: "securityOnlyReviewBlocked",
  rawPhysicalDeviceSerialNumberCollection: "blocked",
  advertisingTrackingPersonalizationUse: "blocked",
  impersonationPrevention: "required",
  modelIdentityAntiAbuse: "required",
  restrictionReviewAppeal: "requiredForSevereRestriction",
  publicPositioning: "blockedUntilReview"
});
