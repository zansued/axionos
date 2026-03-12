import { AppLayout } from "@/components/AppLayout";
import { useGovernanceInsights, ProposalCounts, FrictionPattern } from "@/hooks/useGovernanceInsights";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield, AlertTriangle, CheckCircle2, Clock, TrendingUp,
  Activity, Eye, XCircle, ChevronRight, Layers, Zap, Target,
  BookOpen, Settings2, Bot, Gauge,
} from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// ── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ title, value, subtitle, icon: Icon, variant = "default" }: {
  title: string; value: number | string; subtitle?: string;
  icon: React.ElementType; variant?: "default" | "warning" | "destructive" | "success";
}) {
  const colors = {
    default: "text-primary",
    warning: "text-warning",
    destructive: "text-destructive",
    success: "text-success",
  };
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
            <p className={`text-2xl font-bold ${colors[variant]}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-md bg-secondary ${colors[variant]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Proposal Section ─────────────────────────────────────────────────────────

function ProposalSection({ title, icon: Icon, data, color }: {
  title: string; icon: React.ElementType; data: ProposalCounts; color: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (data.total === 0) {
    return (
      <Card className="border-border/30 opacity-60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Badge variant="secondary" className="ml-auto text-xs">No proposals</Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card className="border-border/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <div className="ml-auto flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{data.total} total</Badge>
                {data.proposed > 0 && <Badge className="text-xs bg-warning/20 text-warning border-warning/30">{data.proposed} pending</Badge>}
                {data.highSeverity > 0 && <Badge variant="destructive" className="text-xs">{data.highSeverity} high sev</Badge>}
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Status breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat label="Proposed" value={data.proposed} color="text-warning" />
              <MiniStat label="Under Review" value={data.under_review} color="text-info" />
              <MiniStat label="Accepted" value={data.accepted} color="text-success" />
              <MiniStat label="Rejected" value={data.rejected} color="text-destructive" />
            </div>

            {/* Type breakdown */}
            {Object.keys(data.byType).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">By Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(data.byType).map(([type, count]) => (
                    <Badge key={type} variant="secondary" className="text-xs font-mono">
                      {type.replace(/_/g, " ")}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Severity breakdown */}
            {Object.keys(data.bySeverity).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">By Severity</p>
                <div className="flex gap-2">
                  {Object.entries(data.bySeverity).map(([sev, count]) => (
                    <SeverityBadge key={sev} severity={sev} count={count as number} />
                  ))}
                </div>
              </div>
            )}

            {/* Recent proposals */}
            {data.recent.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Recent Proposals</p>
                <div className="space-y-2">
                  {data.recent.map((p: any, i: number) => (
                    <ProposalRow key={p.id || i} proposal={p} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-secondary/50 rounded-md p-2 text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}

function SeverityBadge({ severity, count }: { severity: string; count: number }) {
  const colors: Record<string, string> = {
    critical: "bg-destructive/20 text-destructive border-destructive/30",
    high: "bg-warning/20 text-warning border-warning/30",
    medium: "bg-info/20 text-info border-info/30",
    low: "bg-muted text-muted-foreground",
    info: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={`text-xs ${colors[severity] || colors.info}`}>
      {severity}: {count}
    </Badge>
  );
}

function ProposalRow({ proposal }: { proposal: any }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">
          {proposal.recommendation || proposal.evidence_summary || proposal.rationale || "Proposal"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="secondary" className="text-[10px]">
            {(proposal.proposal_type || "unknown").replace(/_/g, " ")}
          </Badge>
          <SeverityBadge severity={proposal.severity || "medium"} count={0} />
          {proposal.confidence != null && (
            <span className="text-[10px] text-muted-foreground">
              conf: {(proposal.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
      <Badge variant="outline" className="text-[10px] shrink-0">
        {(proposal.review_status || "proposed").replace(/_/g, " ")}
      </Badge>
    </div>
  );
}

// ── Friction Pattern Card ────────────────────────────────────────────────────

function FrictionCard({ pattern }: { pattern: FrictionPattern }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">{pattern.summary}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px]">{pattern.stage}</Badge>
              <SeverityBadge severity={pattern.severity} count={0} />
              <span className="text-[10px] text-muted-foreground">{pattern.count}x occurrences</span>
            </div>
          </div>
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-7 mt-2 p-3 rounded-md bg-card border border-border/50 space-y-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Type:</span> {pattern.type.replace(/_/g, " ")}
          </p>
          {pattern.linkedActionIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Linked Actions:</span> {pattern.linkedActionIds.length} action(s)
            </p>
          )}
          {pattern.linkedProposalIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Linked Proposals:</span> {pattern.linkedProposalIds.length} proposal(s)
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Empty / Loading / Error States ───────────────────────────────────────────

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-border/30">
      <CardContent className="p-12 text-center">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Governance Insights Yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Governance insights will appear as the system generates tuning proposals,
          processes learning signals, and tracks approval patterns. Data may be partial during early operation.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function GovernanceInsights() {
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const filters = {
    ...(stageFilter !== "all" ? { stage: stageFilter } : {}),
    ...(severityFilter !== "all" ? { severity: severityFilter } : {}),
  };

  const { data, isLoading, isError } = useGovernanceInsights(
    Object.keys(filters).length > 0 ? filters : undefined
  );

  const totalProposals = data
    ? data.canonEvolution.total + data.policyTuning.total + data.agentSelectionTuning.total + data.readinessTuning.total
    : 0;
  const pendingReview = data
    ? data.canonEvolution.proposed + data.canonEvolution.under_review
      + data.policyTuning.proposed + data.policyTuning.under_review
      + data.agentSelectionTuning.proposed + data.agentSelectionTuning.under_review
      + data.readinessTuning.proposed + data.readinessTuning.under_review
    : 0;
  const totalHighSeverity = data
    ? data.canonEvolution.highSeverity + data.policyTuning.highSeverity
      + data.agentSelectionTuning.highSeverity + data.readinessTuning.highSeverity
    : 0;

  const isEmpty = data && totalProposals === 0 && data.learningSignals.total === 0 && data.approvalBurden.total === 0;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Governance Insights
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Strategic governance intelligence — friction, proposals, risk clusters, and review priorities.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="discovery">Discovery</SelectItem>
                <SelectItem value="architecture">Architecture</SelectItem>
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="validation">Validation</SelectItem>
                <SelectItem value="deploy">Deploy</SelectItem>
                <SelectItem value="runtime">Runtime</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading && <LoadingState />}
        {isError && (
          <Card className="border-destructive/30">
            <CardContent className="p-6 text-center">
              <XCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
              <p className="text-sm text-destructive">Failed to load governance insights. Data may be partially available.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && isEmpty && <EmptyState />}

        {data && !isEmpty && (
          <>
            {/* ── Summary Cards ────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard
                title="Active Proposals"
                value={totalProposals}
                subtitle={`${pendingReview} pending review`}
                icon={Layers}
                variant={pendingReview > 0 ? "warning" : "default"}
              />
              <SummaryCard
                title="Approval Burden"
                value={data.approvalBurden.pending}
                subtitle={`${data.approvalBurden.rejected} rejected · ${data.approvalBurden.expired} expired`}
                icon={Clock}
                variant={data.approvalBurden.pending > 5 ? "warning" : "default"}
              />
              <SummaryCard
                title="Blocked Actions"
                value={data.blockedActions.total}
                subtitle={`${data.blockedActions.highRisk} high-risk`}
                icon={AlertTriangle}
                variant={data.blockedActions.highRisk > 0 ? "destructive" : "default"}
              />
              <SummaryCard
                title="High-Sev Proposals"
                value={totalHighSeverity}
                subtitle="Critical or high severity"
                icon={Zap}
                variant={totalHighSeverity > 0 ? "destructive" : "success"}
              />
              <SummaryCard
                title="Learning Signals"
                value={data.learningSignals.total}
                subtitle={`${data.learningSignals.highSeverity} high severity`}
                icon={Activity}
                variant={data.learningSignals.highSeverity > 0 ? "warning" : "default"}
              />
              <SummaryCard
                title="High-Conf Proposals"
                value={
                  data.canonEvolution.highConfidence + data.policyTuning.highConfidence
                  + data.agentSelectionTuning.highConfidence + data.readinessTuning.highConfidence
                }
                subtitle="≥70% confidence"
                icon={Target}
              />
              <SummaryCard
                title="Friction Patterns"
                value={data.frictionPatterns.length}
                subtitle="Repeated governance friction"
                icon={TrendingUp}
                variant={data.frictionPatterns.length > 3 ? "warning" : "default"}
              />
              <SummaryCard
                title="Review Priority"
                value={pendingReview > 0 ? (totalHighSeverity > 2 ? "High" : pendingReview > 5 ? "Medium" : "Low") : "None"}
                subtitle={pendingReview > 0 ? "Based on severity & volume" : "No pending reviews"}
                icon={Eye}
                variant={totalHighSeverity > 2 ? "destructive" : pendingReview > 5 ? "warning" : "success"}
              />
            </div>

            {/* ── Tabbed Content ───────────────────────────────── */}
            <Tabs defaultValue="proposals" className="space-y-4">
              <TabsList className="bg-secondary/50">
                <TabsTrigger value="proposals" className="text-xs">Tuning Proposals</TabsTrigger>
                <TabsTrigger value="friction" className="text-xs">Friction & Risk</TabsTrigger>
                <TabsTrigger value="signals" className="text-xs">Learning Signals</TabsTrigger>
              </TabsList>

              {/* ── Proposals Tab ──────────────────────────────── */}
              <TabsContent value="proposals" className="space-y-4">
                <ProposalSection
                  title="Canon Evolution Proposals"
                  icon={BookOpen}
                  data={data.canonEvolution}
                  color="text-primary"
                />
                <ProposalSection
                  title="Policy Tuning Proposals"
                  icon={Settings2}
                  data={data.policyTuning}
                  color="text-accent"
                />
                <ProposalSection
                  title="Agent Selection Tuning Proposals"
                  icon={Bot}
                  data={data.agentSelectionTuning}
                  color="text-success"
                />
                <ProposalSection
                  title="Readiness Tuning Proposals"
                  icon={Gauge}
                  data={data.readinessTuning}
                  color="text-warning"
                />
              </TabsContent>

              {/* ── Friction & Risk Tab ────────────────────────── */}
              <TabsContent value="friction" className="space-y-4">
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      Governance Friction Patterns
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Repeated blocked actions, rejected approvals, and escalation clusters.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {data.frictionPatterns.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        No significant friction patterns detected.
                      </p>
                    ) : (
                      data.frictionPatterns.map((p) => <FrictionCard key={p.id} pattern={p} />)
                    )}
                  </CardContent>
                </Card>

                {/* Approval breakdown */}
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-info" />
                      Approval Burden Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-3">
                      <MiniStat label="Pending" value={data.approvalBurden.pending} color="text-warning" />
                      <MiniStat label="Rejected" value={data.approvalBurden.rejected} color="text-destructive" />
                      <MiniStat label="Expired" value={data.approvalBurden.expired} color="text-muted-foreground" />
                      <MiniStat label="Total" value={data.approvalBurden.total} color="text-foreground" />
                    </div>
                  </CardContent>
                </Card>

                {/* Blocked actions */}
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      Blocked High-Risk Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <MiniStat label="Total Blocked" value={data.blockedActions.total} color="text-warning" />
                      <MiniStat label="High Risk" value={data.blockedActions.highRisk} color="text-destructive" />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Signals Tab ────────────────────────────────── */}
              <TabsContent value="signals" className="space-y-4">
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      Learning Signal Summary
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Operational learning signals feeding governance proposals.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                      <MiniStat label="Total Signals" value={data.learningSignals.total} color="text-foreground" />
                      <MiniStat label="High Severity" value={data.learningSignals.highSeverity} color="text-destructive" />
                      <MiniStat label="Distinct Severities" value={Object.keys(data.learningSignals.bySeverity).length} color="text-muted-foreground" />
                    </div>
                    {Object.keys(data.learningSignals.bySeverity).length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 font-medium">By Severity</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(data.learningSignals.bySeverity).map(([sev, count]) => (
                            <SeverityBadge key={sev} severity={sev} count={count} />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}
