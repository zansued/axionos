import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, Clock, XCircle, ArrowUpCircle, Hourglass, FileCheck, Ban } from "lucide-react";

interface Props {
  triggers: any[];
  workflows: any[];
  proposals: any[];
  history: any[];
}

function MetricCard({ value, label, icon: Icon, variant = "default" }: {
  value: number; label: string; icon: React.ElementType;
  variant?: "default" | "success" | "warning" | "destructive" | "accent";
}) {
  const colors = {
    default: "text-foreground",
    success: "text-emerald-500",
    warning: "text-amber-500",
    destructive: "text-destructive",
    accent: "text-primary",
  };
  const bgs = {
    default: "bg-muted/30",
    success: "bg-emerald-500/10",
    warning: "bg-amber-500/10",
    destructive: "bg-destructive/10",
    accent: "bg-primary/10",
  };
  return (
    <Card className="border-border/30 bg-card/60">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold tracking-tight ${colors[variant]}`}>{value}</p>
          </div>
          <div className={`p-2 rounded-lg ${bgs[variant]}`}>
            <Icon className={`h-4 w-4 ${colors[variant]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function KnowledgeHealthCards({ triggers, workflows, proposals, history }: Props) {
  const pendingTriggers = triggers.filter((t: any) => t.status === "pending").length;
  const activeWorkflows = workflows.filter((w: any) => w.status === "in_progress" || w.status === "pending").length;
  const completedWorkflows = workflows.filter((w: any) => w.status === "completed").length;
  const failedWorkflows = workflows.filter((w: any) => w.status === "failed").length;
  const pendingProposals = proposals.filter((p: any) => p.status === "pending").length;
  const confidenceRestored = history.filter((h: any) => h.event_type === "confidence_restored").length;
  const superseded = history.filter((h: any) => h.event_type === "superseded").length;
  const deprecated = history.filter((h: any) => h.event_type === "deprecated").length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
      <MetricCard value={pendingTriggers} label="Pending Triggers" icon={AlertTriangle} variant={pendingTriggers > 5 ? "warning" : "default"} />
      <MetricCard value={activeWorkflows} label="Under Revalidation" icon={Hourglass} variant={activeWorkflows > 0 ? "accent" : "default"} />
      <MetricCard value={completedWorkflows} label="Completed" icon={CheckCircle2} variant="success" />
      <MetricCard value={failedWorkflows} label="Failed Renewals" icon={XCircle} variant={failedWorkflows > 0 ? "destructive" : "default"} />
      <MetricCard value={pendingProposals} label="Pending Proposals" icon={FileCheck} variant={pendingProposals > 0 ? "warning" : "default"} />
      <MetricCard value={confidenceRestored} label="Confidence Restored" icon={ArrowUpCircle} variant="success" />
      <MetricCard value={superseded} label="Superseded" icon={Clock} variant={superseded > 0 ? "warning" : "default"} />
      <MetricCard value={deprecated} label="Deprecated" icon={Ban} variant={deprecated > 0 ? "destructive" : "default"} />
    </div>
  );
}
