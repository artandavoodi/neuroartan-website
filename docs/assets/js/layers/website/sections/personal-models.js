// MARK: - FSC-T-0007 Personal Models Section

export const personalModelsSection = Object.freeze({
  id: "personal-models",
  status: "positioning-ready",
  title: "Personal Models",
  summary:
    "Create a personal model. Train it with your knowledge. Direct its work.",
  doctrine:
    "AI absorbs operational labor while the human retains sovereign authorship, ownership, and direction.",
  boundaries: [
    "No guaranteed-income claims.",
    "No model consciousness claims.",
    "No legal personhood claims.",
    "No uncontrolled autonomous-labor framing."
  ]
});

export function getPersonalModelsSection() {
  return personalModelsSection;
}
