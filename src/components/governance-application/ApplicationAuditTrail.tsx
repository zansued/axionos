import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditEntry } from "@/lib/governance-change-application-types";
import { format } from "date-fns";
import { ScrollText } from "lucide-react";

interface Props { entries: AuditEntry[] }

export function ApplicationAuditTrail({ entries }: Props) {
  return (
    <Card className="border-border/30 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-primary" /> Audit Trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div key={i} className="flex items-start gap-3 text-xs py-1.5 border-b border-border/20 last:border-0">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap w-[100px]">{format(new Date(entry.timestamp), "MMM d HH:mm")}</span>
              <span className="text-muted-foreground w-[120px] truncate">{entry.actor}</span>
              <span className="font-medium text-foreground w-[130px]">{entry.eventType.replace(/_/g, " ")}</span>
              <span className="text-muted-foreground flex-1">{entry.summary}</span>
              {entry.statusChange && (
                <span className="text-[10px] text-orange-400 whitespace-nowrap">{entry.statusChange}</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
