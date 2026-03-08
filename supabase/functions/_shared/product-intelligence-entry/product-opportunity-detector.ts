/**
 * Product Opportunity Detector
 * Identifies bounded opportunity candidates from signal correlation.
 */

export interface OpportunityInput {
  productArea: string;
  avgFriction: number;
  avgAdoption: number;
  avgRetention: number;
  avgValue: number;
  signalCount: number;
  avgConfidence: number;
  architectureAlignment: number;
  profileAlignment: number;
}

export interface OpportunityCandidate {
  productArea: string;
  opportunityType: string;
  opportunityScore: number;
  confidenceScore: number;
  priorityScore: number;
  frictionCorrelation: number;
  architectureAlignment: number;
  profileAlignment: number;
  feasibilityScore: number;
  expectedImpact: number;
}

export function detectOpportunities(inputs: OpportunityInput[]): OpportunityCandidate[] {
  return inputs
    .map(input => {
      const oppType = classifyOpportunity(input);
      const oppScore = computeOpportunityScore(input);
      const feasibility = computeFeasibility(input);
      const priority = computePriority(oppScore, input.avgConfidence, feasibility);
      const expectedImpact = Math.round((oppScore * feasibility * input.avgConfidence) * 100) / 100;

      return {
        productArea: input.productArea,
        opportunityType: oppType,
        opportunityScore: oppScore,
        confidenceScore: Math.round(input.avgConfidence * 100) / 100,
        priorityScore: priority,
        frictionCorrelation: Math.round(input.avgFriction * 100) / 100,
        architectureAlignment: Math.round(input.architectureAlignment * 100) / 100,
        profileAlignment: Math.round(input.profileAlignment * 100) / 100,
        feasibilityScore: feasibility,
        expectedImpact,
      };
    })
    .filter(o => o.opportunityScore > 0.2)
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

function classifyOpportunity(input: OpportunityInput): string {
  if (input.avgFriction >= 0.5) return 'friction_reduction';
  if (input.avgAdoption < 0.3 && input.avgValue >= 0.5) return 'adoption_boost';
  if (input.avgRetention < 0.4) return 'retention_fix';
  if (input.avgValue >= 0.6) return 'value_amplification';
  return 'improvement';
}

function computeOpportunityScore(input: OpportunityInput): number {
  const score = input.avgFriction * 0.25 + input.avgValue * 0.25 +
    (1 - input.avgAdoption) * 0.15 + (1 - input.avgRetention) * 0.15 +
    Math.min(input.signalCount / 20, 1) * 0.2;
  return Math.round(Math.min(1, score) * 100) / 100;
}

function computeFeasibility(input: OpportunityInput): number {
  const feas = input.architectureAlignment * 0.4 + input.profileAlignment * 0.3 +
    input.avgConfidence * 0.3;
  return Math.round(Math.min(1, feas) * 100) / 100;
}

function computePriority(oppScore: number, confidence: number, feasibility: number): number {
  // High value + low confidence = low priority (bounded)
  const adjusted = oppScore * 0.4 + confidence * 0.3 + feasibility * 0.3;
  return Math.round(Math.min(1, adjusted) * 100) / 100;
}
