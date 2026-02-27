import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
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
import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { GripVertical, User, Radio, WifiOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const COLUMNS: { id: string; label: string; accent: string }[] = [
  { id: "todo", label: "A Fazer", accent: "border-muted-foreground/30" },
  { id: "in_progress", label: "Em Progresso", accent: "border-info" },
  { id: "done", label: "Concluído", accent: "border-success" },
  { id: "blocked", label: "Bloqueado", accent: "border-destructive" },
];

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "bg-muted-foreground/20 text-muted-foreground" },
  medium: { label: "Média", color: "bg-info/20 text-info" },
  high: { label: "Alta", color: "bg-warning/20 text-warning" },
  critical: { label: "Crítica", color: "bg-destructive/20 text-destructive" },
};

type Story = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_agent_id: string | null;
  agents: { name: string; role: string } | null;
};

function KanbanCard({ story, isDragging }: { story: Story; isDragging?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-border/50 bg-card p-3 space-y-2 cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging ? "shadow-lg shadow-primary/20 ring-1 ring-primary/30 opacity-90" : "hover:border-primary/20"
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium font-display leading-tight truncate">{story.title}</p>
          {story.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{story.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_MAP[story.priority]?.color}`}>
          {PRIORITY_MAP[story.priority]?.label}
        </Badge>
        {story.agents && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
            <User className="h-2.5 w-2.5" />
            {story.agents.name}
          </Badge>
        )}
      </div>
    </div>
  );
}

function DroppableColumn({
  column,
  stories,
}: {
  column: (typeof COLUMNS)[0];
  stories: Story[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col min-w-[260px] w-full">
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${column.accent}`}>
        <h3 className="font-display text-sm font-semibold">{column.label}</h3>
        <span className="text-xs text-muted-foreground font-mono bg-muted/50 rounded px-1.5">
          {stories.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-lg p-2 min-h-[200px] transition-colors ${
          isOver ? "bg-primary/5 ring-1 ring-primary/20" : "bg-muted/20"
        }`}
      >
        {stories.map((story) => (
          <DraggableCard key={story.id} story={story} />
        ))}
        {stories.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50 border border-dashed border-border/30 rounded-lg">
            Arraste stories aqui
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ story }: { story: Story }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable(story.id);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      <KanbanCard story={story} />
    </div>
  );
}

function useDraggable(id: string) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDndDraggable({ id });
  return { attributes, listeners, setNodeRef, transform, isDragging };
}

// We need to use the actual dnd-kit draggable hook
import { useDraggable as useDndDraggable } from "@dnd-kit/core";

export default function Kanban() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*, agents(name, role)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Story[];
    },
  });

  // Realtime subscription for auto-updating
  useEffect(() => {
    if (!realtimeEnabled) return;

    const channel = supabase
      .channel("kanban-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stories" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["stories"] });
          queryClient.invalidateQueries({ queryKey: ["story-count"] });
          queryClient.invalidateQueries({ queryKey: ["in-progress-stories"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "story_subtasks" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["stories-with-phases"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [realtimeEnabled, queryClient]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("stories")
        .update({ status: status as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["story-count"] });
      queryClient.invalidateQueries({ queryKey: ["in-progress-stories"] });
    },
    onError: (e: any) =>
      toast({ variant: "destructive", title: "Erro ao mover", description: e.message }),
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

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
            {realtimeEnabled ? (
              <Radio className="h-3.5 w-3.5 text-success animate-pulse-glow" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <Label htmlFor="realtime-toggle" className="text-xs text-muted-foreground cursor-pointer">
              {realtimeEnabled ? "Tempo real ativo" : "Tempo real desativado"}
            </Label>
            <Switch
              id="realtime-toggle"
              checked={realtimeEnabled}
              onCheckedChange={setRealtimeEnabled}
            />
          </div>
        </div>

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
                />
              ))}
            </div>
            <DragOverlay>
              {activeStory ? <KanbanCard story={activeStory} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </AppLayout>
  );
}
