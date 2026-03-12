import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ChangeApplication } from "@/lib/governance-change-application-types";
import { APPLICATION_STATUS_DEFS, SCOPE_COMPLIANCE_LABELS } from "@/lib/governance-change-application-types";
import { format } from "date-fns";
import { History } from "lucide-react";

interface Props { applications: ChangeApplication[] }

export function ApplicationHistoryPanel({ applications }: Props) {
  const completed = applications.filter((a) => APPLICATION_STATUS_DEFS[a.applicationStatus].terminal);

  if (completed.length === 0) {
    return (
      <Card className="border-border/30 bg-card/60">
        <CardContent className="p-6 text-center text-xs text-muted-foreground">
          No completed applications in history.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/30 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Application History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead className="text-xs w-[80px]">App ID</TableHead>
              <TableHead className="text-xs">Change Title</TableHead>
              <TableHead className="text-xs w-[100px]">Type</TableHead>
              <TableHead className="text-xs w-[110px]">Outcome</TableHead>
              <TableHead className="text-xs w-[100px]">Scope</TableHead>
              <TableHead className="text-xs w-[70px]">Follow-up</TableHead>
              <TableHead className="text-xs w-[100px]">Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {completed.map((a) => {
              const statusDef = APPLICATION_STATUS_DEFS[a.applicationStatus];
              const scopeDef = SCOPE_COMPLIANCE_LABELS[a.scopeComplianceStatus];
              return (
                <TableRow key={a.applicationId}>
                  <TableCell className="text-xs font-mono text-muted-foreground">{a.applicationId}</TableCell>
                  <TableCell className="text-xs text-foreground">{a.changeTitle}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{a.proposalType.replace(/_/g, " ")}</Badge></TableCell>
                  <TableCell><span className={`text-xs ${statusDef.color}`}>{statusDef.label}</span></TableCell>
                  <TableCell><Badge variant={scopeDef.variant} className="text-[10px]">{scopeDef.label}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.linkedFollowUpProposalIds.length > 0 ? "Yes" : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.completedAt ? format(new Date(a.completedAt), "MMM d") : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
