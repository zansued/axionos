/**
 * LifecycleHealthCheck — Sprint 204
 * Executable dashboard surface that verifies lifecycle correctness across canon records.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";

const VALID_CANDIDATE_REVIEW = ["pending", "approved", "needs_human_review", "rejected"];
const VALID_CANDIDATE_PROMOTION = ["pending", "promoted", "not_promoted"];
const VALID_ENTRY_LIFECYCLE = ["draft", "proposed", "approved", "experimental", "contested", "deprecated", "archived", "superseded"];
const VALID_ENTRY_APPROVAL = ["pending", "approved", "revoked"];

// Legacy values that should have been migrated
const LEGACY_CANDIDATE_REVIEW = ["needs_review"];
const LEGACY_CANDIDATE_PROMOTION = ["rejected"];

interface HealthViolation {
  table: string;
  field: string;
  recordId: string;
  currentValue: string;
  issue: string;
  severity: "error" | "warning";
}

export function LifecycleHealthCheck() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const [lastRun, setLastRun] = useState<string | null>(null);

  const healthCheck = useQuery({
    queryKey: ["lifecycle-health-check", orgId, lastRun],
    queryFn: async () => {
      if (!orgId) return null;

      const violations: HealthViolation[] = [];

      const [candidatesRes, entriesRes] = await Promise.all([
        supabase
          .from("canon_candidate_entries")
          .select("id, internal_validation_status, promotion_status")
          .eq("organization_id", orgId),
        supabase
          .from("canon_entries")
          .select("id, lifecycle_status, approval_status")
          .eq("organization_id", orgId),
      ]);

      const candidates = candidatesRes.data || [];
      const entries = entriesRes.data || [];

      // Check candidates
      for (const c of candidates) {
        const review = (c as any).internal_validation_status;
        const promo = (c as any).promotion_status;

        if (LEGACY_CANDIDATE_REVIEW.includes(review)) {
          violations.push({
            table: "canon_candidate_entries",
            field: "internal_validation_status",
            recordId: c.id,
            currentValue: review,
            issue: `Legacy value "${review}" — should be migrated to canonical status`,
            severity: "warning",
          });
        } else if (!VALID_CANDIDATE_REVIEW.includes(review)) {
          violations.push({
            table: "canon_candidate_entries",
            field: "internal_validation_status",
            recordId: c.id,
            currentValue: review,
            issue: `Invalid review status "${review}"`,
            severity: "error",
          });
        }

        if (LEGACY_CANDIDATE_PROMOTION.includes(promo)) {
          violations.push({
            table: "canon_candidate_entries",
            field: "promotion_status",
            recordId: c.id,
            currentValue: promo,
            issue: `Legacy value "${promo}" — should be "not_promoted"`,
            severity: "warning",
          });
        } else if (!VALID_CANDIDATE_PROMOTION.includes(promo)) {
          violations.push({
            table: "canon_candidate_entries",
            field: "promotion_status",
            recordId: c.id,
            currentValue: promo,
            issue: `Invalid promotion status "${promo}"`,
            severity: "error",
          });
        }

        // Contradiction check: promoted but not approved
        if (promo === "promoted" && review !== "approved") {
          violations.push({
            table: "canon_candidate_entries",
            field: "promotion_status + internal_validation_status",
            recordId: c.id,
            currentValue: `review=${review}, promo=${promo}`,
            issue: "Promoted without approved review — contradictory state",
            severity: "error",
          });
        }
      }

      // Check entries
      for (const e of entries) {
        const lifecycle = (e as any).lifecycle_status;
        const approval = (e as any).approval_status;

        if (!VALID_ENTRY_LIFECYCLE.includes(lifecycle)) {
          violations.push({
            table: "canon_entries",
            field: "lifecycle_status",
            recordId: e.id,
            currentValue: lifecycle,
            issue: `Invalid lifecycle status "${lifecycle}"`,
            severity: "error",
          });
        }

        if (!VALID_ENTRY_APPROVAL.includes(approval)) {
          violations.push({
            table: "canon_entries",
            field: "approval_status",
            recordId: e.id,
            currentValue: approval,
            issue: `Invalid approval status "${approval}"`,
            severity: "error",
          });
        }

        // Contradiction check: approved lifecycle but revoked approval
        if (lifecycle === "approved" && approval === "revoked") {
          violations.push({
            table: "canon_entries",
            field: "lifecycle_status + approval_status",
            recordId: e.id,
            currentValue: `lifecycle=${lifecycle}, approval=${approval}`,
            issue: "Approved entry with revoked approval — contradictory state",
            severity: "error",
          });
        }
      }

      return {
        totalCandidates: candidates.length,
        totalEntries: entries.length,
        violations,
        errors: violations.filter((v) => v.severity === "error").length,
        warnings: violations.filter((v) => v.severity === "warning").length,
        healthy: violations.length === 0,
        checkedAt: new Date().toISOString(),
      };
    },
    enabled: !!orgId && !!lastRun,
  });

  const data = healthCheck.data;

  return (
    <Card className="border-border/30 bg-card/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Verificação de Saúde do Ciclo de Vida
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLastRun(Date.now().toString())}
            disabled={healthCheck.isFetching}
            className="text-xs h-7"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${healthCheck.isFetching ? "animate-spin" : ""}`} />
             Executar Verificação
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!data && !healthCheck.isFetching && (
          <p className="text-xs text-muted-foreground italic">Press "Run Check" to verify lifecycle correctness.</p>
        )}

        {data && (
          <>
            <div className="flex items-center gap-2">
              {data.healthy ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> All records valid
                </Badge>
              ) : (
                <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">
                  <AlertTriangle className="h-3 w-3 mr-1" /> {data.errors} errors, {data.warnings} warnings
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground">
                {data.totalCandidates} candidates · {data.totalEntries} entries checked
              </span>
            </div>

            {data.violations.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {data.violations.slice(0, 20).map((v, i) => (
                  <div
                    key={i}
                    className={`text-[10px] p-2 rounded border ${
                      v.severity === "error"
                        ? "bg-destructive/5 border-destructive/20 text-destructive"
                        : "bg-amber-500/5 border-amber-500/20 text-amber-400"
                    }`}
                  >
                    <span className="font-mono">{v.table}.{v.field}</span>
                    <span className="mx-1">→</span>
                    <span>{v.issue}</span>
                    <span className="ml-1 opacity-60">({v.recordId.slice(0, 8)})</span>
                  </div>
                ))}
                {data.violations.length > 20 && (
                  <p className="text-[10px] text-muted-foreground">+ {data.violations.length - 20} more violations</p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
