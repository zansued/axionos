import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, ArrowRight, Rocket } from "lucide-react";
import { WizardProgress } from "./WizardProgress";
import { StepIdea } from "./StepIdea";
import { StepProductType } from "./StepProductType";
import { StepFeatures } from "./StepFeatures";
import { StepIntegrations } from "./StepIntegrations";
import { StepDepth } from "./StepDepth";
import { StepTechPrefs } from "./StepTechPrefs";
import { StepDeploy } from "./StepDeploy";
import { StepSummary } from "./StepSummary";
import type { InitiativeBrief } from "./types";

const INITIAL_BRIEF: InitiativeBrief = {
  name: "",
  description: "",
  problem_statement: "",
  target_audience: "",
  product_type: "",
  core_features: [],
  integrations: [],
  generation_depth: "full_pipeline",
  technical_preferences: {},
  deployment_target: "vercel",
};

interface Props {
  onSubmit: (brief: InitiativeBrief) => void;
  isPending: boolean;
}

export function InitiativeWizard({ onSubmit, isPending }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState<InitiativeBrief>({ ...INITIAL_BRIEF });

  const update = useCallback((updates: Partial<InitiativeBrief>) => {
    setBrief((prev) => ({ ...prev, ...updates }));
  }, []);

  const reset = () => {
    setBrief({ ...INITIAL_BRIEF });
    setStep(0);
  };

  const canNext = (): boolean => {
    switch (step) {
      case 0: return !!brief.name.trim() && !!brief.description.trim();
      case 1: return !!brief.product_type;
      case 2: return brief.core_features.length >= 1;
      default: return true;
    }
  };

  const totalSteps = 8;

  const handleSubmit = () => {
    onSubmit(brief);
    reset();
    setOpen(false);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) reset();
  };

  const stepContent = [
    <StepIdea key="idea" brief={brief} onChange={update} />,
    <StepProductType key="type" brief={brief} onChange={update} />,
    <StepFeatures key="features" brief={brief} onChange={update} />,
    <StepIntegrations key="integrations" brief={brief} onChange={update} />,
    <StepDepth key="depth" brief={brief} onChange={update} />,
    <StepTechPrefs key="tech" brief={brief} onChange={update} />,
    <StepDeploy key="deploy" brief={brief} onChange={update} />,
    <StepSummary key="summary" brief={brief} />,
  ];

  const isLast = step === totalSteps - 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> New Initiative</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-base">Create Initiative</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <WizardProgress currentStep={step} onStepClick={setStep} />
        </div>

        <div className="flex-1 overflow-y-auto py-2 pr-1 min-h-0">
          {stepContent[step]}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>

          <div className="text-xs text-muted-foreground">
            {step + 1} / {totalSteps}
          </div>

          {isLast ? (
            <Button size="sm" onClick={handleSubmit} disabled={isPending} className="gap-1.5">
              <Rocket className="h-3.5 w-3.5" /> Start Pipeline
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={!canNext()} className="gap-1.5">
              Next <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
