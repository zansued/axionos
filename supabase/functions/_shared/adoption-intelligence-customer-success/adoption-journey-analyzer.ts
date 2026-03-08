// Adoption Journey Analyzer
// Analyzes real journey progression, completion, hesitation, and abandonment patterns.

export interface JourneyAnalysis {
  stages_entered: string[];
  stages_completed: string[];
  stages_stalled: string[];
  hesitation_points: string[];
  abandonment_stage: string | null;
  journey_depth_score: number;
  stall_ratio: number;
}

const JOURNEY_STAGES = ["idea", "discovery", "architecture", "engineering", "validation", "deploy", "handoff"];

export function analyzeJourneyAdoption(
  stageStatus: string,
  completedStages: string[],
  stalledStages: string[],
): JourneyAnalysis {
  const currentIdx = JOURNEY_STAGES.indexOf(stageStatus);
  const entered = currentIdx >= 0 ? JOURNEY_STAGES.slice(0, currentIdx + 1) : ["idea"];

  const hesitation = stalledStages.filter((s) => entered.includes(s));
  const abandoned = stalledStages.length > 0 && completedStages.length < entered.length
    ? stalledStages[stalledStages.length - 1]
    : null;

  const depthScore = entered.length / JOURNEY_STAGES.length;
  const stallRatio = entered.length > 0 ? stalledStages.length / entered.length : 0;

  return {
    stages_entered: entered,
    stages_completed: completedStages,
    stages_stalled: stalledStages,
    hesitation_points: hesitation,
    abandonment_stage: abandoned,
    journey_depth_score: Number(depthScore.toFixed(3)),
    stall_ratio: Number(stallRatio.toFixed(3)),
  };
}
