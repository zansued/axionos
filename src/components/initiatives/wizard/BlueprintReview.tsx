import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, RotateCcw, Pencil, TrendingUp, Users, Target, Lightbulb, Layers } from "lucide-react";
import type { InitiativeBrief, AIBlueprint } from "./types";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  brief: InitiativeBrief;
  blueprint: AIBlueprint;
  meta: { cost_usd?: number; duration_ms?: number };
  onChange: (updates: Partial<InitiativeBrief>) => void;
  onApprove: () => void;
  onRegenerate: () => void;
}

export function BlueprintReview({ brief, blueprint, meta, onChange, onApprove, onRegenerate }: Props) {
  const [editingField, setEditingField] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Meta info */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
        <Lightbulb className="h-3 w-3" />
        Generated in {meta.duration_ms ? `${(meta.duration_ms / 1000).toFixed(1)}s` : "—"}
        {meta.cost_usd !== undefined && <> · ${meta.cost_usd.toFixed(4)}</>}
      </div>

      {/* Blueprint sections */}
      <div className="rounded-lg border border-border divide-y divide-border">
        <EditableRow
          icon={<Target className="h-3.5 w-3.5" />}
          label="Project Name"
          value={brief.name}
          editing={editingField === "name"}
          onEdit={() => setEditingField("name")}
          onSave={(v) => { onChange({ name: v }); setEditingField(null); }}
          onCancel={() => setEditingField(null)}
        />
        <EditableRow
          icon={<Layers className="h-3.5 w-3.5" />}
          label="Description"
          value={brief.description}
          editing={editingField === "description"}
          onEdit={() => setEditingField("description")}
          onSave={(v) => { onChange({ description: v }); setEditingField(null); }}
          onCancel={() => setEditingField(null)}
          multiline
        />
        <EditableRow
          icon={<Target className="h-3.5 w-3.5" />}
          label="Problem"
          value={brief.problem_statement}
          editing={editingField === "problem"}
          onEdit={() => setEditingField("problem")}
          onSave={(v) => { onChange({ problem_statement: v }); setEditingField(null); }}
          onCancel={() => setEditingField(null)}
          multiline
        />
        <EditableRow
          icon={<Users className="h-3.5 w-3.5" />}
          label="Target Audience"
          value={brief.target_audience}
          editing={editingField === "audience"}
          onEdit={() => setEditingField("audience")}
          onSave={(v) => { onChange({ target_audience: v }); setEditingField(null); }}
          onCancel={() => setEditingField(null)}
        />

        {/* AI-only insights (read-only) */}
        {blueprint.market_opportunity && (
          <div className="px-4 py-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" /> Market Opportunity
            </div>
            <p className="text-sm">{blueprint.market_opportunity}</p>
          </div>
        )}
        {blueprint.competitor_insights && (
          <div className="px-4 py-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> Competitor Insights
            </div>
            <p className="text-sm">{blueprint.competitor_insights}</p>
          </div>
        )}

        {/* Features */}
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lightbulb className="h-3 w-3" /> Suggested Features
          </div>
          <div className="flex flex-wrap gap-1.5">
            {brief.core_features.map((f, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal">{f}</Badge>
            ))}
          </div>
        </div>

        {/* Complexity + Type */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="text-xs">
              <span className="text-muted-foreground">Type: </span>
              <span className="font-medium">{blueprint.product_type}</span>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Complexity: </span>
              <Badge variant={blueprint.estimated_complexity === "high" ? "destructive" : "secondary"} className="text-[10px]">
                {blueprint.estimated_complexity}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* AI reasoning */}
      {blueprint.reasoning && (
        <div className="rounded-md bg-muted/50 border border-border/50 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground leading-relaxed">💡 {blueprint.reasoning}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onRegenerate} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> Start Over
        </Button>
        <Button size="sm" onClick={onApprove} className="flex-1 gap-1.5">
          <Check className="h-3.5 w-3.5" /> Approve & Continue
        </Button>
      </div>
    </div>
  );
}

function EditableRow({
  icon, label, value, editing, onEdit, onSave, onCancel, multiline,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  editing: boolean;
  onEdit: () => void;
  onSave: (val: string) => void;
  onCancel: () => void;
  multiline?: boolean;
}) {
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon} {label}</div>
        {multiline ? (
          <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="text-sm min-h-[60px]" autoFocus />
        ) : (
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} className="text-sm h-8" autoFocus />
        )}
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
          <Button size="sm" className="h-7 text-xs" onClick={() => onSave(draft)}>Save</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-start justify-between gap-3 px-4 py-3 group cursor-pointer hover:bg-accent/30 transition-colors")} onClick={onEdit}>
      <div className="space-y-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon} {label}</div>
        <p className="text-sm">{value || <span className="text-muted-foreground/50">—</span>}</p>
      </div>
      <Pencil className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors mt-1 shrink-0" />
    </div>
  );
}
