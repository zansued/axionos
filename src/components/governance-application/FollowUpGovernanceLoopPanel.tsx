import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FollowUpAction } from "@/lib/governance-change-application-types";
import { RefreshCw, ExternalLink } from "lucide-react";

interface Props {
  followUpActions: FollowUpAction[];
  linkedFollowUpProposalIds: string[];
}

const statusVariant: Record<string, "outline" | "default" | "secondary"> = {
  available: "outline",
  triggered: "default",
  completed: "secondary",
};

export function FollowUpGovernanceLoopPanel({ followUpActions, linkedFollowUpProposalIds }: Props) {
  if (followUpActions.length === 0 && linkedFollowUpProposalIds.length === 0) {
    return (
      <Card className="border-border/30 bg-card/60">
        <CardContent className="p-6 text-center text-xs text-muted-foreground">
          No follow-up governance actions recorded.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/30 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-primary" /> Follow-up Governance Loop
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {followUpActions.map((action) => (
          <div key={action.id} className="flex items-center justify-between text-xs rounded-lg border border-border/30 p-2.5">
            <div className="flex items-center gap-2">
              <span className="text-foreground font-medium">{action.label}</span>
              {action.linkedProposalId && (
                <span className="flex items-center gap-1 text-primary text-[10px]"><ExternalLink className="h-3 w-3" />{action.linkedProposalId}</span>
              )}
            </div>
            <Badge variant={statusVariant[action.status]} className="text-[10px] capitalize">{action.status}</Badge>
          </div>
        ))}
        {linkedFollowUpProposalIds.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Linked follow-up proposals: {linkedFollowUpProposalIds.join(", ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
