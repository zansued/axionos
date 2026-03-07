import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, ShieldCheck, ShieldAlert, Activity, Zap, Ban } from "lucide-react";

export function PreventionDashboard() {
  const { currentOrg } = useOrg();

  const { data: rules = [] } = useQuery({
    queryKey: ["prevention-rules", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data } = await supabase
        .from("active_prevention_rules" as any)
        .select("*")
        .eq("organization_id", currentOrg!.id)
        .order("confidence_score", { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["prevention-events", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data } = await supabase
        .from("prevention_events" as any)
        .select("*")
        .eq("organization_id", currentOrg!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as any[];
    },
  });

  const enabledRules = rules.filter((r: any) => r.enabled);
  const totalTriggered = rules.reduce((s: number, r: any) => s + (r.times_triggered || 0), 0);
  const totalPrevented = rules.reduce((s: number, r: any) => s + (r.times_prevented || 0), 0);
  const blockers = events.filter((e: any) => e.action_taken === "block");
  const warnings = events.filter((e: any) => e.action_taken === "warn");

  const actionBadge: Record<string, string> = {
    block: "bg-destructive/20 text-destructive",
    warn: "bg-yellow-500/20 text-yellow-400",
    add_validation: "bg-blue-500/20 text-blue-400",
    adjust_generation: "bg-purple-500/20 text-purple-400",
    require_dependency: "bg-green-500/20 text-green-400",
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-2.5 p-3">
            <Shield className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Regras Ativas</p>
              <p className="text-base font-bold font-display">{enabledRules.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-2.5 p-3">
            <Activity className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vezes Acionadas</p>
              <p className="text-base font-bold font-display">{totalTriggered}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-2.5 p-3">
            <ShieldCheck className="h-4 w-4 text-green-400 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Falhas Prevenidas</p>
              <p className="text-base font-bold font-display text-green-400">{totalPrevented}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="flex items-center gap-2.5 p-3">
            <Ban className="h-4 w-4 text-destructive shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Bloqueios</p>
              <p className="text-base font-bold font-display text-destructive">{blockers.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Active Rules */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Regras de Prevenção Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {enabledRules.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhuma regra ativa</p>
              ) : (
                <div className="space-y-2">
                  {enabledRules.map((rule: any) => (
                    <div key={rule.id} className="rounded-md border border-border/30 bg-muted/10 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight">{rule.description || "Regra sem descrição"}</p>
                        <Badge className={`text-[10px] shrink-0 ${actionBadge[rule.action_type] || "bg-muted"}`}>
                          {rule.action_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        <span>Tipo: {rule.rule_type}</span>
                        <span>Stage: {rule.pipeline_stage}</span>
                        <span>Confiança: {((rule.confidence_score || 0) * 100).toFixed(0)}%</span>
                        <span>Acionada: {rule.times_triggered || 0}x</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Eventos de Prevenção Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {events.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum evento registrado</p>
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 20).map((evt: any) => (
                    <div key={evt.id} className="rounded-md border border-border/30 bg-muted/10 p-2.5">
                      <div className="flex items-center gap-2">
                        {evt.prevented ? (
                          <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0" />
                        ) : (
                          <ShieldCheck className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                        )}
                        <Badge className={`text-[10px] ${actionBadge[evt.action_taken] || "bg-muted"}`}>
                          {evt.action_taken}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">Stage: {evt.pipeline_stage}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {new Date(evt.created_at).toLocaleString("pt-BR")}
                        {evt.prevented && " — Bloqueado"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
