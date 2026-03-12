import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  type HandoffPackage,
  type HandoffStatus,
  type HandoffAuditEntry,
  type HandoffTransition,
  type DownstreamReceipt,
  HANDOFF_STATUS_DEFINITIONS,
  getAvailableHandoffTransitions,
  computeValidationChecks,
  allRequiredValidationsPassed,
  TARGET_WORKFLOW_MAP,
} from "@/lib/governance-handoff-state-machine";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  ArrowRight, CheckCircle2, XCircle, Shield, FileText,
  AlertTriangle, Package, Clock, History, Send, Ban, RotateCcw,
} from "lucide-react";

interface Props {
  handoff: HandoffPackage;
  onClose: () => void;
}

const riskColors: Record<string, string> = {
  critical: "text-destructive bg-destructive/10",
  high: "text-orange-500 bg-orange-500/10",
  medium: "text-yellow-500 bg-yellow-500/10",
  low: "text-muted-foreground bg-muted",
};

const typeLabels: Record<string, string> = {
  canon_evolution: "Canon Evolution",
  policy_tuning: "Policy Tuning",
  agent_selection_tuning: "Agent Selection Tuning",
  readiness_tuning: "Readiness Tuning",
};

export function HandoffWorkspacePanel({ handoff: initialHandoff, onClose }: Props) {
  const { toast } = useToast();
  const [handoff, setHandoff] = useState<HandoffPackage>({ ...initialHandoff });
  const [selectedTransition, setSelectedTransition] = useState<HandoffTransition | null>(null);
  const [transitionInputs, setTransitionInputs] = useState<Record<string, string>>({});

  // Editable package fields
  const [pkg, setPkg] = useState({
    changeSummary: handoff.changeSummary,
    changeIntent: handoff.changeIntent,
    scopeBoundaries: handoff.scopeBoundaries,
    constraints: handoff.constraints,
    riskNotes: handoff.riskNotes,
    monitoringRequirements: handoff.monitoringRequirements,
    rollbackExpectations: handoff.rollbackExpectations,
    releaseNotes: handoff.releaseNotes,
  });

  const validationChecks = computeValidationChecks({
    ...handoff,
    ...pkg,
  });
  const allValid = allRequiredValidationsPassed(validationChecks);
  const available = getAvailableHandoffTransitions(handoff.handoffStatus);
  const statusDef = HANDOFF_STATUS_DEFINITIONS[handoff.handoffStatus];
  const workflowMapping = TARGET_WORKFLOW_MAP[handoff.proposalType];

  const executeTransition = (t: HandoffTransition) => {
    // Block release if validation fails
    if (t.to === "released" && !allValid) {
      toast({ title: "Validation failed", description: "All required validation checks must pass before release.", variant: "destructive" });
      return;
    }
    if (t.to === "awaiting_validation" || t.to === "ready_for_release") {
      // Save pkg edits into handoff
      setHandoff((prev) => ({ ...prev, ...pkg }));
    }

    const newEntry: HandoffAuditEntry = {
      id: `${handoff.handoffId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: "Current Operator",
      eventType: `handoff_${t.to}`,
      fromStatus: handoff.handoffStatus,
      toStatus: t.to,
      summary: t.label,
      notes: Object.values(transitionInputs).filter(Boolean).join(" | "),
    };

    setHandoff((prev) => ({
      ...prev,
      ...pkg,
      handoffStatus: t.to,
      auditHistory: [...prev.auditHistory, newEntry],
      releasedAt: t.to === "released" ? new Date().toISOString() : prev.releasedAt,
      releasedBy: t.to === "released" ? "Current Operator" : prev.releasedBy,
      downstreamReceipt:
        t.to === "released"
          ? {
              targetWorkflow: handoff.targetWorkflow,
              releaseTimestamp: new Date().toISOString(),
              releasePayloadSummary: pkg.changeSummary || handoff.changeSummary,
              expectedNextState: "Draft change pending review",
              ownerFunction: workflowMapping?.subsystem || handoff.targetSubsystem,
              handoffReferenceId: handoff.handoffId,
            }
          : t.to === "acknowledged_downstream"
          ? { ...(prev.downstreamReceipt as DownstreamReceipt), expectedNextState: "Acknowledged and queued" }
          : prev.downstreamReceipt,
    }));

    setSelectedTransition(null);
    setTransitionInputs({});
    toast({ title: "Handoff updated", description: `${statusDef.label} → ${HANDOFF_STATUS_DEFINITIONS[t.to].label}` });
  };

  return (
    <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-200px)] pr-1">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px]">{typeLabels[handoff.proposalType] || handoff.proposalType}</Badge>
            <Badge variant="outline" className={`text-[10px] ${riskColors[handoff.riskLevel] || ""}`}>{handoff.riskLevel} risk</Badge>
            <Badge variant="outline" className={`text-[10px] font-medium ${statusDef.isBlocking ? "border-yellow-500/30 text-yellow-400" : ""}`}>
              {statusDef.label}
            </Badge>
          </div>
          <h2 className="text-lg font-semibold text-foreground leading-tight">{handoff.proposalTitle}</h2>
          <p className="text-xs text-muted-foreground">
            Approved {format(new Date(handoff.approvedAt), "MMM d, yyyy")} · {handoff.approvalMode.replace(/_/g, " ")} · ID: {handoff.handoffId}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs shrink-0">Close</Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="decision" className="space-y-3">
        <TabsList className="bg-secondary/40 h-8 p-0.5">
          <TabsTrigger value="decision" className="text-[11px] h-7">Decision</TabsTrigger>
          <TabsTrigger value="package" className="text-[11px] h-7">Package</TabsTrigger>
          <TabsTrigger value="validation" className="text-[11px] h-7">Validation</TabsTrigger>
          <TabsTrigger value="actions" className="text-[11px] h-7">Actions</TabsTrigger>
          <TabsTrigger value="audit" className="text-[11px] h-7">Audit</TabsTrigger>
          <TabsTrigger value="downstream" className="text-[11px] h-7">Downstream</TabsTrigger>
        </TabsList>

        {/* Decision Package */}
        <TabsContent value="decision" className="space-y-3">
          <Card className="border-border/30">
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Approved Decision</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-3 text-sm">
              <div><span className="text-xs text-muted-foreground">Governance Rationale</span><p className="text-muted-foreground mt-0.5">{handoff.governanceRationale || "—"}</p></div>
              <div><span className="text-xs text-muted-foreground">Change Summary</span><p className="text-muted-foreground mt-0.5">{handoff.changeSummary || "—"}</p></div>
              <div><span className="text-xs text-muted-foreground">Approvers</span><p className="text-muted-foreground mt-0.5">{handoff.approvers.join(", ") || "—"}</p></div>
            </CardContent>
          </Card>

          {/* Target Workflow Mapping */}
          {workflowMapping && (
            <Card className="border-border/30">
              <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm flex items-center gap-1.5"><ArrowRight className="h-3.5 w-3.5" /> Target Workflow</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">Workflow</span><span className="text-xs font-medium">{workflowMapping.workflowName}</span></div>
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">Subsystem</span><span className="text-xs">{workflowMapping.subsystem}</span></div>
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">Target Area</span><span className="text-xs">{workflowMapping.targetArea}</span></div>
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">Action Type</span><span className="text-xs italic">{workflowMapping.downstreamActionType}</span></div>
              </CardContent>
            </Card>
          )}

          {/* Risk Summary */}
          <Card className="border-border/30">
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Risk Summary</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">Risk Level</span><Badge variant="outline" className={`text-[10px] ${riskColors[handoff.riskLevel] || ""}`}>{handoff.riskLevel}</Badge></div>
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">Impact Scope</span><span className="text-xs capitalize">{handoff.impactScope.replace("_", " ")}</span></div>
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">Approval Mode</span><span className="text-xs">{handoff.approvalMode.replace(/_/g, " ")}</span></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Handoff Package Builder */}
        <TabsContent value="package" className="space-y-3">
          <Card className="border-border/30">
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm flex items-center gap-1.5"><Package className="h-3.5 w-3.5" /> Handoff Package</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {[
                { key: "changeSummary", label: "Change Summary" },
                { key: "changeIntent", label: "Change Intent" },
                { key: "scopeBoundaries", label: "Scope Boundaries" },
                { key: "constraints", label: "Constraints" },
                { key: "riskNotes", label: "Risk Notes" },
                { key: "monitoringRequirements", label: "Monitoring Requirements" },
                { key: "rollbackExpectations", label: "Rollback Expectations" },
                { key: "releaseNotes", label: "Release Notes" },
              ].map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs">{field.label}</Label>
                  <Textarea
                    value={pkg[field.key as keyof typeof pkg]}
                    onChange={(e) => setPkg((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="text-sm min-h-[50px] bg-secondary/20 border-border/30"
                    placeholder={field.label}
                    disabled={statusDef.isTerminal || handoff.handoffStatus === "released"}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validation */}
        <TabsContent value="validation" className="space-y-3">
          <Card className="border-border/30">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                {allValid ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />}
                Validation & Safeguards
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {validationChecks.map((check) => (
                <div key={check.key} className="flex items-center gap-2">
                  {check.status === "pass" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : check.status === "fail" ? (
                    <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-xs flex-1">{check.label}{check.required && <span className="text-destructive ml-0.5">*</span>}</span>
                  <span className="text-[10px] text-muted-foreground">{check.message}</span>
                </div>
              ))}
              {!allValid && (
                <p className="text-[10px] text-yellow-500 mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Release blocked until all required validations pass.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions */}
        <TabsContent value="actions" className="space-y-3">
          <Card className="border-border/30">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-1.5"><Send className="h-3.5 w-3.5" /> Available Actions</CardTitle>
              <p className="text-[10px] text-muted-foreground">Current: {statusDef.label}</p>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {available.map((t) => {
                const isRelease = t.to === "released";
                const blocked = isRelease && !allValid;
                return (
                  <Button
                    key={`${t.from}-${t.to}`}
                    variant={t.to === "cancelled" ? "destructive" : t.to === "released" ? "default" : "outline"}
                    size="sm"
                    className={`w-full justify-start text-xs ${isRelease ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""} ${blocked ? "opacity-50" : ""}`}
                    disabled={blocked}
                    onClick={() => {
                      if (t.requiresInput) {
                        setSelectedTransition(t);
                        setTransitionInputs({});
                      } else {
                        executeTransition(t);
                      }
                    }}
                  >
                    <ArrowRight className="h-3 w-3 mr-1.5" />
                    {t.label}
                    {blocked && <span className="ml-auto text-[9px]">(validation required)</span>}
                  </Button>
                );
              })}
              {available.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No actions available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail */}
        <TabsContent value="audit" className="space-y-3">
          <Card className="border-border/30">
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm flex items-center gap-1.5"><History className="h-3.5 w-3.5" /> Handoff Audit Trail</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4">
              {handoff.auditHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No audit events yet.</p>
              ) : (
                <div className="relative space-y-0">
                  {handoff.auditHistory.map((entry, i) => (
                    <div key={entry.id} className="relative flex gap-3 pb-4">
                      {i < handoff.auditHistory.length - 1 && <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border/30" />}
                      <div className="w-[15px] h-[15px] rounded-full bg-secondary/60 border-2 border-border/50 shrink-0 mt-0.5 relative z-10" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[9px]">{HANDOFF_STATUS_DEFINITIONS[entry.fromStatus].label}</Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                          <Badge variant="outline" className="text-[9px]">{HANDOFF_STATUS_DEFINITIONS[entry.toStatus].label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium text-foreground/80">{entry.actor}</span>
                          {" · "}{format(new Date(entry.timestamp), "MMM d, yyyy HH:mm")}
                        </p>
                        {entry.notes && <p className="text-xs text-muted-foreground/80 mt-1 italic">"{entry.notes}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Downstream */}
        <TabsContent value="downstream" className="space-y-3">
          {handoff.downstreamReceipt ? (
            <Card className="border-border/30">
              <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Downstream Receipt</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">Target Workflow</span><span className="text-xs font-medium">{handoff.downstreamReceipt.targetWorkflow}</span></div>
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">Release Timestamp</span><span className="text-xs">{format(new Date(handoff.downstreamReceipt.releaseTimestamp), "MMM d, yyyy HH:mm")}</span></div>
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">Expected Next State</span><span className="text-xs">{handoff.downstreamReceipt.expectedNextState}</span></div>
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">Receiving Function</span><span className="text-xs">{handoff.downstreamReceipt.ownerFunction}</span></div>
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">Handoff Ref ID</span><span className="text-xs font-mono">{handoff.downstreamReceipt.handoffReferenceId}</span></div>
                <div className="border-t border-border/20 pt-2 mt-2">
                  <span className="text-xs text-muted-foreground">Payload Summary</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{handoff.downstreamReceipt.releasePayloadSummary || "—"}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Send className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p>No downstream receipt yet. Release the handoff to see acknowledgment preview.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Transition Dialog */}
      <Dialog open={!!selectedTransition} onOpenChange={(open) => !open && setSelectedTransition(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedTransition?.label}</DialogTitle>
            <p className="text-xs text-muted-foreground">
              {selectedTransition ? `${HANDOFF_STATUS_DEFINITIONS[selectedTransition.from].label} → ${HANDOFF_STATUS_DEFINITIONS[selectedTransition.to].label}` : ""}
            </p>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {selectedTransition?.inputFields.map((field) => (
              <div key={field.name} className="space-y-1">
                <Label className="text-xs">{field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}</Label>
                {field.type === "textarea" ? (
                  <Textarea
                    value={transitionInputs[field.name] || ""}
                    onChange={(e) => setTransitionInputs((prev) => ({ ...prev, [field.name]: e.target.value }))}
                    className="text-sm min-h-[60px] bg-secondary/20 border-border/30"
                  />
                ) : (
                  <Input
                    value={transitionInputs[field.name] || ""}
                    onChange={(e) => setTransitionInputs((prev) => ({ ...prev, [field.name]: e.target.value }))}
                    className="text-sm bg-secondary/20 border-border/30"
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedTransition(null)}>Cancel</Button>
            <Button
              size="sm"
              disabled={selectedTransition?.inputFields.some((f) => f.required && !transitionInputs[f.name]?.trim())}
              onClick={() => selectedTransition && executeTransition(selectedTransition)}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
