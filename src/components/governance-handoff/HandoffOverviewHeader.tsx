import { Card, CardContent } from "@/components/ui/card";
import type { HandoffOverview } from "@/hooks/useGovernanceHandoffData";
import { Clock, CheckCircle2, AlertTriangle, Hourglass, ArrowRightLeft, ShieldAlert, Package, Ban } from "lucide-react";

interface Props { overview: HandoffOverview }

const cards = [
  { key: "awaitingHandoff", label: "Awaiting Handoff", icon: Clock, color: "text-yellow-500" },
  { key: "prepared", label: "Prepared", icon: Package, color: "text-blue-400" },
  { key: "released", label: "Released", icon: CheckCircle2, color: "text-emerald-500" },
  { key: "blocked", label: "Blocked", icon: Ban, color: "text-destructive" },
  { key: "highRiskNotHandedOff", label: "High-Risk Pending", icon: ShieldAlert, color: "text-orange-500" },
] as const;

export function HandoffOverviewHeader({ overview }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          const value = overview[c.key as keyof HandoffOverview];
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
      {(overview.oldestAwaitingDays > 0 || overview.awaitingValidation > 0) && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground px-1">
          {overview.oldestAwaitingDays > 0 && (
            <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-yellow-500" /> Oldest awaiting: {overview.oldestAwaitingDays}d</span>
          )}
          {overview.awaitingValidation > 0 && (
            <span className="flex items-center gap-1"><Hourglass className="h-3 w-3 text-blue-400" /> Awaiting validation: {overview.awaitingValidation}</span>
          )}
        </div>
      )}
    </div>
  );
}
