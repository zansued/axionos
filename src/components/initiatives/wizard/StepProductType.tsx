import { cn } from "@/lib/utils";
import { PRODUCT_TYPES } from "./types";
import type { InitiativeBrief } from "./types";

interface Props {
  brief: InitiativeBrief;
  onChange: (updates: Partial<InitiativeBrief>) => void;
}

export function StepProductType({ brief, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">What type of product?</h3>
        <p className="text-sm text-muted-foreground mt-1">This helps estimate architecture and complexity.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PRODUCT_TYPES.map((pt) => (
          <button
            key={pt.value}
            onClick={() => onChange({ product_type: pt.value })}
            className={cn(
              "flex flex-col items-start gap-1.5 rounded-lg border p-4 text-left transition-all",
              brief.product_type === pt.value
                ? "border-foreground bg-accent shadow-sm"
                : "border-border hover:border-muted-foreground/40 hover:bg-accent/50"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{pt.icon}</span>
              <span className="font-medium text-sm">{pt.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{pt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
