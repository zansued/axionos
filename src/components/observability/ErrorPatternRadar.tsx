import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useErrorPatterns,
  type ErrorPatternData,
  type StrategyEffectivenessData,
  type PreventionCandidateData,
} from "@/hooks/useErrorPatterns";
import {
  AlertTriangle, Bug, Shield, TrendingUp, Zap, Target,
  CheckCircle2, XCircle, Loader2,
} from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-500/20 text-orange-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  low: "bg-muted text-muted-foreground",
};

const REPAIRABILITY_ICON: Record<string, typeof CheckCircle2> = {
  high: CheckCircle2,
  medium: Zap,
  low: XCircle,
  unknown: AlertTriangle,
};

function PatternRow({ pattern }: { pattern: ErrorPatternData }) {
  const Icon = REPAIRABILITY_ICON[pattern.repairability] || AlertTriangle;
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{pattern.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-[10px]">{pattern.error_category}</Badge>
            <Badge className={`text-[10px] ${SEVERITY_COLORS[pattern.severity] || ""}`}>
              {pattern.severity}
            </Badge>
            {pattern.affected_stages.slice(0, 2).map((s) => (
              <span key={s} className="text-[10px] text-muted-foreground">{s}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold">{pattern.frequency}×</p>
        <p className="text-[10px] text-muted-foreground">
          {pattern.success_rate.toFixed(0)}% fix rate
        </p>
      </div>
    </div>
  );
}

function StrategyRow({ s }: { s: StrategyEffectivenessData }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{s.repair_strategy.replace(/_/g, " ")}</p>
        <p className="text-[10px] text-muted-foreground">{s.error_category} · {s.attempts_total} attempts</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Progress value={s.success_rate} className="w-16 h-1.5" />
        <span className="text-xs font-mono w-10 text-right">{s.success_rate.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function CandidateRow({ c }: { c: PreventionCandidateData }) {
  return (
    <div className="flex items-start gap-2 py-2">
      <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-xs font-medium">{c.description}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{c.proposed_action}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-[10px]">{c.rule_type.replace(/_/g, " ")}</Badge>
          <span className="text-[10px] text-muted-foreground">{c.expected_impact}</span>
        </div>
      </div>
    </div>
  );
}

export function ErrorPatternRadar() {
  const { patterns, effectiveness, candidates, isLoading, error } = useErrorPatterns();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasData = patterns.length > 0 || effectiveness.length > 0 || candidates.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Error Pattern Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Target className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              No error patterns detected yet.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Patterns emerge after repair evidence is collected from pipeline runs.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Summary stats
  const totalPatterns = patterns.length;
  const criticalPatterns = patterns.filter((p) => p.severity === "critical" || p.severity === "high").length;
  const avgSuccessRate = effectiveness.length > 0
    ? effectiveness.reduce((a, e) => a + e.success_rate, 0) / effectiveness.length
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Patterns</p>
            <p className="text-xl font-bold">{totalPatterns}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Critical</p>
            <p className="text-xl font-bold text-destructive">{criticalPatterns}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Fix Rate</p>
            <p className="text-xl font-bold">{avgSuccessRate.toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prevention</p>
            <p className="text-xl font-bold text-primary">{candidates.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Patterns */}
      {patterns.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Top Recurring Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[280px]">
              <div className="divide-y divide-border">
                {patterns.slice(0, 10).map((p) => (
                  <PatternRow key={p.id} pattern={p} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Strategy Effectiveness */}
      {effectiveness.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Strategy Effectiveness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px]">
              <div className="divide-y divide-border">
                {effectiveness.slice(0, 8).map((s) => (
                  <StrategyRow key={s.id} s={s} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Prevention Candidates */}
      {candidates.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Prevention Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[200px]">
              <div className="divide-y divide-border">
                {candidates.slice(0, 6).map((c) => (
                  <CandidateRow key={c.id} c={c} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
