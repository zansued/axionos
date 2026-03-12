import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FrictionPattern } from "@/hooks/useGovernanceInsightsData";
import { AlertTriangle, ChevronRight } from "lucide-react";

function FrictionCard({ pattern }: { pattern: FrictionPattern }) {
  const [open, setOpen] = useState(false);
  const sevColors: Record<string, string> = {
    critical: "bg-destructive/20 text-destructive border-destructive/30",
    high: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    medium: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors border border-border/20">
          <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">{pattern.summary}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px]">{pattern.stage}</Badge>
              <Badge variant="outline" className={`text-[10px] ${sevColors[pattern.severity] || sevColors.low}`}>
                {pattern.severity}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-medium">{pattern.count}x</span>
            </div>
          </div>
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-7 mt-2 p-3 rounded-lg bg-card border border-border/40 space-y-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Pattern Type:</span> {pattern.type.replace(/_/g, " ")}
          </p>
          {pattern.linkedActionIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Linked Actions:</span> {pattern.linkedActionIds.length} action(s)
            </p>
          )}
          {pattern.linkedProposalIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Linked Proposals:</span> {pattern.linkedProposalIds.length} proposal(s)
            </p>
          )}
          <p className="text-[10px] text-muted-foreground italic mt-2">
            This pattern indicates governance friction that may require policy review or tuning proposal.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function FrictionPatternsPanel({ patterns }: { patterns: FrictionPattern[] }) {
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          Governance Friction Patterns
        </CardTitle>
        <CardDescription className="text-xs">
          Repeated blocked actions, rejected approvals, and escalation clusters requiring governance attention.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {patterns.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No significant friction patterns detected. This indicates governance policies are well-calibrated.
          </p>
        ) : (
          <div className="space-y-2">
            {patterns.map(p => <FrictionCard key={p.id} pattern={p} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
