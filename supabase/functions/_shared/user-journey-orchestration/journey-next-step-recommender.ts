// Journey Next-Step Recommender
// Produces clear user-facing next actions without leaking unnecessary internal complexity.

export interface NextStepRecommendation {
  action_type: string;
  action_label: string;
  action_description: string;
  urgency: 'low' | 'medium' | 'high';
  confidence: number;
}

export function recommendNextStep(
  visibleStage: string,
  approvalRequired: boolean,
  approvalState: string,
  hasDeployUrl: boolean,
  hasRepoUrl: boolean,
  blockedTransitions: number,
): NextStepRecommendation {
  if (approvalRequired && approvalState === 'pending') {
    return {
      action_type: 'approve',
      action_label: `Approve ${visibleStage}`,
      action_description: `Review the ${visibleStage} outputs and approve to continue the journey.`,
      urgency: 'high',
      confidence: 0.95,
    };
  }

  if (blockedTransitions > 0) {
    return {
      action_type: 'resolve_blocker',
      action_label: 'Resolve blocked transition',
      action_description: 'A transition is blocked. Review the reason and take action.',
      urgency: 'high',
      confidence: 0.85,
    };
  }

  switch (visibleStage) {
    case 'idea':
      return {
        action_type: 'start_discovery',
        action_label: 'Start Opportunity Discovery',
        action_description: 'Launch the discovery process to validate your idea with market intelligence.',
        urgency: 'medium',
        confidence: 0.9,
      };
    case 'discovery':
      return {
        action_type: 'review_discovery',
        action_label: 'Review Discovery Results',
        action_description: 'Review opportunity score, market signals, and product validation.',
        urgency: 'medium',
        confidence: 0.9,
      };
    case 'architecture':
      return {
        action_type: 'review_architecture',
        action_label: 'Review Architecture',
        action_description: 'Review the technical plan, schema, and dependencies before build.',
        urgency: 'medium',
        confidence: 0.9,
      };
    case 'engineering':
      return {
        action_type: 'monitor_build',
        action_label: 'Building Your Software',
        action_description: 'The system is generating code. No action needed — progress is automatic.',
        urgency: 'low',
        confidence: 0.95,
      };
    case 'validation':
      return {
        action_type: 'monitor_validation',
        action_label: 'Validating Build',
        action_description: 'Code is being validated and repaired if needed. Almost there.',
        urgency: 'low',
        confidence: 0.9,
      };
    case 'deploy':
      return {
        action_type: hasDeployUrl ? 'view_deploy' : 'wait_deploy',
        action_label: hasDeployUrl ? 'View Your Deployed App' : 'Publishing...',
        action_description: hasDeployUrl
          ? 'Your software is deployed and accessible.'
          : 'Code is being published to the repository.',
        urgency: hasDeployUrl ? 'low' : 'medium',
        confidence: 0.9,
      };
    case 'delivered':
      return {
        action_type: 'complete',
        action_label: 'Software Delivered!',
        action_description: 'Your software is live and accessible. You can share the link or start a new initiative.',
        urgency: 'low',
        confidence: 1.0,
      };
    default:
      return {
        action_type: 'none',
        action_label: 'No action needed',
        action_description: '',
        urgency: 'low',
        confidence: 0.5,
      };
  }
}
