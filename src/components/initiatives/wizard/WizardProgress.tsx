import { cn } from "@/lib/utils";
import { WIZARD_STEPS } from "./types";
import { Check } from "lucide-react";

interface Props {
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function WizardProgress({ currentStep, onStepClick }: Props) {
  return (
    <div className="flex items-center gap-1 w-full px-1">
      {WIZARD_STEPS.map((step, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;
        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <button
              onClick={() => isCompleted && onStepClick(i)}
              disabled={!isCompleted}
              className={cn(
                "flex items-center gap-1.5 text-[10px] font-medium transition-colors whitespace-nowrap",
                isCompleted && "text-foreground cursor-pointer hover:text-primary",
                isCurrent && "text-foreground",
                !isCompleted && !isCurrent && "text-muted-foreground/50"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold shrink-0 transition-all",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-foreground text-background ring-2 ring-ring ring-offset-1 ring-offset-background",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-3 w-3" /> : step.number}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {i < WIZARD_STEPS.length - 1 && (
              <div className={cn("flex-1 h-px mx-1.5", isCompleted ? "bg-primary" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
