import { cn } from "@/lib/utils";
import {
  type WorkflowState,
  STATE_DEFINITIONS,
  STATE_PROGRESSION,
  type WorkflowAuditEntry,
} from "@/lib/governance-workflow-state-machine";
import { CheckCircle2, Circle, AlertTriangle, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  currentState: WorkflowState;
  auditTrail: WorkflowAuditEntry[];
}

const categoryColors: Record<string, string> = {
  initial: "text-muted-foreground",
  triage: "text-blue-400",
  evidence: "text-purple-400",
  review: "text-yellow-400",
  decision: "text-emerald-400",
  terminal: "text-muted-foreground/60",
};

export function WorkflowStateTimeline({ currentState, auditTrail }: Props) {
  const currentDef = STATE_DEFINITIONS[currentState];
  const visitedStates = new Set(auditTrail.map((e) => e.toState));
  visitedStates.add(currentState);

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-medium text-muted-foreground mb-3">Lifecycle Progress</h3>
      <div className="flex items-start gap-0.5 overflow-x-auto pb-2">
        <TooltipProvider delayDuration={200}>
          {STATE_PROGRESSION.map((group, gi) => (
            <div key={group.category} className="flex items-start gap-0.5">
              {gi > 0 && (
                <div className="h-px w-3 bg-border/40 mt-4 shrink-0" />
              )}
              <div className="flex flex-col items-center gap-1 min-w-0">
                <span className={cn("text-[9px] font-medium uppercase tracking-wider", categoryColors[group.category])}>
                  {group.label}
                </span>
                <div className="flex gap-0.5">
                  {group.states.map((stateKey) => {
                    const def = STATE_DEFINITIONS[stateKey];
                    const isCurrent = stateKey === currentState;
                    const isVisited = visitedStates.has(stateKey) && !isCurrent;
                    const isBlocking = def.isBlocking && isCurrent;
                    const isTerminal = def.isTerminal;

                    return (
                      <Tooltip key={stateKey}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-md transition-colors cursor-default min-w-[52px]",
                              isCurrent && "bg-primary/10 ring-1 ring-primary/30",
                              isVisited && "opacity-60",
                              isBlocking && "bg-yellow-500/10 ring-1 ring-yellow-500/30"
                            )}
                          >
                            {isCurrent ? (
                              isBlocking ? (
                                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                              ) : (
                                <Circle className="h-3.5 w-3.5 text-primary fill-primary" />
                              )
                            ) : isVisited ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/60" />
                            ) : isTerminal ? (
                              <Lock className="h-3.5 w-3.5 text-muted-foreground/30" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />
                            )}
                            <span className={cn(
                              "text-[9px] text-center leading-tight",
                              isCurrent ? "text-foreground font-medium" : "text-muted-foreground/60"
                            )}>
                              {def.label}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[200px] text-xs">
                          <p className="font-medium">{def.label}</p>
                          <p className="text-muted-foreground mt-0.5">{def.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
}
