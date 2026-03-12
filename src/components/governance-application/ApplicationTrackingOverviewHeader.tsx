import { Card, CardContent } from "@/components/ui/card";
import type { ApplicationOverview } from "@/lib/governance-change-application-types";
import { Activity, CheckCircle2, Ban, AlertTriangle, Undo2, ShieldAlert, Clock, Flame } from "lucide-react";

interface Props { overview: ApplicationOverview }

const cards = [
  { key: "activeApplications", label: "Active", icon: Activity, color: "text-blue-400" },
  { key: "completedApplications", label: "Completed", icon: CheckCircle2, color: "text-emerald-500" },
  { key: "blockedApplications", label: "Blocked", icon: Ban, color: "text-destructive" },
  { key: "driftAlerts", label: "Drift Alerts", icon: AlertTriangle, color: "text-orange-500" },
  { key: "rolledBack", label: "Rolled Back", icon: Undo2, color: "text-red-500" },
  { key: "governanceAttention", label: "Needs Attention", icon: ShieldAlert, color: "text-purple-400" },
] as const;

export function ApplicationTrackingOverviewHeader({ overview }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          const value = overview[c.key as keyof ApplicationOverview];
          return (
            <Card key={c.key} className="border-border/30 bg-card/60">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${c.color}`} />
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{value}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-muted-foreground" /> Avg handoff→complete: {overview.avgHandoffToCompletionHours}h</span>
        <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-yellow-500" /> Oldest active: {overview.oldestActiveApplication}</span>
        <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-orange-500" /> High-risk in progress: {overview.highRiskInProgress}</span>
      </div>
    </div>
  );
}
