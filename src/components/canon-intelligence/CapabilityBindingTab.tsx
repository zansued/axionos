import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, Sparkles, CheckCircle, AlertTriangle, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Binding {
  id: string;
  engineering_skill_id: string;
  capability_key: string;
  capability_description: string;
  strength: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function CapabilityBindingTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [binding, setBinding] = useState(false);
  const [autoBindResult, setAutoBindResult] = useState<any>(null);

  const { data: bindingsData, isLoading, refetch } = useQuery({
    queryKey: ["skill-capability-bindings"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await supabase.functions.invoke("skill-extraction-engine", {
        body: { action: "list_bindings", limit: 200 },
      });
      if (res.error) throw res.error;
      return res.data;
    },
  });

  const { data: skillStats } = useQuery({
    queryKey: ["skill-extraction-status"],
  });

  const runAutoBind = async () => {
    setBinding(true);
    setAutoBindResult(null);
    try {
      const res = await supabase.functions.invoke("skill-extraction-engine", {
        body: { action: "auto_bind", limit: 100, min_confidence: 0.4 },
      });
      if (res.error) throw res.error;
      setAutoBindResult(res.data);
      toast({
        title: "Auto-Bind concluído",
        description: `${res.data.bound} bindings criados para ${res.data.skills_processed} skills.`,
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["skill-extraction-status"] });
    } catch (e: any) {
      toast({ title: "Erro no Auto-Bind", description: e.message, variant: "destructive" });
    } finally {
      setBinding(false);
    }
  };

  const bindings: Binding[] = bindingsData?.bindings || [];
  const byCapability: Record<string, number> = bindingsData?.by_capability || {};
  const totalBindings = bindingsData?.count || 0;
  const uniqueCapabilities = Object.keys(byCapability).length;
  const avgStrength = bindings.length > 0
    ? (bindings.reduce((a, b) => a + (b.strength || 0), 0) / bindings.length)
    : 0;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Bindings Totais" value={totalBindings} />
        <StatCard label="Capabilities Únicas" value={uniqueCapabilities} accent />
        <StatCard label="Força Média" value={`${(avgStrength * 100).toFixed(0)}%`} />
        <StatCard label="Skills Aprovadas" value={(skillStats as any)?.skills_by_status?.approved || 0} />
      </div>

      {/* Auto-Bind Action */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-3 flex flex-wrap items-center gap-3">
          <Link2 className="h-4 w-4 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Auto-Bind Capabilities</p>
            <p className="text-[10px] text-muted-foreground">
              Vincula skills aprovadas a capability keys automaticamente via mapeamento determinístico (domain + practice_type → capability).
              Apenas skills aprovadas com confidence ≥ 0.4 são elegíveis. Bindings existentes são preservados.
            </p>
          </div>
          <Button
            onClick={runAutoBind}
            disabled={binding}
            size="sm"
            className="gap-1.5 text-xs"
          >
            {binding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {binding ? "Vinculando..." : "Executar Auto-Bind"}
          </Button>
        </CardContent>
      </Card>

      {/* Auto-Bind Result */}
      {autoBindResult && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              Resultado do Auto-Bind
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <MiniStat label="Bindings Criados" value={autoBindResult.bound} />
              <MiniStat label="Skills Processadas" value={autoBindResult.skills_processed} />
              <MiniStat label="Já Existentes" value={autoBindResult.skipped_existing} />
            </div>
            {autoBindResult.sample_bindings?.slice(0, 3).map((s: any) => (
              <div key={s.skill_id} className="text-[10px] text-muted-foreground border-t border-border/20 pt-1">
                <code>{s.skill_id?.slice(0, 8)}...</code> → {s.capability_keys?.join(", ")}
              </div>
            ))}
            {autoBindResult.errors?.length > 0 && (
              <div className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {autoBindResult.errors.length} erro(s)
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Capability Distribution */}
      {Object.keys(byCapability).length > 0 && (
        <Card className="border-border/30 bg-card/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição por Capability</CardTitle>
            <CardDescription className="text-[10px]">
              Quantas skills estão vinculadas a cada chave de capacidade do Agent OS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(byCapability)
                .sort(([, a], [, b]) => b - a)
                .map(([cap, count]) => (
                  <Badge key={cap} variant="outline" className="text-xs gap-1 border-primary/20">
                    <Link2 className="h-2.5 w-2.5" />
                    {cap}: {count}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bindings List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : bindings.length === 0 ? (
        <Card className="border-border/30 bg-card/40">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum binding criado ainda. Execute o Auto-Bind para vincular skills aprovadas a capabilities.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/30 bg-card/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Bindings ({bindings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {bindings.map(b => (
                <div key={b.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/10 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link2 className="h-3 w-3 text-primary shrink-0" />
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary shrink-0">
                      {b.capability_key}
                    </Badge>
                    <span className="text-muted-foreground truncate text-[10px]">
                      {b.capability_description?.slice(0, 60)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-foreground">
                      {(b.strength * 100).toFixed(0)}%
                    </span>
                    <Badge variant="secondary" className="text-[9px]">
                      {(b.metadata as any)?.basis === "auto_bind_sf4" ? "auto" : "manual"}
                    </Badge>
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

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <Card className="border-border/30 bg-card/40">
      <CardContent className="pt-3 pb-2.5 text-center">
        <p className={`text-lg font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/10 rounded p-2">
      <p className="text-muted-foreground text-[10px]">{label}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}
