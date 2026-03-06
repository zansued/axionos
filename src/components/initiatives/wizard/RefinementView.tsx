import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { INTEGRATION_OPTIONS, GENERATION_DEPTHS } from "./types";
import type { InitiativeBrief } from "./types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEPLOY_TARGETS = [
  { value: "vercel", label: "Vercel", icon: "▲", available: true },
  { value: "local", label: "Local Repository", icon: "💾", available: true },
  { value: "docker", label: "Docker", icon: "🐳", available: false },
];

interface Props {
  brief: InitiativeBrief;
  onChange: (updates: Partial<InitiativeBrief>) => void;
  onSubmit: () => void;
  onBack: () => void;
  isPending: boolean;
}

export function RefinementView({ brief, onChange, onSubmit, onBack, isPending }: Props) {
  const toggleIntegration = (value: string) => {
    const next = brief.integrations.includes(value)
      ? brief.integrations.filter((v) => v !== value)
      : [...brief.integrations, value];
    onChange({ integrations: next });
  };

  const updateTech = (key: keyof InitiativeBrief["technical_preferences"], val: string) => {
    onChange({ technical_preferences: { ...brief.technical_preferences, [key]: val } });
  };

  return (
    <div className="space-y-5">
      {/* Integrations */}
      <div className="space-y-2.5">
        <Label className="text-xs text-muted-foreground">Integrations</Label>
        <div className="grid gap-2 grid-cols-3">
          {INTEGRATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggleIntegration(opt.value)}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all text-xs",
                brief.integrations.includes(opt.value)
                  ? "border-foreground bg-accent"
                  : "border-border hover:border-muted-foreground/40"
              )}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline depth */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Pipeline Depth</Label>
        <Select value={brief.generation_depth} onValueChange={(v: any) => onChange({ generation_depth: v })}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GENERATION_DEPTHS.map((d) => (
              <SelectItem key={d.value} value={d.value} className="text-sm">
                <div className="flex items-center gap-2">
                  {d.label}
                  {d.badge && <Badge variant="secondary" className="text-[9px] ml-1">{d.badge}</Badge>}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tech prefs */}
      <div className="space-y-2.5">
        <Label className="text-xs text-muted-foreground">Stack Preferences (optional)</Label>
        <div className="grid gap-3 grid-cols-2">
          <Input value={brief.technical_preferences.frontend || ""} onChange={(e) => updateTech("frontend", e.target.value)} placeholder="Frontend" className="h-8 text-xs" />
          <Input value={brief.technical_preferences.backend || ""} onChange={(e) => updateTech("backend", e.target.value)} placeholder="Backend" className="h-8 text-xs" />
          <Input value={brief.technical_preferences.database || ""} onChange={(e) => updateTech("database", e.target.value)} placeholder="Database" className="h-8 text-xs" />
          <Input value={brief.technical_preferences.ui_framework || ""} onChange={(e) => updateTech("ui_framework", e.target.value)} placeholder="UI Framework" className="h-8 text-xs" />
        </div>
      </div>

      {/* Deploy target */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Deploy Target</Label>
        <div className="flex gap-2">
          {DEPLOY_TARGETS.map((t) => (
            <button
              key={t.value}
              onClick={() => t.available && onChange({ deployment_target: t.value })}
              disabled={!t.available}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all flex-1",
                brief.deployment_target === t.value
                  ? "border-foreground bg-accent"
                  : t.available ? "border-border hover:border-muted-foreground/40" : "border-border opacity-40 cursor-not-allowed"
              )}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <Button size="sm" onClick={onSubmit} disabled={isPending} className="flex-1 gap-1.5">
          <Rocket className="h-3.5 w-3.5" /> Start Initiative Pipeline
        </Button>
      </div>
    </div>
  );
}
