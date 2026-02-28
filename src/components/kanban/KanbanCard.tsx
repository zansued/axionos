import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GripVertical, User, DollarSign, Clock, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, TrendingUp } from "lucide-react";
import type { Story, StoryMetrics } from "./types";
import { PRIORITY_MAP } from "./types";

const RISK_CONFIG: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  low: { label: "Baixo", color: "text-success", icon: TrendingUp },
  medium: { label: "Médio", color: "text-info", icon: TrendingUp },
  high: { label: "Alto", color: "text-warning", icon: AlertTriangle },
  critical: { label: "Crítico", color: "text-destructive", icon: AlertTriangle },
};

const VALIDATION_ICON: Record<string, { icon: typeof ShieldCheck; color: string; label: string }> = {
  pass: { icon: ShieldCheck, color: "text-success", label: "Validado" },
  fail: { icon: ShieldX, color: "text-destructive", label: "Falhou" },
  pending: { icon: ShieldAlert, color: "text-warning", label: "Pendente" },
  mixed: { icon: ShieldAlert, color: "text-info", label: "Parcial" },
  none: { icon: ShieldAlert, color: "text-muted-foreground/40", label: "Sem validação" },
};

export function KanbanCard({
  story,
  metrics,
  isDragging,
}: {
  story: Story;
  metrics?: StoryMetrics;
  isDragging?: boolean;
}) {
  const risk = RISK_CONFIG[metrics?.riskLevel || "low"];
  const validation = VALIDATION_ICON[metrics?.validationStatus || "none"];
  const RiskIcon = risk.icon;
  const ValIcon = validation.icon;

  return (
    <div
      className={`rounded-lg border border-border/50 bg-card p-3 space-y-2 cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging ? "shadow-lg shadow-primary/20 ring-1 ring-primary/30 opacity-90" : "hover:border-primary/20"
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium font-display leading-tight truncate">{story.title}</p>
          {story.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{story.description}</p>
          )}
        </div>
      </div>

      {/* Tags row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_MAP[story.priority]?.color}`}>
          {PRIORITY_MAP[story.priority]?.label}
        </Badge>
        {story.agents && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
            <User className="h-2.5 w-2.5" />
            {story.agents.name}
          </Badge>
        )}
      </div>

      {/* Metrics row */}
      {metrics && (metrics.totalExecutions > 0 || metrics.totalSubtasks > 0) && (
        <div className="flex items-center gap-2 pt-1 border-t border-border/30 text-[10px] text-muted-foreground">
          {metrics.cost > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-0.5">
                  <DollarSign className="h-2.5 w-2.5" />
                  {metrics.cost < 0.01 ? "<0.01" : metrics.cost.toFixed(2)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Custo acumulado: ${metrics.cost.toFixed(4)} ({metrics.tokens.toLocaleString()} tokens)
              </TooltipContent>
            </Tooltip>
          )}

          {metrics.avgTime > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {metrics.avgTime < 1000 ? `${Math.round(metrics.avgTime)}ms` : `${(metrics.avgTime / 1000).toFixed(1)}s`}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Tempo médio de execução ({metrics.totalExecutions} execuções)
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`flex items-center gap-0.5 ${risk.color}`}>
                <RiskIcon className="h-2.5 w-2.5" />
                {risk.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Risco: {metrics.failedSubtasks} falhas / {metrics.totalSubtasks} subtasks
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`flex items-center gap-0.5 ${validation.color}`}>
                <ValIcon className="h-2.5 w-2.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Validação: {validation.label}
            </TooltipContent>
          </Tooltip>

          {metrics.totalSubtasks > 0 && (
            <span className="ml-auto font-mono">
              {metrics.completedSubtasks}/{metrics.totalSubtasks}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
