import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ChangeApplication } from "@/lib/governance-change-application-types";
import { Undo2, Flag, AlertTriangle, Eye, FileText, PenLine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { application: ChangeApplication }

export function RollbackGovernanceInterventionPanel({ application: a }: Props) {
  const { toast } = useToast();

  const isRolledBack = a.applicationStatus === "rolled_back" || a.applicationStatus === "rollback_in_progress";

  const handleAction = (action: string) => {
    toast({ title: "Action Recorded", description: `${action} — ${a.applicationId}` });
  };

  return (
    <Card className="border-border/30 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Undo2 className="h-4 w-4 text-primary" /> Rollback & Governance Intervention
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rollback status */}
        <div className="rounded-lg border border-border/30 p-3 space-y-2">
          <span className="text-xs font-medium text-muted-foreground">Rollback Status</span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Eligibility:</span> <span className="text-foreground">{a.rollbackExpectations ? "Eligible" : "Unknown"}</span></div>
            <div><span className="text-muted-foreground">Currently active:</span> <span className={isRolledBack ? "text-red-400" : "text-muted-foreground"}>{isRolledBack ? "Yes" : "No"}</span></div>
          </div>
          <div className="text-xs"><span className="text-muted-foreground">Rollback plan:</span> <span className="text-foreground">{a.rollbackExpectations}</span></div>
          {a.linkedEscalations.length > 0 && (
            <div className="text-xs"><span className="text-muted-foreground">Linked escalations:</span> <span className="text-foreground">{a.linkedEscalations.join(", ")}</span></div>
          )}
        </div>

        {/* Intervention actions */}
        <div>
          <span className="text-xs font-medium text-muted-foreground">Governance Intervention Actions</span>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" onClick={() => handleAction("Flag for Governance Review")}>
              <Flag className="h-3 w-3" /> Flag for Review
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" onClick={() => handleAction("Escalate Application Concern")}>
              <AlertTriangle className="h-3 w-3" /> Escalate Concern
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" onClick={() => handleAction("Mark Monitoring Required")}>
              <Eye className="h-3 w-3" /> Mark Monitoring
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" onClick={() => handleAction("Open Follow-up Proposal")}>
              <FileText className="h-3 w-3" /> Follow-up Proposal
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" onClick={() => handleAction("Record Intervention Note")}>
              <PenLine className="h-3 w-3" /> Record Note
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
