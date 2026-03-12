import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { type ChangeApplication, APPLICATION_STATUS_DEFS, SCOPE_COMPLIANCE_LABELS } from "@/lib/governance-change-application-types";
import { format } from "date-fns";

interface Props {
  applications: ChangeApplication[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}

const riskColors: Record<string, string> = {
  critical: "text-red-500",
  high: "text-orange-500",
  medium: "text-yellow-500",
  low: "text-emerald-500",
};

export function ApplicationTrackingQueue({ applications, onSelect, selectedId }: Props) {
  return (
    <div className="rounded-lg border border-border/40 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="text-xs w-[90px]">App ID</TableHead>
            <TableHead className="text-xs">Change Title</TableHead>
            <TableHead className="text-xs w-[110px]">Type</TableHead>
            <TableHead className="text-xs w-[120px]">Subsystem</TableHead>
            <TableHead className="text-xs w-[130px]">Status</TableHead>
            <TableHead className="text-xs w-[80px]">Risk</TableHead>
            <TableHead className="text-xs w-[120px]">Scope</TableHead>
            <TableHead className="text-xs w-[100px]">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((app) => {
            const statusDef = APPLICATION_STATUS_DEFS[app.applicationStatus];
            const scopeDef = SCOPE_COMPLIANCE_LABELS[app.scopeComplianceStatus];
            return (
              <TableRow
                key={app.applicationId}
                onClick={() => onSelect(app.applicationId)}
                className={`cursor-pointer transition-colors ${selectedId === app.applicationId ? "bg-primary/10" : "hover:bg-muted/20"}`}
              >
                <TableCell className="text-xs font-mono text-muted-foreground">{app.applicationId}</TableCell>
                <TableCell className="text-sm font-medium text-foreground">{app.changeTitle}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {app.proposalType.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{app.targetSubsystem}</TableCell>
                <TableCell>
                  <span className={`text-xs font-medium ${statusDef.color}`}>{statusDef.label}</span>
                </TableCell>
                <TableCell>
                  <span className={`text-xs font-semibold capitalize ${riskColors[app.riskLevel]}`}>{app.riskLevel}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={scopeDef.variant} className="text-[10px]">{scopeDef.label}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(app.updatedAt), "MMM d, HH:mm")}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
