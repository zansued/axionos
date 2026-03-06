import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wrench, CheckCircle2, XCircle, AlertTriangle, Clock, FileCode } from "lucide-react";
import { useRepairEvidence, type RepairEvidenceEntry } from "@/hooks/useRepairEvidence";

const RESULT_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
  fixed: { label: "Fixed", variant: "default", icon: CheckCircle2 },
  partial: { label: "Partial", variant: "secondary", icon: AlertTriangle },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
  attempted: { label: "Attempted", variant: "outline", icon: Clock },
};

const CATEGORY_LABELS: Record<string, string> = {
  typescript_error: "TypeScript",
  import_error: "Import",
  dependency_error: "Dependency",
  schema_error: "Schema",
  runtime_error: "Runtime",
  build_config_error: "Build Config",
  deploy_error: "Deploy",
  unknown_error: "Unknown",
};

function RepairEntry({ entry }: { entry: RepairEvidenceEntry }) {
  const config = RESULT_CONFIG[entry.repair_result] || RESULT_CONFIG.attempted;
  const Icon = config.icon;

  return (
    <div className="rounded-lg border border-border/50 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`h-4 w-4 shrink-0 ${entry.repair_result === "fixed" ? "text-success" : entry.repair_result === "failed" ? "text-destructive" : "text-warning"}`} />
          <span className="text-xs font-medium truncate">
            Attempt #{entry.attempt_number}
          </span>
          <Badge variant={config.variant} className="text-[9px]">
            {config.label}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className="text-[9px]">
            {CATEGORY_LABELS[entry.error_category] || entry.error_category}
          </Badge>
          {entry.revalidation_status === "passed" && (
            <Badge variant="default" className="text-[9px] bg-success">
              Revalidated
            </Badge>
          )}
          {entry.revalidation_status === "failed" && (
            <Badge variant="destructive" className="text-[9px]">
              Revalidation Failed
            </Badge>
          )}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground line-clamp-2">
        {entry.error_message}
      </p>

      {entry.files_touched.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <FileCode className="h-3 w-3 text-muted-foreground shrink-0" />
          {entry.files_touched.slice(0, 4).map((f) => (
            <span key={f} className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {f.split("/").pop()}
            </span>
          ))}
          {entry.files_touched.length > 4 && (
            <span className="text-[9px] text-muted-foreground">
              +{entry.files_touched.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {entry.duration_ms > 0 ? `${(entry.duration_ms / 1000).toFixed(1)}s` : "—"}
        </span>
        <span>{entry.repair_strategy.replace(/_/g, " ")}</span>
        <span>{new Date(entry.created_at).toLocaleString()}</span>
      </div>
    </div>
  );
}

export function RepairEvidenceCard({ initiativeId }: { initiativeId: string }) {
  const { data: repairs, isLoading } = useRepairEvidence(initiativeId);

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!repairs || repairs.length === 0) return null;

  const totalAttempts = repairs.length;
  const fixed = repairs.filter((r) => r.repair_result === "fixed").length;
  const failed = repairs.filter((r) => r.repair_result === "failed").length;

  // Compute category distribution
  const categoryDist: Record<string, number> = {};
  repairs.forEach((r) => {
    categoryDist[r.error_category] = (categoryDist[r.error_category] || 0) + 1;
  });

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Wrench className="h-4 w-4 text-warning" /> Repair Evidence
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {totalAttempts} attempt{totalAttempts !== 1 ? "s" : ""}
            </Badge>
            {fixed > 0 && (
              <Badge variant="default" className="text-[10px] bg-success">
                {fixed} fixed
              </Badge>
            )}
            {failed > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {failed} failed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-muted/30 p-2 text-center">
            <p className="text-xs font-bold">{totalAttempts > 0 ? Math.round((fixed / totalAttempts) * 100) : 0}%</p>
            <p className="text-[9px] text-muted-foreground">Success Rate</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-2 text-center">
            <p className="text-xs font-bold">{totalAttempts}</p>
            <p className="text-[9px] text-muted-foreground">Total Repairs</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-2 text-center">
            <p className="text-xs font-bold">{Object.keys(categoryDist).length}</p>
            <p className="text-[9px] text-muted-foreground">Error Types</p>
          </div>
        </div>

        {/* Error categories */}
        {Object.keys(categoryDist).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(categoryDist).map(([cat, count]) => (
              <Badge key={cat} variant="outline" className="text-[9px]">
                {CATEGORY_LABELS[cat] || cat}: {count}
              </Badge>
            ))}
          </div>
        )}

        {/* Recent repairs */}
        <div className="space-y-2">
          {repairs.slice(0, 5).map((r) => (
            <RepairEntry key={r.id} entry={r} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
