import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, FileCode2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Subtask = {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  sort_order: number;
  phase_id: string;
  file_path?: string | null;
  file_type?: string | null;
};

function SortableSubtaskItem({
  subtask,
  onToggle,
  onDelete,
}: {
  subtask: Subtask;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isCompleted = subtask.status === "completed";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-border/40 bg-card/50 px-2 py-1.5 group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing shrink-0 text-muted-foreground/40 hover:text-muted-foreground"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Checkbox
        checked={isCompleted}
        onCheckedChange={(checked) => onToggle(subtask.id, !!checked)}
        className="shrink-0"
      />
      <span
        className={`text-sm flex-1 ${isCompleted ? "line-through text-muted-foreground/60" : ""}`}
      >
        {subtask.file_path && (
          <span className="inline-flex items-center gap-1 mr-1.5">
            <FileCode2 className="h-3 w-3 text-primary/70" />
            <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono">
              {subtask.file_path}
            </Badge>
          </span>
        )}
        {subtask.description}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
        onClick={() => onDelete(subtask.id)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function SubtaskList({ phaseId, subtasks: initialSubtasks }: { phaseId: string; subtasks: Subtask[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const subtasks = [...initialSubtasks].sort((a, b) => a.sort_order - b.sort_order);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["story-phases"] });

  const createMutation = useMutation({
    mutationFn: async (description: string) => {
      const nextOrder = subtasks.length;
      const { error } = await supabase.from("story_subtasks").insert({
        phase_id: phaseId,
        description,
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setNewDesc(""); setAdding(false); },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: e.message }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("story_subtasks")
        .update({ status: completed ? "completed" : "pending" } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("story_subtasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: async (reordered: Subtask[]) => {
      const updates = reordered.map((s, i) =>
        supabase.from("story_subtasks").update({ sort_order: i }).eq("id", s.id)
      );
      await Promise.all(updates);
    },
    onSuccess: invalidate,
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = subtasks.findIndex((s) => s.id === active.id);
    const newIndex = subtasks.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(subtasks, oldIndex, newIndex);
    reorderMutation.mutate(reordered);
  };

  const handleAdd = () => {
    if (newDesc.trim()) createMutation.mutate(newDesc.trim());
  };

  return (
    <div className="space-y-1.5 pl-4 border-l-2 border-border/30 ml-1">
      {subtasks.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={subtasks.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {subtasks.map((subtask) => (
              <SortableSubtaskItem
                key={subtask.id}
                subtask={subtask}
                onToggle={(id, completed) => toggleMutation.mutate({ id, completed })}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
      {adding ? (
        <div className="flex gap-2">
          <Input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Descrição da subtask"
            className="h-7 text-xs"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={createMutation.isPending}>
            OK
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>
            ✕
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          <Plus className="h-3 w-3" /> Subtask
        </button>
      )}
    </div>
  );
}
