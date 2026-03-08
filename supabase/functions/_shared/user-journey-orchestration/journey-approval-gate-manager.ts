// Journey Approval Gate Manager
// Handles approval-required states and clear user-facing action prompts.

export interface ApprovalGateState {
  stage_key: string;
  approval_type: string;
  approval_label: string;
  approval_description: string;
  required_actor_type: string;
  approval_status: string;
  is_blocking: boolean;
}

const APPROVAL_GATES: Record<string, { type: string; label: string; description: string }> = {
  discovery: {
    type: 'stage_completion',
    label: 'Approve Discovery',
    description: 'Review the opportunity analysis, market signals, and product validation before proceeding to architecture.',
  },
  architecture: {
    type: 'stage_completion',
    label: 'Approve Architecture',
    description: 'Review the generated architecture, schema, and dependency plan before engineering begins.',
  },
};

export function getApprovalGateForStage(stageKey: string): ApprovalGateState | null {
  const gate = APPROVAL_GATES[stageKey];
  if (!gate) return null;

  return {
    stage_key: stageKey,
    approval_type: gate.type,
    approval_label: gate.label,
    approval_description: gate.description,
    required_actor_type: 'user',
    approval_status: 'pending',
    is_blocking: true,
  };
}

export function isApprovalRequired(stageKey: string): boolean {
  return stageKey in APPROVAL_GATES;
}

export function resolveApproval(gate: ApprovalGateState, decision: 'approved' | 'rejected'): ApprovalGateState {
  return {
    ...gate,
    approval_status: decision,
    is_blocking: decision !== 'approved',
  };
}

export function getPendingApprovalLabel(stageKey: string): string {
  const gate = APPROVAL_GATES[stageKey];
  return gate?.label || `Approve ${stageKey}`;
}
