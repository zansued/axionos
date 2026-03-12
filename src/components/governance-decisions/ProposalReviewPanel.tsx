import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { GovernanceProposal, ProposalSource, RiskLevel } from "@/hooks/useGovernanceDecisionsData";
import { useGovernanceDecisionAction } from "@/hooks/useGovernanceDecisionsData";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  CheckCircle2, XCircle, Clock, PenLine, ChevronDown, Shield, AlertTriangle,
  ArrowRight, FileText, Activity, Zap, RotateCcw, Scale,
} from "lucide-react";

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
};

export function ProposalReviewPanel({ proposal, onClose }: Props) {
  const [rationale, setRationale] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const { toast } = useToast();
  const decisionAction = useGovernanceDecisionAction();

  const handleDecision = async (action: "approve" | "reject" | "defer" | "request_revision") => {
    if (!rationale.trim()) {
      toast({ title: "Rationale required", description: "Provide a decision rationale before proceeding.", variant: "destructive" });
      return;
    }
    setActiveAction(action);
    try {
      await decisionAction.mutateAsync({
        proposalId: proposal.id,
        source: proposal.source,
        action,
        rationale,
      });
      toast({ title: "Decision recorded", description: `Proposal ${action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "defer" ? "deferred" : "sent for revision"}.` });
      setRationale("");
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setActiveAction(null);
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
          </div>
          <h2 className="text-lg font-semibold text-foreground leading-tight">{proposal.title}</h2>
          <p className="text-xs text-muted-foreground">
            Created {format(new Date(proposal.createdAt), "MMM d, yyyy 'at' HH:mm")} · {proposal.originatingSubsystem}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs shrink-0">Close</Button>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="summary" className="space-y-3">
        <TabsList className="bg-secondary/40 h-8 p-0.5">
          <TabsTrigger value="summary" className="text-[11px] h-7">Summary</TabsTrigger>
          <TabsTrigger value="evidence" className="text-[11px] h-7">Evidence</TabsTrigger>
          <TabsTrigger value="risk" className="text-[11px] h-7">Risk & Impact</TabsTrigger>
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

          {/* Confidence */}
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

          {/* Approval Requirements */}
          <Card className="border-border/30">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Approval Requirements</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {proposal.approvalRequirements.map((req, i) => (
                <div key={i} className="flex items-center gap-2">
                  {req.met
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    : <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  }
                  <span className="text-xs">{req.label}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{req.detail}</span>
                </div>
              ))}
            </CardContent>
          </Card>
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

      {/* Decision Action Panel */}
      <Card className="border-border/30 sticky bottom-0">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-1.5"><Scale className="h-3.5 w-3.5" /> Decision</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <Textarea
            placeholder="Decision rationale (required)..."
            value={rationale}
            onChange={e => setRationale(e.target.value)}
            className="text-sm min-h-[60px] bg-secondary/20 border-border/30"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              onClick={() => handleDecision("approve")}
              disabled={decisionAction.isPending}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              {activeAction === "approve" ? "Approving…" : "Approve"}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="text-xs"
              onClick={() => handleDecision("reject")}
              disabled={decisionAction.isPending}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              {activeAction === "reject" ? "Rejecting…" : "Reject"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => handleDecision("defer")}
              disabled={decisionAction.isPending}
            >
              <Clock className="h-3.5 w-3.5 mr-1" />
              {activeAction === "defer" ? "Deferring…" : "Defer"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => handleDecision("request_revision")}
              disabled={decisionAction.isPending}
            >
              <PenLine className="h-3.5 w-3.5 mr-1" />
              {activeAction === "request_revision" ? "Sending…" : "Request Revision"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
