// Repair Policy Explainer — AxionOS Sprint 23
// Generates human-readable explanations for repair decisions.

import type { RepairPolicyDecision } from "./repair-policy-engine.ts";
import type { RetryAction } from "./retry-path-intelligence.ts";

export interface RepairExplanation {
  summary: string;
  strategy_rationale: string;
  confidence_label: string;
  evidence_summary: string[];
  retry_recommendation: string;
}

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "Alta confiança — estratégia bem validada",
  medium: "Confiança moderada — evidência parcial",
  low: "Baixa confiança — poucos dados históricos",
  minimal: "Confiança mínima — sem evidência prévia",
};

function confidenceLabel(score: number): string {
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "medium";
  if (score >= 0.2) return "low";
  return "minimal";
}

const REASON_DESCRIPTIONS: Record<string, string> = {
  policy_profile_match: "Perfil de política existente encontrado para esta combinação de estágio+erro",
  memory_evidence_match: "Evidência de memória histórica indica estratégia com alto sucesso",
  error_pattern_match: "Padrão de erro conhecido com estratégias validadas",
  retry_threshold_switch_to_fallback: "Limite de retries atingido, alternando para estratégia fallback",
  max_retries_exceeded: "Número máximo de retries excedido",
  escalate_to_human: "Escalado para revisão humana",
  no_evidence_default_fallback: "Sem evidência histórica, usando estratégia padrão",
};

const RETRY_DESCRIPTIONS: Record<RetryAction, string> = {
  retry_same_strategy: "Tentar novamente com a mesma estratégia",
  retry_modified_prompt: "Tentar novamente com prompt modificado dentro da mesma estratégia",
  switch_strategy: "Alternar para estratégia alternativa",
  escalate_to_prevention: "Escalar para candidato de regra de prevenção",
  escalate_to_human: "Escalar para revisão humana",
};

/**
 * Generate a human-readable explanation for a repair decision.
 */
export function explainRepairDecision(
  decision: RepairPolicyDecision,
  retryAction: RetryAction,
): RepairExplanation {
  const confLevel = confidenceLabel(decision.confidence);

  const reasonDescriptions = decision.reason_codes
    .map((r) => REASON_DESCRIPTIONS[r] || r)
    .filter(Boolean);

  const evidenceSummary = decision.evidence_refs.map((e) => `[${e.type}] ${e.detail}`);

  return {
    summary: `Estratégia selecionada: ${decision.selected_strategy} (confiança: ${(decision.confidence * 100).toFixed(0)}%)`,
    strategy_rationale: reasonDescriptions.join(". ") || "Seleção baseada em heurísticas padrão",
    confidence_label: CONFIDENCE_LABELS[confLevel],
    evidence_summary: evidenceSummary,
    retry_recommendation: RETRY_DESCRIPTIONS[retryAction] || "Sem recomendação específica",
  };
}
