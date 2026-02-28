import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { KanbanCard } from "./KanbanCard";
import type { Story, StoryMetrics } from "./types";
import type { COLUMNS } from "./types";

function DraggableCard({ story, metrics }: { story: Story; metrics?: StoryMetrics }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: story.id });

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
      <KanbanCard story={story} metrics={metrics} />
    </div>
  );
}

export function DroppableColumn({
  column,
  stories,
  metricsMap,
}: {
  column: (typeof COLUMNS)[0];
  stories: Story[];
  metricsMap: Record<string, StoryMetrics>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  // Column aggregate stats
  const colCost = stories.reduce((sum, s) => sum + (metricsMap[s.id]?.cost || 0), 0);

  return (
    <div className="flex flex-col min-w-[260px] w-full">
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${column.accent}`}>
        <h3 className="font-display text-sm font-semibold">{column.label}</h3>
        <span className="text-xs text-muted-foreground font-mono bg-muted/50 rounded px-1.5">
          {stories.length}
        </span>
        {colCost > 0 && (
          <span className="text-[10px] text-muted-foreground ml-auto font-mono">
            ${colCost.toFixed(2)}
          </span>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-lg p-2 min-h-[200px] transition-colors ${
          isOver ? "bg-primary/5 ring-1 ring-primary/20" : "bg-muted/20"
        }`}
      >
        {stories.map((story) => (
          <DraggableCard key={story.id} story={story} metrics={metricsMap[story.id]} />
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
