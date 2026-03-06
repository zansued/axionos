import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import type { InitiativeBrief } from "./types";

interface Props {
  brief: InitiativeBrief;
  onChange: (updates: Partial<InitiativeBrief>) => void;
}

export function StepFeatures({ brief, onChange }: Props) {
  const [input, setInput] = useState("");

  const addFeature = () => {
    const val = input.trim();
    if (!val || brief.core_features.length >= 8) return;
    onChange({ core_features: [...brief.core_features, val] });
    setInput("");
  };

  const removeFeature = (idx: number) => {
    onChange({ core_features: brief.core_features.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Core Features</h3>
        <p className="text-sm text-muted-foreground mt-1">List 3–5 main features your product should have.</p>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
            placeholder="e.g. User authentication, Appointment scheduler, Invoice generator"
            autoFocus
          />
          <Button size="sm" variant="outline" onClick={addFeature} disabled={!input.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {brief.core_features.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No features added yet.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">What are the main actions users should perform?</p>
          </div>
        )}

        <div className="space-y-2">
          {brief.core_features.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm">
              <span className="text-muted-foreground text-xs font-mono">{i + 1}.</span>
              <span className="flex-1">{f}</span>
              <button onClick={() => removeFeature(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
