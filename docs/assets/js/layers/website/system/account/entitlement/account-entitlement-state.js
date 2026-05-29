/* =============================================================================
   FSC-T-0007) CANONICAL MODEL ENTITLEMENT STATES
============================================================================= */

export const MODEL_ECONOMY_ENTITLEMENT_STATES = Object.freeze({
  canonicalPersonalModel: true,
  oneProfileOneCanonicalModel: true,
  additionalCanonicalPersonalModels: "blocked",
  paidMultiModelPersonalExpansion: "blocked",
  premiumDepthControls: "allowedByEntitlement",
  monetizationReview: "blockedUntilReview",
  hiringReview: "blockedUntilReview",
  marketplaceReview: "blockedUntilReview",
  interModelCoordination: "blockedUntilReview",
  payouts: "blockedUntilReview",
  deviceIntegrityBoundary: "securityOnlyReviewBlocked",
  rawPhysicalDeviceSerialNumberCollection: "blocked",
  advertisingTrackingPersonalizationUse: "blocked",
  impersonationPrevention: "required",
  modelIdentityAntiAbuse: "required",
  restrictionReviewAppeal: "requiredForSevereRestriction"
});
