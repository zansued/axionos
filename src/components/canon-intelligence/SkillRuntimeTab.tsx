import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Zap, CheckCircle, AlertTriangle, BarChart3, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface SkillUsageEvent {
  id: string;
  created_at: string;
  message: string;
  metadata: {
    agent_id?: string;
    agent_name?: string;
    agent_role?: string;
    artifact_id?: string;
    skill_bindings_used?: Array<{
      binding_id: string;
      capability_key: string;
      strength: number;
      skill_name: string;
    }>;
    skill_context_injected?: boolean;
  };
}

interface SkillStats {
  totalExecutions: number;
  withSkillInjection: number;
  withoutSkillInjection: number;
  injectionRate: number;
  topSkills: Array<{ name: string; count: number; avgStrength: number }>;
  topAgents: Array<{ name: string; role: string; count: number }>;
  topCapabilities: Array<{ key: string; count: number }>;
}

function computeStats(events: SkillUsageEvent[]): SkillStats {
  const withSkills = events.filter(e => e.metadata?.skill_context_injected);
  const skillMap = new Map<string, { count: number; totalStrength: number }>();
  const agentMap = new Map<string, { name: string; role: string; count: number }>();
  const capMap = new Map<string, number>();

  withSkills.forEach(e => {
    const bindings = e.metadata?.skill_bindings_used || [];
    bindings.forEach(b => {
      const prev = skillMap.get(b.skill_name) || { count: 0, totalStrength: 0 };
      skillMap.set(b.skill_name, { count: prev.count + 1, totalStrength: prev.totalStrength + b.strength });
      capMap.set(b.capability_key, (capMap.get(b.capability_key) || 0) + 1);
    });
    const agentKey = e.metadata?.agent_name || "unknown";
    const prev = agentMap.get(agentKey) || { name: agentKey, role: e.metadata?.agent_role || "", count: 0 };
    agentMap.set(agentKey, { ...prev, count: prev.count + 1 });
  });

  return {
    totalExecutions: events.length,
    withSkillInjection: withSkills.length,
    withoutSkillInjection: events.length - withSkills.length,
    injectionRate: events.length > 0 ? (withSkills.length / events.length) * 100 : 0,
    topSkills: [...skillMap.entries()]
      .map(([name, v]) => ({ name, count: v.count, avgStrength: v.totalStrength / v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    topAgents: [...agentMap.values()].sort((a, b) => b.count - a.count).slice(0, 5),
    topCapabilities: [...capMap.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export function SkillRuntimeTab() {
  const [limit, setLimit] = useState(100);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["skill-runtime-events", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, created_at, message, metadata")
        .eq("action", "agent_executed_subtask")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as SkillUsageEvent[];
    },
  });

  const stats = computeStats(events);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            KX-4 — Runtime Skill Use
          </CardTitle>
          <CardDescription>
            Monitora como skills governadas são injetadas no contexto dos agentes durante a execução real de subtasks.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.totalExecutions}</div>
            <div className="text-xs text-muted-foreground">Execuções Totais</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.withSkillInjection}</div>
            <div className="text-xs text-muted-foreground">Com Skill Injection</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{stats.withoutSkillInjection}</div>
            <div className="text-xs text-muted-foreground">Sem Skill Injection</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-accent-foreground">{stats.injectionRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Taxa de Injeção</div>
          </CardContent>
        </Card>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Skills */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Skills Mais Utilizadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma skill foi injetada em runtime ainda. Execute subtasks com organizationId para ativar a injeção.
                </p>
              ) : (
                <div className="space-y-2">
                  {stats.topSkills.map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-[200px] text-foreground">{s.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{s.count}×</Badge>
                        <Badge variant="outline" className="text-xs">
                          str: {(s.avgStrength * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Capabilities */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Capabilities Ativas em Runtime
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topCapabilities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma capability foi ativada em runtime.
                </p>
              ) : (
                <div className="space-y-2">
                  {stats.topCapabilities.map((c) => (
                    <div key={c.key} className="flex items-center justify-between text-sm">
                      <Badge variant="outline" className="font-mono text-xs">{c.key}</Badge>
                      <span className="text-muted-foreground">{c.count} usos</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Agents */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                Agentes com Skill Injection
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topAgents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum agente utilizou skills em runtime.
                </p>
              ) : (
                <div className="space-y-2">
                  {stats.topAgents.map((a) => (
                    <div key={a.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-medium">@{a.name}</span>
                        <Badge variant="secondary" className="text-xs">{a.role}</Badge>
                      </div>
                      <span className="text-muted-foreground">{a.count}×</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Events */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Eventos Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma execução de subtask registrada.
                </p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {events.slice(0, 10).map((e) => {
                    const injected = e.metadata?.skill_context_injected;
                    const bindingCount = e.metadata?.skill_bindings_used?.length || 0;
                    return (
                      <div key={e.id} className="flex items-start gap-2 text-xs border-b border-border pb-2 last:border-0">
                        {injected ? (
                          <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-foreground truncate">{e.message}</div>
                          <div className="text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span>{new Date(e.created_at).toLocaleString("pt-BR")}</span>
                            {injected && <Badge variant="outline" className="text-[10px] px-1">{bindingCount} skills</Badge>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {events.length >= limit && (
                <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setLimit(l => l + 100)}>
                  Carregar mais
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
