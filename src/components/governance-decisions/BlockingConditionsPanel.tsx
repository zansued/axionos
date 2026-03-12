import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  type WorkflowState,
  type ApprovalMode,
  type GovernanceRole,
  type BlockingCondition,
  getAvailableTransitions,
  validateTransition,
  STATE_DEFINITIONS,
  APPROVAL_MODE_LABELS,
} from "@/lib/governance-workflow-state-machine";
import { AlertTriangle, CheckCircle2, Shield, XCircle } from "lucide-react";

interface Props {
  currentState: WorkflowState;
  evidenceCompleteness: number;
  hasAssignee: boolean;
  approvalCount: number;
  requiredApprovalMode: ApprovalMode;
  actorRole: GovernanceRole;
}

export function BlockingConditionsPanel({
  currentState,
  evidenceCompleteness,
  hasAssignee,
  approvalCount,
  requiredApprovalMode,
  actorRole,
}: Props) {
  const stateDef = STATE_DEFINITIONS[currentState];
  const available = getAvailableTransitions(currentState);

  // Collect all unique blocking conditions across all transitions
  const allBlockers = new Map<string, BlockingCondition>();
  available.forEach((t) => {
    const result = validateTransition(currentState, t.to, {
      evidenceCompleteness,
      hasAssignee,
      approvalCount,
      requiredApprovalMode,
      actorRole,
    });
    result.blockingConditions.forEach((bc) => {
      if (!allBlockers.has(bc.code)) allBlockers.set(bc.code, bc);
    });
  });

  const blockers = Array.from(allBlockers.values());
  const hasBlockers = blockers.length > 0 || stateDef.isBlocking;

  return (
    <Card className={`border-border/30 ${hasBlockers ? "border-yellow-500/20" : ""}`}>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-1.5">
          {hasBlockers ? (
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          )}
          {hasBlockers ? "Blocking Conditions" : "No Blockers"}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* State blocking */}
        {stateDef.isBlocking && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-yellow-500/5 border border-yellow-500/20">
            <XCircle className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-foreground">State is blocking</p>
              <p className="text-[10px] text-muted-foreground">{stateDef.description}</p>
            </div>
          </div>
        )}

        {/* Transition blockers */}
        {blockers.map((bc) => (
          <div key={bc.code} className="flex items-start gap-2 p-2 rounded-md bg-yellow-500/5 border border-yellow-500/20">
            <XCircle className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-foreground">{bc.label}</p>
              <p className="text-[10px] text-muted-foreground">{bc.detail}</p>
            </div>
          </div>
        ))}

        {!hasBlockers && (
          <p className="text-xs text-muted-foreground">All transition conditions are currently satisfied.</p>
        )}

        {/* Approval Requirements */}
        <div className="border-t border-border/20 pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Approval Policy</span>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {APPROVAL_MODE_LABELS[requiredApprovalMode]}
          </Badge>
          {requiredApprovalMode === "dual_approval" && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Approvals recorded: {approvalCount} / 2
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
