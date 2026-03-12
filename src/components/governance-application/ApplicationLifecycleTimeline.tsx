import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimelineEvent } from "@/lib/governance-change-application-types";
import { format } from "date-fns";
import { GitCommit } from "lucide-react";

interface Props { events: TimelineEvent[] }

const statusColors: Record<string, string> = {
  released: "bg-blue-500",
  accepted: "bg-blue-400",
  started: "bg-cyan-500",
  in_progress: "bg-cyan-400",
  validating: "bg-amber-500",
  stable: "bg-emerald-500",
  completed: "bg-emerald-600",
  drift: "bg-orange-500",
  rollback: "bg-red-400",
  rolled_back: "bg-red-500",
  blocked: "bg-destructive",
};

export function ApplicationLifecycleTimeline({ events }: Props) {
  return (
    <Card className="border-border/30 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitCommit className="h-4 w-4 text-primary" /> Application Lifecycle
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6 space-y-4">
          <div className="absolute left-[11px] top-1 bottom-1 w-px bg-border/50" />
          {events.map((ev, i) => (
            <div key={i} className="relative flex items-start gap-3">
              <div className={`absolute left-[-13px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background ${statusColors[ev.status] || "bg-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-foreground">{ev.eventType.replace(/_/g, " ")}</span>
                  <span className="text-[10px] text-muted-foreground">by {ev.actor}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{ev.summary}</p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{format(new Date(ev.timestamp), "MMM d HH:mm")}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
