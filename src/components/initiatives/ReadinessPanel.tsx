/**
 * ReadinessPanel — Phase 4
 *
 * Displays readiness evaluation for an initiative.
 * Shows: score, blockers, warnings, passed checks, and next action.
 * All data is derived from the Readiness Engine — no hardcoded percentages.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from "@/components/ui/tooltip";
import {
  CheckCircle2, XCircle, AlertTriangle, Info, Zap, Shield,
} from "lucide-react";
import { useInitiativeReadiness } from "@/hooks/useInitiativeReadiness";
import { formatReadiness, readinessSummaryLabel, type ReadinessCheck } from "@/lib/readiness";

interface ReadinessPanelProps {
  initiative: any;
}

function CheckItem({ check }: { check: ReadinessCheck }) {
  const Icon = check.status === "pass"
    ? CheckCircle2
    : check.status === "fail"
      ? XCircle
      : AlertTriangle;

  const color = check.status === "pass"
    ? "text-success"
    : check.status === "fail"
      ? "text-destructive"
      : "text-warning";

  return (
    <div className="flex items-start gap-2 py-1">
      <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium">{check.label}</span>
          {!check.required && (
            <Badge variant="outline" className="text-[7px] px-1 py-0 border-border text-muted-foreground font-normal">
              optional
            </Badge>
          )}
        </div>
        {check.status !== "pass" && check.explanation && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{check.explanation}</p>
        )}
        {check.status !== "pass" && check.action && (
          <p className="text-[10px] text-primary/80 mt-0.5 flex items-center gap-1">
            <Zap className="h-2.5 w-2.5" />
            {check.action}
          </p>
        )}
      </div>
    </div>
  );
}

export function ReadinessPanel({ initiative }: ReadinessPanelProps) {
  const result = useInitiativeReadiness(initiative);

  if (!result) return null;

  const scorePercent = Math.round(result.readinessScore * 100);
  const summaryLabel = readinessSummaryLabel(result);

  const statusColor = result.canProceed
    ? result.readinessScore === 1 ? "text-success" : "text-warning"
    : "text-destructive";

  const progressColor = result.canProceed
    ? result.readinessScore === 1 ? "bg-success" : "bg-warning"
    : "bg-destructive";

  return (
    <Card className="border-border/40 bg-card/80">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Readiness
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 font-mono ${statusColor} border-current/20`}
            >
              {formatReadiness(result.readinessScore)}
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                    {result.stage}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  Evaluated at {new Date(result.evaluatedAt).toLocaleTimeString()}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className={`font-medium ${statusColor}`}>{summaryLabel}</span>
            <span className="text-muted-foreground">
              {result.passedChecks.length}/{result.allChecks.length} checks
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progressColor}`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </div>

        {/* Blockers */}
        {result.blockers.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <XCircle className="h-3 w-3 text-destructive" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive">
                Blockers ({result.blockers.length})
              </span>
            </div>
            <div className="space-y-0.5 pl-1">
              {result.blockers.map((c) => <CheckItem key={c.key} check={c} />)}
            </div>
          </div>
        )}

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-3 w-3 text-warning" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-warning">
                Warnings ({result.warnings.length})
              </span>
            </div>
            <div className="space-y-0.5 pl-1">
              {result.warnings.map((c) => <CheckItem key={c.key} check={c} />)}
            </div>
          </div>
        )}

        {/* Passed checks (collapsed by default) */}
        {result.passedChecks.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="h-3 w-3 text-success" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-success">
                Passed ({result.passedChecks.length})
              </span>
            </div>
            <div className="space-y-0.5 pl-1">
              {result.passedChecks.map((c) => (
                <div key={c.key} className="flex items-center gap-2 py-0.5">
                  <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next action */}
        {result.nextRequiredAction && (
          <>
            <Separator />
            <div className="flex items-center gap-2 text-xs">
              <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground mr-1">Next:</span>
                {result.nextRequiredAction}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
