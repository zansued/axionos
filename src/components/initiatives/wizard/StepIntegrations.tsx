import { cn } from "@/lib/utils";
import { INTEGRATION_OPTIONS } from "./types";
import type { InitiativeBrief } from "./types";

interface Props {
  brief: InitiativeBrief;
  onChange: (updates: Partial<InitiativeBrief>) => void;
}

export function StepIntegrations({ brief, onChange }: Props) {
  const toggle = (value: string) => {
    const next = brief.integrations.includes(value)
      ? brief.integrations.filter((v) => v !== value)
      : [...brief.integrations, value];
    onChange({ integrations: next });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Integrations</h3>
        <p className="text-sm text-muted-foreground mt-1">Select the integrations your product needs. This step is optional.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {INTEGRATION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3.5 text-left transition-all",
              brief.integrations.includes(opt.value)
                ? "border-foreground bg-accent shadow-sm"
                : "border-border hover:border-muted-foreground/40 hover:bg-accent/50"
            )}
          >
            <span className="text-lg">{opt.icon}</span>
            <span className="font-medium text-sm">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
