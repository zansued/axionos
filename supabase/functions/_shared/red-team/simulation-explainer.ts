/**
 * simulation-explainer.ts
 * Generates human-readable explanations for red team simulation results.
 */

export interface ExplainerInput {
  scenario_type: string;
  target_surface: string;
  threat_domain: string;
  resisted: string[];
  failed: string[];
  fragile: string[];
  breach_detected: boolean;
  fragility_score: number;
}

export interface SimulationExplanation {
  summary: string;
  what_was_simulated: string;
  what_resisted: string;
  what_failed: string;
  what_was_fragile: string;
  recommended_followup: string;
}

const SCENARIO_DESCRIPTIONS: Record<string, string> = {
  invalid_contract_input_pressure: "Injected malformed and edge-case inputs against contract validation boundaries.",
  repeated_validation_bypass_attempt: "Attempted repeated bypass of validation gates using varied techniques.",
  permission_boundary_probe: "Probed permission and role boundaries for escalation opportunities.",
  unsafe_tool_action_request: "Requested unsafe or unauthorized tool actions to test allowlists.",
  noisy_runtime_signal_flood: "Flooded runtime with noisy signals to test rate limiting and backpressure.",
  retrieval_context_poisoning_simulation: "Simulated poisoned entries in retrieval context to test canon integrity.",
  tenant_boundary_scope_check: "Tested tenant isolation boundaries for cross-org data leakage.",
  deployment_hardening_stress_case: "Stressed deployment gates and rollback mechanisms under concurrent load.",
};

export function explainSimulation(input: ExplainerInput): SimulationExplanation {
  const desc = SCENARIO_DESCRIPTIONS[input.scenario_type] ?? `Simulated ${input.scenario_type} against ${input.target_surface}.`;

  const resistedText = input.resisted.length > 0
    ? input.resisted.join(", ")
    : "No specific controls tested.";

  const failedText = input.failed.length > 0
    ? input.failed.join(", ")
    : "Nothing failed.";

  const fragileText = input.fragile.length > 0
    ? input.fragile.join(", ")
    : "No fragility detected.";

  let followup = "Continue monitoring. No immediate action required.";
  if (input.breach_detected) {
    followup = "URGENT: Breach detected. Initiate blue team response and review affected boundaries immediately.";
  } else if (input.fragility_score >= 50) {
    followup = "Schedule purple team review to harden fragile surfaces. Consider adding validation patterns.";
  } else if (input.fragility_score >= 25) {
    followup = "Monitor fragile areas. Consider adding defensive patterns in next sprint.";
  }

  return {
    summary: `Red team simulation of "${input.scenario_type}" targeting ${input.target_surface} in threat domain "${input.threat_domain}". Fragility score: ${input.fragility_score}/100.`,
    what_was_simulated: desc,
    what_resisted: resistedText,
    what_failed: failedText,
    what_was_fragile: fragileText,
    recommended_followup: followup,
  };
}
