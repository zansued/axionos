import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Radio, Users, BookOpen, Zap, Clock, CircleDot, Pause, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type LiveEvent = {
  id: string;
  type: "agent" | "story" | "audit";
  action: string;
  message: string;
  timestamp: string;
  severity?: string;
};

const EVENT_STYLES: Record<string, { icon: typeof Activity; color: string; bg: string }> = {
  agent: { icon: Users, color: "text-primary", bg: "bg-primary/10" },
  story: { icon: BookOpen, color: "text-accent", bg: "bg-accent/10" },
  audit: { icon: Zap, color: "text-warning", bg: "bg-warning/10" },
};

const SEVERITY_BADGE: Record<string, string> = {
  info: "bg-info/20 text-info",
  warning: "bg-warning/20 text-warning",
  error: "bg-destructive/20 text-destructive",
  critical: "bg-destructive/20 text-destructive",
};

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatTimeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s atrás`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m atrás`;
  return `${Math.floor(diff / 3600000)}h atrás`;
}

export default function Observability() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "error">("connecting");

  const addEvent = useCallback((event: LiveEvent) => {
    if (paused) return;
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === event.id);
      if (exists) return prev;
      return [event, ...prev].slice(0, 200);
    });
  }, [paused]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("observability-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "audit_logs" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const row = payload.new as any;
          addEvent({
            id: `audit-${row.id}`,
            type: "audit",
            action: row.action,
            message: row.message,
            timestamp: row.created_at,
            severity: row.severity,
          });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "agents" }, (payload) => {
        const row = (payload.new || payload.old) as any;
        const action = payload.eventType === "INSERT" ? "created" : payload.eventType === "UPDATE" ? "updated" : "deleted";
        addEvent({
          id: `agent-${row.id}-${Date.now()}`,
          type: "agent",
          action,
          message: `Agente "${row.name || "?"}" ${action === "created" ? "criado" : action === "updated" ? "atualizado" : "removido"}`,
          timestamp: new Date().toISOString(),
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, (payload) => {
        const row = (payload.new || payload.old) as any;
        const action = payload.eventType === "INSERT" ? "created" : payload.eventType === "UPDATE" ? "updated" : "deleted";
        addEvent({
          id: `story-${row.id}-${Date.now()}`,
          type: "story",
          action,
          message: `Story "${row.title || "?"}" ${action === "created" ? "criada" : action === "updated" ? "atualizada" : "removida"}`,
          timestamp: new Date().toISOString(),
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnectionStatus("connected");
        else if (status === "CLOSED" || status === "CHANNEL_ERROR") setConnectionStatus("error");
      });

    return () => { supabase.removeChannel(channel); };
  }, [addEvent]);

  // Load recent audit logs on mount
  const { data: recentLogs } = useQuery({
    queryKey: ["recent-audit-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  useEffect(() => {
    if (recentLogs) {
      const mapped = recentLogs.map((log: any) => ({
        id: `audit-${log.id}`,
        type: "audit" as const,
        action: log.action,
        message: log.message,
        timestamp: log.created_at,
        severity: log.severity,
      }));
      setEvents((prev) => {
        const existing = new Set(prev.map((e) => e.id));
        const newOnes = mapped.filter((e: LiveEvent) => !existing.has(e.id));
        return [...prev, ...newOnes].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 200);
      });
    }
  }, [recentLogs]);

  // Live stats
  const { data: activeAgentCount = 0 } = useQuery({
    queryKey: ["obs-active-agents"],
    queryFn: async () => {
      const { count } = await supabase.from("agents").select("*", { count: "exact", head: true }).eq("status", "active");
      return count ?? 0;
    },
    refetchInterval: 10000,
  });

  const { data: inProgressCount = 0 } = useQuery({
    queryKey: ["obs-in-progress"],
    queryFn: async () => {
      const { count } = await supabase.from("stories").select("*", { count: "exact", head: true }).eq("status", "in_progress");
      return count ?? 0;
    },
    refetchInterval: 10000,
  });

  const eventCounts = events.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
              <Radio className={`h-6 w-6 ${connectionStatus === "connected" ? "text-success animate-pulse" : connectionStatus === "error" ? "text-destructive" : "text-warning"}`} />
              Observabilidade
            </h1>
            <p className="text-muted-foreground mt-1">Monitoramento em tempo real do sistema AIOS</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`gap-1.5 ${connectionStatus === "connected" ? "border-success/30 text-success" : connectionStatus === "error" ? "border-destructive/30 text-destructive" : "border-warning/30 text-warning"}`}>
              <CircleDot className="h-3 w-3" />
              {connectionStatus === "connected" ? "Conectado" : connectionStatus === "error" ? "Erro" : "Conectando..."}
            </Badge>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPaused(!paused)}>
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {paused ? "Retomar" : "Pausar"}
            </Button>
          </div>
        </div>

        {/* Live Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Agentes Ativos", value: activeAgentCount, icon: Users, color: "text-success" },
            { label: "Stories em Progresso", value: inProgressCount, icon: Zap, color: "text-warning" },
            { label: "Eventos na Sessão", value: events.length, icon: Activity, color: "text-primary" },
            { label: "Último Evento", value: events[0] ? formatTimeAgo(events[0].timestamp) : "—", icon: Clock, color: "text-muted-foreground" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <stat.icon className={`h-5 w-5 ${stat.color} shrink-0`} />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-bold font-display">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Event Type Breakdown */}
        <div className="flex gap-2">
          {Object.entries(EVENT_STYLES).map(([type, style]) => (
            <Badge key={type} variant="outline" className={`gap-1.5 ${style.color}`}>
              <style.icon className="h-3 w-3" />
              {type === "agent" ? "Agentes" : type === "story" ? "Stories" : "Auditoria"}: {eventCounts[type] || 0}
            </Badge>
          ))}
        </div>

        {/* Live Event Feed */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Feed de Eventos em Tempo Real
              {paused && <Badge variant="outline" className="text-xs border-warning/30 text-warning">Pausado</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-3">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Radio className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Aguardando eventos...</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Crie ou edite agentes e stories para ver eventos aqui</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <AnimatePresence initial={false}>
                    {events.map((event) => {
                      const style = EVENT_STYLES[event.type] || EVENT_STYLES.audit;
                      const Icon = style.icon;
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -20, height: 0 }}
                          animate={{ opacity: 1, x: 0, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-start gap-3 rounded-md px-3 py-2 hover:bg-muted/30 transition-colors"
                        >
                          <div className={`mt-0.5 rounded-md p-1.5 ${style.bg} shrink-0`}>
                            <Icon className={`h-3.5 w-3.5 ${style.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-snug">{event.message}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-muted-foreground font-mono">{formatTime(event.timestamp)}</span>
                              {event.severity && (
                                <Badge className={`text-[10px] px-1.5 py-0 ${SEVERITY_BADGE[event.severity] || ""}`}>
                                  {event.severity}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
