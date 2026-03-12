import { Card, CardContent } from "@/components/ui/card";
import { SystemHealthData } from "@/hooks/useGovernanceInsightsData";
import { Activity, CheckCircle2, XCircle, Shield, RefreshCw, UserCheck } from "lucide-react";

function HealthCard({ title, value, subtitle, icon: Icon, variant = "default" }: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; variant?: "default" | "warning" | "destructive" | "success";
}) {
  const variantClasses = {
    default: "text-primary",
    warning: "text-yellow-500",
    destructive: "text-destructive",
    success: "text-emerald-500",
  };
  const iconBg = {
    default: "bg-primary/10",
    warning: "bg-yellow-500/10",
    destructive: "bg-destructive/10",
    success: "bg-emerald-500/10",
  };
  return (
    <Card className="border-border/40 bg-card/80">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
            <p className={`text-2xl font-bold tracking-tight ${variantClasses[variant]}`}>{value}</p>
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg ${iconBg[variant]}`}>
            <Icon className={`h-4 w-4 ${variantClasses[variant]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SystemHealthOverview({ data }: { data: SystemHealthData }) {
  const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <HealthCard
        title="Total Actions"
        value={data.totalActions}
        subtitle="Registered in engine"
        icon={Activity}
      />
      <HealthCard
        title="Success Rate"
        value={fmtPct(data.successRate)}
        subtitle={`${data.completedActions} completed`}
        icon={CheckCircle2}
        variant={data.successRate >= 0.7 ? "success" : data.successRate >= 0.4 ? "warning" : "destructive"}
      />
      <HealthCard
        title="Failure Rate"
        value={fmtPct(data.failureRate)}
        subtitle={`${data.failedActions} failed`}
        icon={XCircle}
        variant={data.failureRate > 0.3 ? "destructive" : data.failureRate > 0.1 ? "warning" : "success"}
      />
      <HealthCard
        title="Recovery Rate"
        value={fmtPct(data.recoveryRate)}
        subtitle={`${data.recoveryActivations} activations`}
        icon={RefreshCw}
        variant={data.recoveryRate > 0.2 ? "warning" : "default"}
      />
      <HealthCard
        title="Approval Rate"
        value={fmtPct(data.humanApprovalRate)}
        subtitle="Requires human approval"
        icon={UserCheck}
        variant={data.humanApprovalRate > 0.5 ? "warning" : "default"}
      />
      <HealthCard
        title="Blocked"
        value={data.blockedActions}
        subtitle="Actions blocked"
        icon={Shield}
        variant={data.blockedActions > 5 ? "destructive" : data.blockedActions > 0 ? "warning" : "success"}
      />
    </div>
  );
}
