import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InitiativeBrief } from "./types";

interface Props {
  brief: InitiativeBrief;
  onChange: (updates: Partial<InitiativeBrief>) => void;
}

export function StepTechPrefs({ brief, onChange }: Props) {
  const update = (key: keyof InitiativeBrief["technical_preferences"], val: string) => {
    onChange({ technical_preferences: { ...brief.technical_preferences, [key]: val } });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Technical Preferences</h3>
        <p className="text-sm text-muted-foreground mt-1">Optional. Leave blank and the system will decide the best stack.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs">Frontend</Label>
          <Input
            value={brief.technical_preferences.frontend || ""}
            onChange={(e) => update("frontend", e.target.value)}
            placeholder="e.g. React, Vue, Next.js"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Backend</Label>
          <Input
            value={brief.technical_preferences.backend || ""}
            onChange={(e) => update("backend", e.target.value)}
            placeholder="e.g. Node.js, Supabase, FastAPI"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Database</Label>
          <Input
            value={brief.technical_preferences.database || ""}
            onChange={(e) => update("database", e.target.value)}
            placeholder="e.g. PostgreSQL, MongoDB"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">UI Framework</Label>
          <Input
            value={brief.technical_preferences.ui_framework || ""}
            onChange={(e) => update("ui_framework", e.target.value)}
            placeholder="e.g. Tailwind, Material UI, shadcn/ui"
            className="h-9 text-sm"
          />
        </div>
      </div>

      <div className="rounded-md bg-muted/50 border border-border px-3 py-2.5">
        <p className="text-[11px] text-muted-foreground">💡 The pipeline will automatically select the best technologies based on your product type if you leave these blank.</p>
      </div>
    </div>
  );
}
