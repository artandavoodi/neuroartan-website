// MARK: - FSC-T-0007 Model Dignity State

export const modelDignityState = Object.freeze({
  definition:
    "Model dignity protects user-derived continuity material. It does not imply consciousness, sentience, legal personhood, biological life, or metaphysical identity transfer.",
  protectedMaterial: [
    "voice",
    "memory",
    "source history",
    "browsing context",
    "social graph context",
    "behavioral patterns",
    "identity-adjacent data",
    "posthumous continuity material"
  ]
});

export function getModelDignityState() {
  return modelDignityState;
}
