import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { GovernanceProposal, ProposalSource, RiskLevel } from "@/hooks/useGovernanceDecisionsData";
import { useGovernanceDecisionAction } from "@/hooks/useGovernanceDecisionsData";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  ChevronDown, Shield, AlertTriangle,
  ArrowRight, FileText, Activity, Zap, RotateCcw,
} from "lucide-react";
import {
  type WorkflowState,
  type WorkflowAuditEntry,
  type GovernanceRole,
  getDefaultApprovalMode,
  STATE_DEFINITIONS,
} from "@/lib/governance-workflow-state-machine";
import { WorkflowStateTimeline } from "./WorkflowStateTimeline";
import { TransitionActionPanel } from "./TransitionActionPanel";
import { GovernanceAuditTimeline } from "./GovernanceAuditTimeline";
import { BlockingConditionsPanel } from "./BlockingConditionsPanel";

interface Props {
  proposal: GovernanceProposal;
  onClose: () => void;
}

const riskColors: Record<RiskLevel, string> = {
  critical: "text-destructive bg-destructive/10",
  high: "text-orange-500 bg-orange-500/10",
  medium: "text-yellow-500 bg-yellow-500/10",
  low: "text-muted-foreground bg-muted",
};

const sourceLabels: Record<ProposalSource, string> = {
  canon_evolution: "Canon Evolution",
  policy_tuning: "Policy Tuning",
  agent_selection_tuning: "Agent Selection Tuning",
  readiness_tuning: "Readiness Tuning",
  knowledge_renewal: "Knowledge Renewal",
};

/** Map DecisionStatus → WorkflowState */
function toWorkflowState(status: string): WorkflowState {
  const map: Record<string, WorkflowState> = {
    pending_review: "pending_triage",
    in_review: "in_review",
    awaiting_evidence: "awaiting_evidence",
    needs_revision: "needs_revision",
    approved: "approved",
    rejected: "rejected",
    deferred: "deferred",
  };
  return map[status] || "draft";
}

