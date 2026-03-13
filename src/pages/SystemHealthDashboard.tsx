import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useOrg } from "@/contexts/OrgContext";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { Activity, TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle, Eye, Database, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const METRIC_LABELS: Record<string, string> = {
  resilience: "Resilience",
  coherence: "Coherence",
  learning_velocity: "Learning Velocity",
  governance_integrity: "Governance Integrity",
  operator_trust: "Operator Trust",
  compounding_strength: "Compounding Strength",
};

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  B: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  C: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  D: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  F: "bg-destructive/20 text-destructive border-destructive/30",
};

const BASIS_CONFIG: Record<string, { icon: typeof Eye; label: string; color: string; description: string }> = {
  observed: { icon: Eye, label: "Observed", color: "text-emerald-400", description: "Based on real operational data" },
  inferred: { icon: HelpCircle, label: "Inferred", color: "text-blue-400", description: "Derived from limited evidence" },
  seeded: { icon: Database, label: "Bootstrap", color: "text-yellow-400", description: "Based on seeded/bootstrap data — discounted" },
  insufficient: { icon: AlertTriangle, label: "Insufficient", color: "text-destructive", description: "Not enough evidence to evaluate" },
};

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "improving") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (trend === "declining") return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = confidence >= 0.7 ? "text-emerald-400" : confidence >= 0.4 ? "text-yellow-400" : "text-destructive";
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${confidence >= 0.7 ? "bg-emerald-500" : confidence >= 0.4 ? "bg-yellow-500" : "bg-destructive"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[10px] font-mono ${color}`}>{pct}%</span>
    </div>
  );
}

function EvidenceBadge({ basis, detail }: { basis: string; detail?: string }) {
  const config = BASIS_CONFIG[basis] || BASIS_CONFIG.insufficient;
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 text-[10px] font-medium ${config.color}`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs font-medium">{config.description}</p>
          {detail && <p className="text-xs text-muted-foreground mt-1">{detail}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function SystemHealthDashboard() {
  const { currentOrg } = useOrg();
  const { metrics, evaluate } = useSystemHealth(currentOrg?.id ?? null);

  const data = metrics.data;
  const metricsList = data?.metrics || [];
  const grade = data?.health_grade || "—";
  const overall = data?.overall_health_score ?? 0;
  const rawScore = data?.raw_score;
  const overallConfidence = data?.overall_confidence;
  const evidenceSummary = data?.evidence_summary;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">System Health</h1>
            <p className="text-sm text-muted-foreground">
              Evidence-based health assessment across all operational dimensions
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => evaluate.mutate()}
            disabled={evaluate.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${evaluate.isPending ? "animate-spin" : ""}`} />
            Evaluate Health
          </Button>
        </div>

        {/* Overall Score */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Overall Health Score</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold">{(overall * 100).toFixed(1)}%</p>
                    {rawScore != null && rawScore !== overall && (
                      <span className="text-sm text-muted-foreground">
                        (raw: {(rawScore * 100).toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Badge className={`text-lg px-4 py-1 ${GRADE_COLORS[grade] || ""}`}>
                Grade {grade}
              </Badge>
            </div>
            <Progress value={overall * 100} className="mt-4 h-3" />

            {/* Confidence & Evidence Summary */}
            {(overallConfidence != null || evidenceSummary) && (
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                {overallConfidence != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Confidence:</span>
                    <span className={`font-mono font-medium ${
                      overallConfidence >= 0.7 ? "text-emerald-400" : 
                      overallConfidence >= 0.4 ? "text-yellow-400" : "text-destructive"
                    }`}>
                      {(overallConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
                {evidenceSummary && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {evidenceSummary.observed > 0 && (
                      <span className="text-emerald-400">● {evidenceSummary.observed} observed</span>
                    )}
                    {evidenceSummary.inferred > 0 && (
                      <span className="text-blue-400">● {evidenceSummary.inferred} inferred</span>
                    )}
                    {evidenceSummary.seeded > 0 && (
                      <span className="text-yellow-400">● {evidenceSummary.seeded} bootstrap</span>
                    )}
                    {evidenceSummary.insufficient > 0 && (
                      <span className="text-destructive">● {evidenceSummary.insufficient} insufficient</span>
                    )}
                  </div>
                )}
                {evidenceSummary && !evidenceSummary.trustworthy && (
                  <div className="flex items-center gap-1 text-xs text-yellow-400">
                    <AlertTriangle className="h-3 w-3" />
                    Score not yet fully trustworthy — more operational evidence needed
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metric Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metricsList.map((m: any) => {
            const val = Number(m.metric_value ?? m.value ?? 0);
            const trend = m.metric_trend ?? m.trend ?? "stable";
            const type = m.metric_type ?? m.type;
            const basis = m.evidence_basis;
            const confidence = m.confidence;
            const detail = m.evidence_detail;
            const isInsufficient = basis === "insufficient";

            return (
              <Card key={type} className={isInsufficient ? "opacity-70 border-dashed" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {METRIC_LABELS[type] || type}
                      {basis && <EvidenceBadge basis={basis} detail={detail} />}
                    </span>
                    <TrendIcon trend={trend} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isInsufficient ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">Insufficient evidence</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold">{(val * 100).toFixed(1)}%</p>
                      <Progress value={val * 100} className="mt-2 h-2" />
                    </>
                  )}
                  {confidence != null && <ConfidenceBar confidence={confidence} />}
                  <p className="text-xs text-muted-foreground mt-1 capitalize">{trend}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {metricsList.length === 0 && !metrics.isLoading && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No health data yet. Click "Evaluate Health" to generate the first assessment.
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
