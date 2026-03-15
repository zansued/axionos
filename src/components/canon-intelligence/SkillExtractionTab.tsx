import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, CheckCircle, AlertTriangle, Boxes, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { getUserFriendlyError } from "@/lib/error-utils";

interface ExtractionResult {
  extracted: number;
  bundles_created: number;
  bundles_reused: number;
  skipped_already_extracted: number;
  eligible_canon_entries: number;
  total_canon_scanned: number;
  errors?: string[];
}

interface ExtractionStatus {
  total_bundles: number;
  total_skills: number;
  eligible_canon_entries: number;
  skills_by_status: Record<string, number>;
  skills_by_method: Record<string, number>;
  avg_confidence: number;
  recent_bundles: any[];
}

export function SkillExtractionTab() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<ExtractionResult | null>(null);

  const { data: status, isLoading, refetch } = useQuery<ExtractionStatus>({
    queryKey: ["skill-extraction-status"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("skill-extraction-engine", {
        body: { action: "extraction_status" },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("429") || error?.message?.includes("Rate limit")) return false;
      return failureCount < 2;
    },
  });

  const runExtraction = async () => {
    setRunning(true);
    setLastResult(null);
    try {
      const res = await supabase.functions.invoke("skill-extraction-engine", {
        body: { action: "extract_skills", limit: 100, min_confidence: 0.5 },
      });
      if (res.error) throw res.error;
      setLastResult(res.data);
      toast({
        title: "Extração concluída",
        description: `${res.data.extracted} skills extraídas, ${res.data.bundles_created} bundles criados.`,
      });
      refetch();
    } catch (e: any) {
      toast({ title: "Erro na extração", description: getUserFriendlyError(e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatusCard label="Skills Extraídas" value={status?.total_skills ?? 0} loading={isLoading} icon={Boxes} />
        <StatusCard label="Bundles" value={status?.total_bundles ?? 0} loading={isLoading} icon={Package} />
        <StatusCard label="Canon Elegíveis" value={status?.eligible_canon_entries ?? 0} loading={isLoading} />
        <StatusCard label="Confiança Média" value={status?.avg_confidence ? `${(status.avg_confidence * 100).toFixed(0)}%` : "—"} loading={isLoading} />
        <StatusCard
          label="Pendentes de Review"
          value={status?.skills_by_status?.extracted ?? 0}
          loading={isLoading}
          accent={!!status?.skills_by_status?.extracted}
        />
      </div>

      {/* Lifecycle Distribution */}
      {status && Object.keys(status.skills_by_status).length > 0 && (
        <Card className="border-border/30 bg-card/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(status.skills_by_status).map(([s, count]) => (
              <Badge key={s} variant={s === "approved" ? "default" : "secondary"} className="text-xs">
                {s}: {count}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Run Extraction */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            Executar Extração de Skills
          </CardTitle>
          <CardDescription className="text-xs">
            Transforma canon entries aprovadas (confidence ≥ 0.5) em engineering_skills e skill_bundles.
            Entries já extraídas são ignoradas automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runExtraction} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Extraindo..." : "Executar Extração"}
          </Button>

          {lastResult && (
            <div className="rounded-lg border border-border/30 bg-card/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                {lastResult.errors?.length ? (
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                Resultado da Extração
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <Stat label="Skills Extraídas" value={lastResult.extracted} />
                <Stat label="Bundles Criados" value={lastResult.bundles_created} />
                <Stat label="Bundles Reutilizados" value={lastResult.bundles_reused} />
                <Stat label="Já Extraídas (ignoradas)" value={lastResult.skipped_already_extracted} />
                <Stat label="Canon Elegíveis" value={lastResult.eligible_canon_entries} />
                <Stat label="Canon Escaneadas" value={lastResult.total_canon_scanned} />
              </div>
              {lastResult.errors && lastResult.errors.length > 0 && (
                <div className="text-xs text-destructive space-y-1 mt-2">
                  {lastResult.errors.map((e, i) => (
                    <p key={i}>⚠ {e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Bundles */}
      {status?.recent_bundles && status.recent_bundles.length > 0 && (
        <Card className="border-border/30 bg-card/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Bundles Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {status.recent_bundles.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/20">
                  <div>
                    <span className="font-medium">{b.domain}</span>
                    <span className="text-muted-foreground"> — {b.skill_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={b.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {b.status}
                    </Badge>
                    <span className="text-muted-foreground">{(b.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusCard({ label, value, loading, icon: Icon, accent }: {
  label: string; value: number | string; loading: boolean; icon?: any; accent?: boolean;
}) {
  return (
    <Card className="border-border/30 bg-card/40">
      <CardContent className="pt-3 pb-2.5 text-center">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
        ) : (
          <p className={`text-lg font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
        )}
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/10 rounded p-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}
