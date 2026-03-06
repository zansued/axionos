import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { GENERATION_DEPTHS } from "./types";
import type { InitiativeBrief } from "./types";

interface Props {
  brief: InitiativeBrief;
  onChange: (updates: Partial<InitiativeBrief>) => void;
}

export function StepDepth({ brief, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Generation Depth</h3>
        <p className="text-sm text-muted-foreground mt-1">Choose how far the pipeline should go.</p>
      </div>

      <div className="space-y-3">
        {GENERATION_DEPTHS.map((d) => (
          <button
            key={d.value}
            onClick={() => onChange({ generation_depth: d.value })}
            className={cn(
              "w-full flex items-start gap-3 rounded-lg border p-4 text-left transition-all",
              brief.generation_depth === d.value
                ? "border-foreground bg-accent shadow-sm"
                : "border-border hover:border-muted-foreground/40 hover:bg-accent/50"
            )}
          >
            <div className={cn(
              "mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 transition-colors",
              brief.generation_depth === d.value ? "border-foreground bg-foreground" : "border-muted-foreground/40"
            )} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{d.label}</span>
                {d.badge && <Badge variant="secondary" className="text-[10px]">{d.badge}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{d.desc}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">{d.stages}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