export function ProposalReviewPanel({ proposal, onClose }: Props) {
  const { toast } = useToast();
  const decisionAction = useGovernanceDecisionAction();

  // Workflow state
  const workflowState = toWorkflowState(proposal.status);
  const approvalMode = getDefaultApprovalMode(proposal.source, proposal.severity);
  const actorRole: GovernanceRole = "senior_reviewer"; // Simulated for now

  // Local audit trail (would come from DB in production)
  const [auditTrail, setAuditTrail] = useState<WorkflowAuditEntry[]>(() => {
    const entries: WorkflowAuditEntry[] = [];
    if (proposal.createdAt) {
      entries.push({
        id: `${proposal.id}-genesis`,
        timestamp: proposal.createdAt,
        actor: proposal.owner,
        actorRole: "governance_operator",
        fromState: "draft",
        toState: "pending_triage",
        auditEvent: "proposal_submitted_to_triage",
        notes: "Proposal auto-generated from operational evidence.",
        metadata: {},
      });
    }
    return entries;
  });

  const handleWorkflowTransition = async (toState: WorkflowState, metadata: Record<string, string>) => {
    // Map workflow state back to decision action
    const actionMap: Record<string, "approve" | "reject" | "defer" | "request_revision"> = {
      approved: "approve",
      rejected: "reject",
      deferred: "defer",
      needs_revision: "request_revision",
    };

    const dbAction = actionMap[toState];

    // Add audit entry locally
    const newEntry: WorkflowAuditEntry = {
      id: `${proposal.id}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: "Current Operator",
      actorRole,
      fromState: workflowState,
      toState,
      auditEvent: `transition_${workflowState}_to_${toState}`,
      notes: metadata.decision_rationale || metadata.revision_reason || metadata.defer_reason || metadata.escalation_reason || metadata.evidence_summary || metadata.revision_summary || metadata.reopen_reason || metadata.closure_reason || "",
      metadata,
    };
    setAuditTrail((prev) => [...prev, newEntry]);

    // Persist to DB if this is a terminal decision action
    if (dbAction) {
      try {
        await decisionAction.mutateAsync({
          proposalId: proposal.id,
          source: proposal.source,
          action: dbAction,
          rationale: metadata.decision_rationale || metadata.rejection_reason || metadata.defer_reason || metadata.revision_reason || "Transition recorded",
        });
        toast({ title: "Transition recorded", description: `${STATE_DEFINITIONS[workflowState].label} → ${STATE_DEFINITIONS[toState].label}` });
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Transition recorded", description: `${STATE_DEFINITIONS[workflowState].label} → ${STATE_DEFINITIONS[toState].label}` });
    }
  };

  const a = proposal.assessment;

  return (
    <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-200px)] pr-1">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px]">{sourceLabels[proposal.source]}</Badge>
            <Badge variant="outline" className={`text-[10px] ${riskColors[proposal.severity]}`}>{proposal.severity} risk</Badge>
            <Badge variant="outline" className="text-[10px] font-medium">
              {STATE_DEFINITIONS[workflowState].label}
            </Badge>
          </div>
          <h2 className="text-lg font-semibold text-foreground leading-tight">{proposal.title}</h2>
          <p className="text-xs text-muted-foreground">
            Created {format(new Date(proposal.createdAt), "MMM d, yyyy 'at' HH:mm")} · {proposal.originatingSubsystem}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs shrink-0">Close</Button>
      </div>

      {/* Workflow State Timeline */}
      <WorkflowStateTimeline currentState={workflowState} auditTrail={auditTrail} />

      {/* Tabbed Content */}
      <Tabs defaultValue="summary" className="space-y-3">
        <TabsList className="bg-secondary/40 h-8 p-0.5">
          <TabsTrigger value="summary" className="text-[11px] h-7">Summary</TabsTrigger>
          <TabsTrigger value="evidence" className="text-[11px] h-7">Evidence</TabsTrigger>
          <TabsTrigger value="risk" className="text-[11px] h-7">Risk & Impact</TabsTrigger>
          <TabsTrigger value="actions" className="text-[11px] h-7">Actions</TabsTrigger>
          <TabsTrigger value="audit" className="text-[11px] h-7">Audit Trail</TabsTrigger>
          <TabsTrigger value="handoff" className="text-[11px] h-7">Handoff</TabsTrigger>
        </TabsList>

        {/* Summary */}
        <TabsContent value="summary" className="space-y-3">
          <Card className="border-border/30">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Proposal Description</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
              {proposal.description || "No description provided."}
            </CardContent>
          </Card>

          {proposal.recommendation && (
            <Card className="border-border/30">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Recommendation</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 text-sm text-muted-foreground">{proposal.recommendation}</CardContent>
            </Card>
          )}

          <Card className="border-border/30">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Why This Proposal Exists</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 text-sm text-muted-foreground">
              {proposal.rationale || "Operational evidence triggered this proposal through the learning loop."}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="border-border/30">
              <CardContent className="p-3">
                <span className="text-xs text-muted-foreground block mb-1">Confidence</span>
                <span className="text-xl font-bold">{(proposal.confidenceScore * 100).toFixed(0)}%</span>
              </CardContent>
            </Card>
            <Card className="border-border/30">
              <CardContent className="p-3">
                <span className="text-xs text-muted-foreground block mb-1">Evidence Completeness</span>
                <span className="text-xl font-bold">{(proposal.evidenceCompleteness * 100).toFixed(0)}%</span>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Evidence */}
        <TabsContent value="evidence" className="space-y-3">
          {proposal.evidenceSummary && (
            <Card className="border-border/30">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm">Evidence Summary</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 text-sm text-muted-foreground">{proposal.evidenceSummary}</CardContent>
            </Card>
          )}

          {proposal.linkedSignalIds.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full p-3 rounded-md border border-border/30 hover:bg-secondary/20">
                <Activity className="h-3.5 w-3.5" />
                Learning Signals ({proposal.linkedSignalIds.length})
                <ChevronDown className="h-3.5 w-3.5 ml-auto" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1">
                {proposal.linkedSignalIds.slice(0, 5).map(id => (
                  <div key={id} className="text-xs text-muted-foreground border border-border/20 rounded px-3 py-2 font-mono">{id}</div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {proposal.linkedActionIds.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full p-3 rounded-md border border-border/30 hover:bg-secondary/20">
                <RotateCcw className="h-3.5 w-3.5" />
                Action Outcomes ({proposal.linkedActionIds.length})
                <ChevronDown className="h-3.5 w-3.5 ml-auto" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1">
                {proposal.linkedActionIds.slice(0, 5).map(id => (
                  <div key={id} className="text-xs text-muted-foreground border border-border/20 rounded px-3 py-2 font-mono">{id}</div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {proposal.linkedSignalIds.length === 0 && proposal.linkedActionIds.length === 0 && !proposal.evidenceSummary && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No linked evidence available. Evidence may be partial.
            </div>
          )}
        </TabsContent>

        {/* Risk & Impact */}
        <TabsContent value="risk" className="space-y-3">
          <Card className="border-border/30">
            <CardContent className="p-4 space-y-3">
              {[
                { label: "Operational Risk", value: a.operationalRisk },
                { label: "Governance Risk", value: a.governanceRisk },
                { label: "Stability Risk", value: a.stabilityRisk },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <Badge variant="outline" className={`text-[10px] ${riskColors[item.value]}`}>{item.value}</Badge>
                </div>
              ))}
              <div className="border-t border-border/20 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Reversibility</span>
                  <span className="text-xs font-medium capitalize">{a.reversibility}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Blast Radius</span>
                  <span className="text-xs font-medium capitalize">{a.blastRadius.replace("_", " ")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Human Oversight</span>
                  <span className="text-xs font-medium">{a.humanOversightRequired ? "Required" : "Optional"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blocking Conditions */}
          <BlockingConditionsPanel
            currentState={workflowState}
            evidenceCompleteness={proposal.evidenceCompleteness}
            hasAssignee={!!proposal.reviewer}
            approvalCount={0}
            requiredApprovalMode={approvalMode}
            actorRole={actorRole}
          />

          {/* Approval Requirements */}
          <Card className="border-border/30">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Approval Requirements</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {proposal.approvalRequirements.map((req, i) => (
                <div key={i} className="flex items-center gap-2">
                  {req.met
                    ? <span className="h-3.5 w-3.5 text-emerald-500 shrink-0">✓</span>
                    : <span className="h-3.5 w-3.5 text-muted-foreground shrink-0">○</span>
                  }
                  <span className="text-xs">{req.label}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{req.detail}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions (Workflow Transitions) */}
        <TabsContent value="actions" className="space-y-3">
          <TransitionActionPanel
            currentState={workflowState}
            evidenceCompleteness={proposal.evidenceCompleteness}
            hasAssignee={!!proposal.reviewer}
            approvalCount={0}
            requiredApprovalMode={approvalMode}
            actorRole={actorRole}
            onTransition={handleWorkflowTransition}
            isLoading={decisionAction.isPending}
          />
        </TabsContent>

        {/* Audit Trail */}
        <TabsContent value="audit" className="space-y-3">
          <GovernanceAuditTimeline auditTrail={auditTrail} />
        </TabsContent>

        {/* Handoff */}
        <TabsContent value="handoff" className="space-y-3">
          {proposal.handoffPreview ? (
            <Card className="border-border/30">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-1.5"><ArrowRight className="h-3.5 w-3.5" /> Implementation Handoff Preview</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground">Target Workflow</span>
                  <p className="text-sm font-medium">{proposal.handoffPreview.targetWorkflow}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Description</span>
                  <p className="text-sm text-muted-foreground">{proposal.handoffPreview.targetDescription}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Steps</span>
                  <ol className="space-y-1.5">
                    {proposal.handoffPreview.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
                <p className="text-[10px] text-muted-foreground/60 italic">
                  This is a preview only. Implementation is not triggered automatically.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">No handoff preview available.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
