/**
 * Doctrine Explainer
 * Generates human-readable explanations of adaptation evaluations:
 * - core principle
 * - contextual adaptation
 * - institutional reason
 * - preserved boundary
 */

import { AdaptationResult } from "./doctrine-adaptation-engine.ts";
import { DoctrineRecord } from "./doctrine-core-loader.ts";
import { ContextProfile } from "./context-doctrine-mapper.ts";

export interface DoctrineExplanation {
  corePrinciple: string;
  contextualAdaptation: string;
  institutionalReason: string;
  preservedBoundary: string;
  driftWarning: string | null;
  overallVerdict: string;
}

export function explainAdaptation(
  doctrine: DoctrineRecord,
  context: ContextProfile,
  result: AdaptationResult
): DoctrineExplanation {
  const corePrinciple = `Core doctrine "${doctrine.doctrine_name}" (${doctrine.doctrine_scope} scope, ${doctrine.immutability_level} immutability): ${doctrine.doctrine_text || "No description provided."}`;

  let contextualAdaptation: string;
  switch (result.evaluationResult) {
    case "compatible":
      contextualAdaptation = `The doctrine applies directly to context "${context.context_name}" without modification. Full compatibility confirmed.`;
      break;
    case "adapted":
      contextualAdaptation = `The doctrine has been contextually adapted for "${context.context_name}". ${result.adaptationSummary}`;
      break;
    case "conflicting":
      contextualAdaptation = `The doctrine conflicts with the operational reality of context "${context.context_name}". ${result.adaptationSummary}`;
      break;
    case "blocked":
      contextualAdaptation = `Adaptation is blocked for context "${context.context_name}". ${result.blockedReasons.join("; ")}`;
      break;
  }

  const institutionalReason = result.appliedRules.length > 0
    ? `${result.appliedRules.length} adaptation rule(s) govern this relationship. Justifications: ${result.appliedRules.map((r) => r.justification || "No justification provided").join("; ")}`
    : "No specific adaptation rules defined. Default doctrine inheritance applies.";

  const preservedBoundary = doctrine.immutability_level === "strict"
    ? "This doctrine is strictly immutable. No contextual override is permitted."
    : doctrine.immutability_level === "bounded"
    ? "This doctrine allows bounded adaptation within declared limits."
    : "This doctrine is flexible and allows contextual reinterpretation.";

  const driftWarning = result.driftRiskScore > 0.2
    ? `⚠ Drift risk score: ${result.driftRiskScore}. ${result.driftRiskScore > 0.6 ? "High drift risk — review recommended." : "Moderate drift — monitor."}`
    : null;

  const overallVerdict = `Evaluation: ${result.evaluationResult} (compatibility: ${result.compatibilityScore}, drift risk: ${result.driftRiskScore})`;

  return {
    corePrinciple,
    contextualAdaptation,
    institutionalReason,
    preservedBoundary,
    driftWarning,
    overallVerdict,
  };
}
