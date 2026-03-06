import { cn } from "@/lib/utils";
import type { InitiativeBrief } from "./types";

const TARGETS = [
  { value: "vercel", label: "Vercel", icon: "▲", desc: "Recommended. Instant deploy with CI/CD.", available: true },
  { value: "aws", label: "AWS", icon: "☁️", desc: "Coming soon.", available: false },
  { value: "docker", label: "Docker", icon: "🐳", desc: "Coming soon.", available: false },
  { value: "local", label: "Local Repository", icon: "💾", desc: "Clone and run locally.", available: true },
];

interface Props {
  brief: InitiativeBrief;
  onChange: (updates: Partial<InitiativeBrief>) => void;
}

export function StepDeploy({ brief, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Deployment Target</h3>
        <p className="text-sm text-muted-foreground mt-1">Where should the generated code be deployed?</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {TARGETS.map((t) => (
          <button
            key={t.value}
            onClick={() => t.available && onChange({ deployment_target: t.value })}
            disabled={!t.available}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-4 text-left transition-all",
              brief.deployment_target === t.value
                ? "border-foreground bg-accent shadow-sm"
                : t.available
                  ? "border-border hover:border-muted-foreground/40 hover:bg-accent/50"
                  : "border-border opacity-50 cursor-not-allowed"
            )}
          >
            <span className="text-xl mt-0.5">{t.icon}</span>
            <div>
              <span className="font-medium text-sm">{t.label}</span>
              <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
