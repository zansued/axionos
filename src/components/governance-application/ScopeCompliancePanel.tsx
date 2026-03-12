import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ChangeApplication, ConstraintCheck } from "@/lib/governance-change-application-types";
import { SCOPE_COMPLIANCE_LABELS } from "@/lib/governance-change-application-types";
import { Shield, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";

interface Props { application: ChangeApplication }

const checkIcons: Record<string, React.ReactNode> = {
  pass: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  warn: <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />,
  fail: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  pending: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
};

export function ScopeCompliancePanel({ application: a }: Props) {
  const scopeDef = SCOPE_COMPLIANCE_LABELS[a.scopeComplianceStatus];
  return (
    <Card className="border-border/30 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Scope Compliance & Constraints
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scope comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/30 p-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Approved Scope</span>
            <p className="text-xs text-foreground mt-1">{a.approvedScope}</p>
          </div>
          <div className="rounded-lg border border-border/30 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Observed Scope</span>
              <Badge variant={scopeDef.variant} className="text-[10px]">{scopeDef.label}</Badge>
            </div>
            <p className="text-xs text-foreground mt-1">{a.observedScope}</p>
          </div>
        </div>

        {/* Constraint checks */}
        <div>
          <span className="text-xs font-medium text-muted-foreground">Constraint Checks</span>
          <div className="mt-2 space-y-2">
            {a.constraintChecks.map((c) => (
              <div key={c.key} className="flex items-start gap-2 text-xs">
                {checkIcons[c.status]}
                <div className="flex-1">
                  <span className="text-foreground font-medium">{c.label}</span>
                  {c.required && <span className="text-muted-foreground ml-1">(required)</span>}
                  <p className="text-muted-foreground mt-0.5">{c.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monitoring & Validation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <span className="text-xs font-medium text-muted-foreground">Monitoring Requirements</span>
            <ul className="mt-1 space-y-1">
              {a.monitoringRequirements.map((m, i) => (
                <li key={i} className="text-xs text-foreground flex items-center gap-1.5">
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground">Validation Requirements</span>
            <ul className="mt-1 space-y-1">
              {a.validationRequirements.map((v, i) => (
                <li key={i} className="text-xs text-foreground flex items-center gap-1.5">
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  {v}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
