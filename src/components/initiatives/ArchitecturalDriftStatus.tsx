import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield, AlertTriangle, CheckCircle2, FileWarning,
  ArrowRight, Layers
} from "lucide-react";

interface ArchitecturalDriftStatusProps {
  initiativeId: string;
}

interface DriftViolation {
  file: string;
  violation_type: string;
  severity: "error" | "warning";
  message: string;
  expected: string;
  actual: string;
  suggestion: string;
}

const VIOLATION_ICONS: Record<string, typeof AlertTriangle> = {
  wrong_dependency: ArrowRight,
  missing_layer: Layers,
  boundary_violation: Shield,
  circular_dependency: AlertTriangle,
  pattern_violation: FileWarning,
};

const VIOLATION_LABELS: Record<string, string> = {
  wrong_dependency: "Dependência Incorreta",
  missing_layer: "Camada Ausente",
  boundary_violation: "Violação de Fronteira",
  circular_dependency: "Dependência Circular",
  pattern_violation: "Violação de Padrão",
};

export function ArchitecturalDriftStatus({ initiativeId }: ArchitecturalDriftStatusProps) {
  const { data: initiative } = useQuery({
    queryKey: ["initiative-drift", initiativeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("initiatives")
        .select("execution_progress")
        .eq("id", initiativeId)
        .single();
      return data;
    },
    refetchInterval: 10000,
  });

  const execProgress = (initiative?.execution_progress || {}) as any;
  const drift = execProgress.drift_detection;

  if (!drift) return null;

  const violations = (drift.violations || []) as DriftViolation[];
  const errors = violations.filter(v => v.severity === "error");
  const warnings = violations.filter(v => v.severity === "warning");
  const driftScore = drift.drift_score || 0;
  const passed = drift.errors_count === 0;

  return (
    <Card className={`border-border/50 ${!passed ? "border-warning/30" : ""}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className={`h-4 w-4 ${passed ? "text-success" : "text-warning"}`} />
            Architectural Drift Detection
          </span>
          <div className="flex items-center gap-2">
            <Badge
              variant={passed ? "default" : "destructive"}
              className="text-[10px]"
            >
              {passed ? "Aligned" : `Drift: ${driftScore}%`}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {drift.total_files_analyzed} arquivos analisados
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className={`rounded-lg p-2 text-center ${passed ? "bg-success/10" : "bg-destructive/10"}`}>
            {passed
              ? <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-success" />
              : <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-destructive" />}
            <p className="text-xs font-bold">{errors.length}</p>
            <p className="text-[10px] text-muted-foreground">Violações</p>
          </div>
          <div className="rounded-lg p-2 text-center bg-warning/10">
            <FileWarning className="h-4 w-4 mx-auto mb-1 text-warning" />
            <p className="text-xs font-bold">{warnings.length}</p>
            <p className="text-[10px] text-muted-foreground">Avisos</p>
          </div>
          <div className="rounded-lg p-2 text-center bg-muted/30">
            <Layers className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs font-bold">{driftScore}%</p>
            <p className="text-[10px] text-muted-foreground">Drift Score</p>
          </div>
        </div>

        {/* Violations list */}
        {violations.length > 0 && (
          <ScrollArea className="max-h-[250px]">
            <div className="space-y-2">
              {violations.map((v, i) => {
                const Icon = VIOLATION_ICONS[v.violation_type] || AlertTriangle;
                const label = VIOLATION_LABELS[v.violation_type] || v.violation_type;
                return (
                  <div
                    key={i}
                    className={`rounded-lg border p-2.5 space-y-1 ${
                      v.severity === "error"
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-warning/30 bg-warning/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${
                        v.severity === "error" ? "text-destructive" : "text-warning"
                      }`} />
                      <Badge variant="outline" className="text-[9px]">{label}</Badge>
                      <code className="text-[10px] text-muted-foreground truncate">{v.file}</code>
                    </div>
                    <p className="text-xs">{v.message}</p>
                    {v.suggestion && (
                      <p className="text-[10px] text-muted-foreground italic">
                        💡 {v.suggestion}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {passed && (
          <div className="text-center py-2">
            <CheckCircle2 className="h-6 w-6 mx-auto text-success mb-1" />
            <p className="text-xs text-muted-foreground">
              Código alinhado com a arquitetura do Project Brain
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
