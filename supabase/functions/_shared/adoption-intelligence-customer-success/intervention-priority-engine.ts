// Intervention Priority Engine
// Produces advisory guidance priorities for customer success improvements.

export interface InterventionCandidate {
  intervention_type: "suggest_clarify" | "suggest_simplify" | "suggest_guidance" | "suggest_followup";
  target_stage: string;
  priority_score: number;
  description: string;
}

export interface InterventionAnalysis {
  candidates: InterventionCandidate[];
  intervention_priority_score: number;
  customer_success_loop_quality_score: number;
}

export function computeInterventionPriorities(
  frictionScore: number,
  dropoffRisk: number,
  stalledStages: string[],
  abandonedOnboarding: boolean,
  milestoneCompletion: number,
): InterventionAnalysis {
  const candidates: InterventionCandidate[] = [];

  if (abandonedOnboarding) {
    candidates.push({
      intervention_type: "suggest_simplify",
      target_stage: "onboarding",
      priority_score: 0.9,
      description: "User abandoned onboarding. Simplify entry flow or recommend a template.",
    });
  }

  for (const stage of stalledStages) {
    candidates.push({
      intervention_type: "suggest_guidance",
      target_stage: stage,
      priority_score: 0.6 + (stage === "deploy" ? 0.2 : 0),
      description: `User stalled at ${stage}. Provide contextual guidance.`,
    });
  }

  if (milestoneCompletion > 0.5 && milestoneCompletion < 0.8) {
    candidates.push({
      intervention_type: "suggest_followup",
      target_stage: "general",
      priority_score: 0.5,
      description: "User is progressing but hasn't completed the journey. Follow-up may help.",
    });
  }

  if (frictionScore > 0.5) {
    candidates.push({
      intervention_type: "suggest_clarify",
      target_stage: "general",
      priority_score: 0.7,
      description: "High friction detected. Clarify unclear steps or reduce complexity.",
    });
  }

  candidates.sort((a, b) => b.priority_score - a.priority_score);

  const interventionPriority = candidates.length > 0
    ? Math.min(1, candidates[0].priority_score)
    : 0;

  const loopQuality = Math.max(0, Math.min(1,
    milestoneCompletion * 0.4 + (1 - frictionScore) * 0.3 + (1 - dropoffRisk) * 0.3
  ));

  return {
    candidates,
    intervention_priority_score: Number(interventionPriority.toFixed(3)),
    customer_success_loop_quality_score: Number(loopQuality.toFixed(3)),
  };
}
