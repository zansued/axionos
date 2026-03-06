import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Ban,
  DollarSign, Clock, Cpu, Target, TrendingUp, Zap,
  ArrowRight, RotateCcw, CheckCircle2, XCircle, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types (mirrors backend contract) ───

interface RiskFlag {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
}

export interface SimulationReport {
  initiative_id: string;
  technical_feasibility: "high" | "medium" | "low";
  market_clarity: "high" | "medium" | "low";
  execution_complexity: "simple" | "moderate" | "complex";
  estimated_token_range: { min: number; max: number };
  estimated_cost_range: { min_usd: number; max_usd: number };
  estimated_time_minutes: { min: number; max: number };
  recommended_generation_depth: string;
  recommended_stack?: {
    frontend?: string;
    backend?: string;
    database?: string;
    deployment?: string;
  };
  risk_flags: RiskFlag[];
  pipeline_recommendation: "go" | "refine" | "block";
  recommendation_reason: string;
  suggested_refinements?: string[];
}

// ─── Recommendation Banner ───

export function RecommendationBanner({
  recommendation,
  reason,
}: {
  recommendation: "go" | "refine" | "block";
  reason: string;
}) {
  const config = {
    go: {
      icon: CheckCircle2,
      label: "Ready to Go",
      bg: "bg-emerald-500/10 border-emerald-500/30",
      text: "text-emerald-600 dark:text-emerald-400",
      badge: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    },
    refine: {
      icon: AlertTriangle,
      label: "Refinement Suggested",
      bg: "bg-amber-500/10 border-amber-500/30",
      text: "text-amber-600 dark:text-amber-400",
      badge: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    },
    block: {
      icon: XCircle,
      label: "Blocked",
      bg: "bg-red-500/10 border-red-500/30",
      text: "text-red-600 dark:text-red-400",
      badge: "bg-red-500/20 text-red-700 dark:text-red-300",
    },
  }[recommendation];

  const Icon = config.icon;

  return (
    <div className={cn("rounded-lg border p-4 space-y-2", config.bg)}>
      <div className="flex items-center gap-2">
        <Icon className={cn("h-5 w-5", config.text)} />
        <span className={cn("font-semibold text-sm", config.text)}>{config.label}</span>
        <Badge className={cn("text-[10px] ml-auto", config.badge)}>{recommendation.toUpperCase()}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{reason}</p>
    </div>
  );
}

// ─── Simulation Summary Card ───

export function SimulationSummaryCard({
  report,
}: {
  report: SimulationReport;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <MetricTile
        icon={<Cpu className="h-3.5 w-3.5" />}
        label="Feasibility"
        value={report.technical_feasibility}
        color={levelColor(report.technical_feasibility)}
      />
      <MetricTile
        icon={<Target className="h-3.5 w-3.5" />}
        label="Market Clarity"
        value={report.market_clarity}
        color={levelColor(report.market_clarity)}
      />
      <MetricTile
        icon={<Zap className="h-3.5 w-3.5" />}
        label="Complexity"
        value={report.execution_complexity}
        color={complexityColor(report.execution_complexity)}
      />
    </div>
  );
}

// ─── Cost Estimate Card ───

export function CostEstimateCard({
  report,
}: {
  report: SimulationReport;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <MetricTile
        icon={<DollarSign className="h-3.5 w-3.5" />}
        label="Est. Cost"
        value={`$${report.estimated_cost_range.min_usd.toFixed(2)} – $${report.estimated_cost_range.max_usd.toFixed(2)}`}
        color="text-foreground"
      />
      <MetricTile
        icon={<Clock className="h-3.5 w-3.5" />}
        label="Est. Time"
        value={`${report.estimated_time_minutes.min} – ${report.estimated_time_minutes.max} min`}
        color="text-foreground"
      />
      <MetricTile
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        label="Rec. Depth"
        value={report.recommended_generation_depth}
        color="text-foreground"
      />
    </div>
  );
}

// ─── Risk Flags Panel ───

