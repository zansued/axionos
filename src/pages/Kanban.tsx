import { useState, useMemo, useEffect } from "react";
import { getUserFriendlyError } from "@/lib/error-utils";
import { InitiativeFilter } from "@/components/InitiativeFilter";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Radio, WifiOff, DollarSign, AlertTriangle, Clock, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { KanbanCard } from "@/components/kanban/KanbanCard";
import { DroppableColumn } from "@/components/kanban/DroppableColumn";
import { useKanbanMetrics } from "@/components/kanban/useKanbanMetrics";
import { COLUMNS, type Story } from "@/components/kanban/types";

export default function Kanban() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [initiativeFilter, setInitiativeFilter] = useState<string>("all");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["stories", initiativeFilter],
    queryFn: async () => {
      let query = supabase
        .from("stories")
        .select("*, agents(name, role)")
        .order("created_at", { ascending: false });
      if (initiativeFilter !== "all") {
        query = query.eq("initiative_id", initiativeFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Story[];
    },
  });

  const metricsMap = useKanbanMetrics(stories);

  // Realtime subscription
  useEffect(() => {
    if (!realtimeEnabled) return;
    const channel = supabase
      .channel("kanban-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => {
        queryClient.invalidateQueries({ queryKey: ["stories"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "story_subtasks" }, () => {
        queryClient.invalidateQueries({ queryKey: ["kanban-phases"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_outputs" }, () => {
        queryClient.invalidateQueries({ queryKey: ["kanban-outputs"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [realtimeEnabled, queryClient]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("stories").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
    },
    onError: (e: any) =>
      toast({ variant: "destructive", title: "Erro ao mover", description: getUserFriendlyError(e) }),
  });

  const storiesByStatus = useMemo(() => {
    const map: Record<string, Story[]> = {};
    COLUMNS.forEach((c) => (map[c.id] = []));
    stories.forEach((s) => {
      if (map[s.status]) map[s.status].push(s);
    });
    return map;
  }, [stories]);

  const activeStory = activeId ? stories.find((s) => s.id === activeId) : null;

  // Aggregate stats
  const totalCost = useMemo(() => Object.values(metricsMap).reduce((s, m) => s + m.cost, 0), [metricsMap]);
  const highRiskCount = useMemo(() => Object.values(metricsMap).filter((m) => m.riskLevel === "high" || m.riskLevel === "critical").length, [metricsMap]);
  const avgExecTime = useMemo(() => {
    const times = Object.values(metricsMap).filter((m) => m.avgTime > 0);
    return times.length > 0 ? times.reduce((s, m) => s + m.avgTime, 0) / times.length : 0;
  }, [metricsMap]);
  const passRate = useMemo(() => {
    const validated = Object.values(metricsMap).filter((m) => m.validationStatus !== "none");
    if (validated.length === 0) return null;
    return (validated.filter((m) => m.validationStatus === "pass").length / validated.length) * 100;
  }, [metricsMap]);

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const storyId = active.id as string;
    const newStatus = over.id as string;
    const story = stories.find((s) => s.id === storyId);
    if (story && story.status !== newStatus && COLUMNS.some((c) => c.id === newStatus)) {
      updateStatusMutation.mutate({ id: storyId, status: newStatus });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Kanban</h1>
            <p className="text-muted-foreground mt-1">
              Arraste stories entre colunas para alterar o status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <InitiativeFilter value={initiativeFilter} onChange={setInitiativeFilter} />
            {realtimeEnabled ? (
              <Radio className="h-3.5 w-3.5 text-success animate-pulse-glow" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <Label htmlFor="realtime-toggle" className="text-xs text-muted-foreground cursor-pointer">
              {realtimeEnabled ? "Tempo real ativo" : "Tempo real desativado"}
            </Label>
            <Switch id="realtime-toggle" checked={realtimeEnabled} onCheckedChange={setRealtimeEnabled} />
          </div>
        </div>

        {/* Summary stats bar */}
        {stories.length > 0 && (
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border/30 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Custo total: <strong className="text-foreground">${totalCost.toFixed(2)}</strong>
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Alto risco: <strong className={highRiskCount > 0 ? "text-warning" : "text-foreground"}>{highRiskCount}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Tempo médio:{" "}
              <strong className="text-foreground">
                {avgExecTime < 1000 ? `${Math.round(avgExecTime)}ms` : `${(avgExecTime / 1000).toFixed(1)}s`}
              </strong>
            </span>
            {passRate !== null && (
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Validação:{" "}
                <strong className={passRate >= 80 ? "text-success" : passRate >= 50 ? "text-warning" : "text-destructive"}>
                  {passRate.toFixed(0)}%
                </strong>
              </span>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 rounded-lg bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {COLUMNS.map((col) => (
                <DroppableColumn
                  key={col.id}
                  column={col}
                  stories={storiesByStatus[col.id] || []}
                  metricsMap={metricsMap}
                />
              ))}
            </div>
            <DragOverlay>
              {activeStory ? <KanbanCard story={activeStory} metrics={metricsMap[activeStory.id]} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </AppLayout>
  );
}
