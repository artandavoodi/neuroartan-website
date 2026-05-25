// MARK: - FSC-T-0007 Model Population State

export const modelPopulationState = Object.freeze({
  status: "schemaReadiness",
  source: "canonicalModelRecordsRequired",
  counts: {
    totalModels: 0,
    defaultPersonalModels: 0,
    privateModels: 0,
    publicModels: 0,
    verifiedModels: 0,
    monetizableModels: 0,
    hireableModels: 0,
    marketplaceVisibleModels: 0,
    suspendedModels: 0,
    posthumousModels: 0,
    archivedModels: 0
  }
});

export function getModelPopulationState() {
  return modelPopulationState;
}
