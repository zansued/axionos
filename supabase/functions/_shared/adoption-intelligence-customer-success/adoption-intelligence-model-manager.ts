// Adoption Intelligence Model Manager
// Manages adoption models, milestone definitions, and journey success criteria.

export interface AdoptionModel {
  model_name: string;
  model_type: string;
  milestones: MilestoneDefinition[];
  success_criteria: Record<string, unknown>;
}

export interface MilestoneDefinition {
  milestone_key: string;
  milestone_label: string;
  journey_stage: string;
  weight: number;
}

const DEFAULT_MILESTONES: MilestoneDefinition[] = [
  { milestone_key: "idea_created", milestone_label: "Idea Captured", journey_stage: "idea", weight: 0.05 },
  { milestone_key: "discovery_started", milestone_label: "Discovery Started", journey_stage: "discovery", weight: 0.1 },
  { milestone_key: "discovery_completed", milestone_label: "Discovery Completed", journey_stage: "discovery", weight: 0.15 },
  { milestone_key: "architecture_completed", milestone_label: "Architecture Done", journey_stage: "architecture", weight: 0.15 },
  { milestone_key: "engineering_completed", milestone_label: "Engineering Done", journey_stage: "engineering", weight: 0.2 },
  { milestone_key: "validation_passed", milestone_label: "Validation Passed", journey_stage: "validation", weight: 0.1 },
  { milestone_key: "deploy_succeeded", milestone_label: "Deploy Succeeded", journey_stage: "deploy", weight: 0.15 },
  { milestone_key: "handoff_complete", milestone_label: "Handoff Complete", journey_stage: "handoff", weight: 0.1 },
];

export function getDefaultAdoptionModel(): AdoptionModel {
  return {
    model_name: "standard_journey_adoption",
    model_type: "journey_adoption",
    milestones: DEFAULT_MILESTONES,
    success_criteria: {
      min_completion_rate: 0.6,
      min_deploy_success: true,
      min_milestones_hit: 5,
    },
  };
}

export function computeMilestoneCompletionScore(
  completedMilestones: string[],
  milestones: MilestoneDefinition[] = DEFAULT_MILESTONES,
): number {
  const totalWeight = milestones.reduce((s, m) => s + m.weight, 0);
  const completedWeight = milestones
    .filter((m) => completedMilestones.includes(m.milestone_key))
    .reduce((s, m) => s + m.weight, 0);
  return totalWeight > 0 ? Number((completedWeight / totalWeight).toFixed(3)) : 0;
}
