import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ChangeApplication } from "@/lib/governance-change-application-types";
import { APPLICATION_STATUS_DEFS, SCOPE_COMPLIANCE_LABELS } from "@/lib/governance-change-application-types";
import { format } from "date-fns";
import { Link2, GitBranch, Target, Clock } from "lucide-react";

interface Props { application: ChangeApplication }

export function ChangeApplicationSummaryPanel({ application: a }: Props) {
  const statusDef = APPLICATION_STATUS_DEFS[a.applicationStatus];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Governance Chain */}
      <Card className="border-border/30 bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /> Governance Lineage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <Row label="Proposal" value={a.sourceProposalId} />
          <Row label="Decision" value={a.governanceDecisionRef} />
          <Row label="Handoff" value={a.handoffId} />
          <Row label="Type" value={a.proposalType.replace(/_/g, " ")} />
        </CardContent>
      </Card>

      {/* Change Intent */}
      <Card className="border-border/30 bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Change Intent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p className="text-foreground font-medium">{a.changeTitle}</p>
          <div>
            <span className="text-muted-foreground">Approved scope:</span>
            <p className="text-foreground mt-0.5">{a.approvedScope}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Target:</span>
            <p className="text-foreground">{a.targetWorkflow} → {a.targetSubsystem}</p>
          </div>
        </CardContent>
      </Card>

      {/* Current State */}
      <Card className="border-border/30 bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Current State</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <Row label="Status" value={<span className={statusDef.color}>{statusDef.label}</span>} />
          <Row label="Phase" value={a.currentPhase} />
          <Row label="Started" value={format(new Date(a.startedAt), "MMM d, HH:mm")} />
          <Row label="Updated" value={format(new Date(a.updatedAt), "MMM d, HH:mm")} />
          <Row label="Owner" value={a.trackingOwner} />
          <Row label="Scope" value={<Badge variant={SCOPE_COMPLIANCE_LABELS[a.scopeComplianceStatus].variant} className="text-[10px]">{SCOPE_COMPLIANCE_LABELS[a.scopeComplianceStatus].label}</Badge>} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
