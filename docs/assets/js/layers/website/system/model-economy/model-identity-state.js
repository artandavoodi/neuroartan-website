// MARK: - FSC-T-0007 Model Identity State

export const modelIdentityBoundary = Object.freeze({
  publicFields: [
    "publicModelId",
    "publicSerialIdentity",
    "displayName",
    "verificationState",
    "publicLifecycleState"
  ],
  privateFields: [
    "privateModelId",
    "privateSerialIdentity",
    "providerRoute",
    "apiRoute",
    "tokenAuthority",
    "sourceAuthorizationEvidence"
  ],
  rule: "Private model identity and provider-routing data must never render in public surfaces."
});

export function getModelIdentityBoundary() {
  return modelIdentityBoundary;
}
