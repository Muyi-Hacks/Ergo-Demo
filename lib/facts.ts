// Fact keys and labels, kept free of zod so client components can import them.

export const NOT_MENTIONED = "Not mentioned";

export const FACT_KEYS = [
  "stage",
  "budget",
  "pricing",
  "target_go_live",
  "signature_deadline",
  "decision_process",
  "competition",
] as const;
export type FactKey = (typeof FACT_KEYS)[number];

export const FACT_LABELS: Record<FactKey, string> = {
  stage: "Stage",
  budget: "Budget",
  pricing: "Pricing",
  target_go_live: "Target go-live",
  signature_deadline: "Signature deadline",
  decision_process: "Decision process",
  competition: "Competition",
};
