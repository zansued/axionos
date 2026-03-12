import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  type WorkflowAuditEntry,
  STATE_DEFINITIONS,
  ROLE_LABELS,
} from "@/lib/governance-workflow-state-machine";
import { format } from "date-fns";
import { History, ArrowRight } from "lucide-react";

interface Props {
  auditTrail: WorkflowAuditEntry[];
}

export function GovernanceAuditTimeline({ auditTrail }: Props) {
  if (auditTrail.length === 0) {
    return (
      <Card className="border-border/30">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No governance activity recorded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/30">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" />
          Governance Audit Trail ({auditTrail.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="relative space-y-0">
          {auditTrail.map((entry, i) => {
            const fromDef = STATE_DEFINITIONS[entry.fromState];
            const toDef = STATE_DEFINITIONS[entry.toState];
            const isLast = i === auditTrail.length - 1;

            return (
              <div key={entry.id} className="relative flex gap-3 pb-4">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border/30" />
                )}
                {/* Dot */}
                <div className="w-[15px] h-[15px] rounded-full bg-secondary/60 border-2 border-border/50 shrink-0 mt-0.5 relative z-10" />
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[9px] font-normal">{fromDef.label}</Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                    <Badge variant="outline" className="text-[9px] font-normal">{toDef.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-medium text-foreground/80">{entry.actor}</span>
                    {" · "}
                    <span>{ROLE_LABELS[entry.actorRole]}</span>
                    {" · "}
                    <span>{format(new Date(entry.timestamp), "MMM d, yyyy HH:mm")}</span>
                  </p>
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground/80 mt-1 italic">"{entry.notes}"</p>
                  )}
                  {Object.keys(entry.metadata).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {Object.entries(entry.metadata).slice(0, 3).map(([k, v]) => (
                        <span key={k} className="text-[9px] text-muted-foreground bg-secondary/40 rounded px-1.5 py-0.5">
                          {k.replace(/_/g, " ")}: {v.length > 40 ? v.slice(0, 40) + "…" : v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
