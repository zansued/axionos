// Sprint 69 — Onboarding Outcome Validator
// Tracks whether onboarding/template decisions improved first-run clarity and completion.

export interface OnboardingOutcome {
  sessionCompleted: boolean;
  initiativeCreated: boolean;
  templateUsed: string | null;
  verticalUsed: string | null;
  timeToFirstInitiativeMs: number;
  frictionSignalCount: number;
}

export interface OutcomeValidation {
  templateUsefulnessScore: number;
  starterPathEffectivenessScore: number;
  onboardingOutcomeAccuracyScore: number;
  guidedStartCoherenceScore: number;
  falseFitPenaltyScore: number;
  reasoning: string;
}

export function validateOnboardingOutcome(outcome: OnboardingOutcome): OutcomeValidation {
  let templateUsefulness = 0.5;
  let starterEffectiveness = 0.5;
  let outcomeAccuracy = 0.5;
  let coherence = 0.5;
  let falseFitPenalty = 0;

  if (outcome.sessionCompleted) { templateUsefulness += 0.2; coherence += 0.2; }
  if (outcome.initiativeCreated) { templateUsefulness += 0.2; starterEffectiveness += 0.2; outcomeAccuracy += 0.3; }
  if (outcome.templateUsed) { templateUsefulness += 0.1; }
  if (outcome.verticalUsed) { starterEffectiveness += 0.2; }
  if (outcome.timeToFirstInitiativeMs < 120000) { coherence += 0.2; } // under 2 min
  if (outcome.frictionSignalCount > 3) { falseFitPenalty = 0.3; templateUsefulness -= 0.15; }
  if (!outcome.initiativeCreated && outcome.templateUsed) { falseFitPenalty += 0.2; }

  return {
    templateUsefulnessScore: Math.max(0, Math.min(1, templateUsefulness)),
    starterPathEffectivenessScore: Math.max(0, Math.min(1, starterEffectiveness)),
    onboardingOutcomeAccuracyScore: Math.max(0, Math.min(1, outcomeAccuracy)),
    guidedStartCoherenceScore: Math.max(0, Math.min(1, coherence)),
    falseFitPenaltyScore: Math.max(0, Math.min(1, falseFitPenalty)),
    reasoning: outcome.initiativeCreated
      ? `Onboarding succeeded — initiative created${outcome.templateUsed ? ` using "${outcome.templateUsed}"` : ""}.`
      : `Onboarding did not result in initiative creation. ${outcome.frictionSignalCount > 0 ? `${outcome.frictionSignalCount} friction signals detected.` : ""}`,
  };
}