export function RiskFlagsPanel({ flags }: { flags: RiskFlag[] }) {
  if (flags.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldAlert className="h-3 w-3" /> Risk Analysis ({flags.length})
      </div>
      <div className="space-y-1">
        {flags.map((flag, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
              flag.severity === "critical" && "border-red-500/40 bg-red-500/5",
              flag.severity === "high" && "border-orange-500/40 bg-orange-500/5",
              flag.severity === "medium" && "border-amber-500/40 bg-amber-500/5",
              flag.severity === "low" && "border-border bg-muted/30",
            )}
          >
            {flag.severity === "critical" ? (
              <Ban className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
            ) : flag.severity === "high" ? (
              <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="text-[9px] px-1 h-4">
                  {flag.type.replace(/_/g, " ")}
                </Badge>
                <Badge
                  className={cn(
                    "text-[9px] px-1 h-4",
                    flag.severity === "critical" && "bg-red-500/20 text-red-700 dark:text-red-300",
                    flag.severity === "high" && "bg-orange-500/20 text-orange-700 dark:text-orange-300",
                    flag.severity === "medium" && "bg-amber-500/20 text-amber-700 dark:text-amber-300",
                    flag.severity === "low" && "bg-muted text-muted-foreground",
                  )}
                >
                  {flag.severity}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-0.5">{flag.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Refinement Suggestions ───

export function RefinementSuggestions({ suggestions }: { suggestions?: string[] }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 space-y-1.5">
      <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Suggested Refinements</p>
      <ul className="space-y-1">
        {suggestions.map((s, i) => (
          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
            <span className="text-amber-500 mt-0.5">•</span>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Simulation Loading State ───

export function SimulationLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
        <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-sm font-medium">Running Simulation...</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          AxionOS is analyzing technical feasibility, estimating costs, detecting risks, and generating a pipeline recommendation.
        </p>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 font-mono">
        <Loader2 className="h-3 w-3 animate-spin" />
        Pre-execution simulation in progress...
      </div>
    </div>
  );
}

// ─── Full Simulation View (composed) ───

interface SimulationViewProps {
  report: SimulationReport;
  isSimulating: boolean;
  onProceed: () => void;
  onRefine: () => void;
  onBack: () => void;
  isPending: boolean;
}

export function SimulationView({
  report,
  isSimulating,
  onProceed,
  onRefine,
  onBack,
  isPending,
}: SimulationViewProps) {
  if (isSimulating) return <SimulationLoading />;

  return (
    <div className="space-y-4">
      <RecommendationBanner
        recommendation={report.pipeline_recommendation}
        reason={report.recommendation_reason}
      />

      <SimulationSummaryCard report={report} />
      <CostEstimateCard report={report} />
      <RiskFlagsPanel flags={report.risk_flags} />
      <RefinementSuggestions suggestions={report.suggested_refinements} />

      {/* Recommended stack */}
      {report.recommended_stack && Object.values(report.recommended_stack).some(Boolean) && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Recommended Stack</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(report.recommended_stack).filter(([, v]) => v).map(([k, v]) => (
              <Badge key={k} variant="secondary" className="text-[10px]">
                {k}: {v}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> Back
        </Button>
        {report.pipeline_recommendation === "block" ? (
          <Button size="sm" variant="outline" onClick={onRefine} className="flex-1 gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Refine Initiative
          </Button>
        ) : report.pipeline_recommendation === "refine" ? (
          <>
            <Button size="sm" variant="outline" onClick={onRefine} className="gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Refine
            </Button>
            <Button size="sm" onClick={onProceed} disabled={isPending} className="flex-1 gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" /> Proceed Anyway
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={onProceed} disabled={isPending} className="flex-1 gap-1.5">
            <ArrowRight className="h-3.5 w-3.5" /> Start Pipeline
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ───

function MetricTile({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 space-y-1">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        {icon} {label}
      </div>
      <p className={cn("text-sm font-semibold capitalize", color)}>{value}</p>
    </div>
  );
}

function levelColor(level: "high" | "medium" | "low") {
  return level === "high"
    ? "text-emerald-600 dark:text-emerald-400"
    : level === "medium"
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";
}

function complexityColor(level: "simple" | "moderate" | "complex") {
  return level === "simple"
    ? "text-emerald-600 dark:text-emerald-400"
    : level === "moderate"
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";
}
