import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { QuickStartView } from "./QuickStartView";
import { BlueprintReview } from "./BlueprintReview";
import { RefinementView } from "./RefinementView";
import { SimulationView, SimulationLoading } from "./SimulationView";
import type { SimulationReport } from "./SimulationView";
import type { InitiativeBrief, AIBlueprint } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type WizardPhase = "quick-start" | "analyzing" | "review" | "refine" | "simulating" | "simulation-result";

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
  const [phase, setPhase] = useState<WizardPhase>("quick-start");
  const [brief, setBrief] = useState<InitiativeBrief>({ ...INITIAL_BRIEF });
  const [blueprint, setBlueprint] = useState<AIBlueprint | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationReport, setSimulationReport] = useState<SimulationReport | null>(null);
  const [analysisMeta, setAnalysisMeta] = useState<{ cost_usd?: number; duration_ms?: number }>({});
  const { toast } = useToast();

  const reset = () => {
    setBrief({ ...INITIAL_BRIEF });
    setBlueprint(null);
    setSimulationReport(null);
    setPhase("quick-start");
    setAnalyzing(false);
    setSimulating(false);
  };

  const handleAnalyze = async (idea: string, referenceUrl?: string, competitor?: string, additionalContext?: string, depth?: string) => {
    setAnalyzing(true);
    setPhase("analyzing");

    try {
      const { data, error } = await supabase.functions.invoke("generate-initiative-blueprint", {
        body: { idea, reference_url: referenceUrl, competitor, additional_context: additionalContext },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const bp: AIBlueprint = data.blueprint;
      setBlueprint(bp);
      setAnalysisMeta({ cost_usd: data.meta?.cost_usd, duration_ms: data.meta?.duration_ms });

      setBrief({
        name: bp.project_name,
        description: bp.short_description,
        problem_statement: bp.problem_statement,
        target_audience: bp.target_audience,
        product_type: bp.product_type,
        core_features: bp.suggested_features || [],
        integrations: bp.suggested_integrations || [],
        generation_depth: (depth as any) || (bp.recommended_depth as any) || "full_pipeline",
        technical_preferences: {},
        deployment_target: "vercel",
        market_opportunity: bp.market_opportunity,
        competitor_insights: bp.competitor_insights,
        reasoning: bp.reasoning,
      });

      setPhase("review");
    } catch (e: any) {
      console.error("Blueprint generation failed:", e);
      toast({ variant: "destructive", title: "Analysis failed", description: e?.message || "Please try again." });
      setPhase("quick-start");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApproveBlueprint = () => {
    setPhase("refine");
  };

  // After refinement, run simulation before final submit
  const handleRunSimulation = async () => {
    setSimulating(true);
    setPhase("simulating");

    const initiativeBrief = buildInitiativeBrief(brief);

    try {
      const { data, error } = await supabase.functions.invoke("initiative-simulation-engine", {
        body: {
          initiative_id: "preview", // placeholder — not persisted yet
          initiative_brief: initiativeBrief,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSimulationReport(data.simulation_report);
      setPhase("simulation-result");
    } catch (e: any) {
      console.error("Simulation failed:", e);
      toast({ variant: "destructive", title: "Simulation failed", description: e?.message || "Please try again." });
      // Fall back to refine phase — user can still proceed without simulation
      setPhase("refine");
    } finally {
      setSimulating(false);
    }
  };

  const handleSubmit = () => {
    const enrichedBrief: InitiativeBrief = {
      ...brief,
      _initiative_brief: buildInitiativeBrief(brief),
      _blueprint: blueprint,
      _simulation_report: simulationReport || undefined,
    };
    onSubmit(enrichedBrief);
    reset();
    setOpen(false);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) reset();
  };

  const phaseTitle: Record<WizardPhase, string> = {
    "quick-start": "What do you want to build?",
    analyzing: "What do you want to build?",
    review: "AI Initiative Blueprint",
    refine: "Refine & Launch",
    simulating: "Pre-Execution Simulation",
    "simulation-result": "Simulation Report",
  };

  const phaseSubtitle: Record<WizardPhase, string> = {
    "quick-start": "Describe your idea and let AxionOS analyze the opportunity.",
    analyzing: "Describe your idea and let AxionOS analyze the opportunity.",
    review: "Review and edit the AI-generated blueprint.",
    refine: "Optional refinements before running the simulation.",
    simulating: "AxionOS is simulating your initiative before pipeline execution.",
    "simulation-result": "Review the simulation results and decide how to proceed.",
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> New Initiative</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="font-display text-base">
            {phaseTitle[phase]}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {phaseSubtitle[phase]}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {(phase === "quick-start" || phase === "analyzing") && (
            <QuickStartView onAnalyze={handleAnalyze} isAnalyzing={analyzing} />
          )}
          {phase === "review" && blueprint && (
            <BlueprintReview
              brief={brief}
              blueprint={blueprint}
              meta={analysisMeta}
              onChange={(updates) => setBrief((prev) => ({ ...prev, ...updates }))}
              onApprove={handleApproveBlueprint}
              onRegenerate={() => setPhase("quick-start")}
            />
          )}
          {phase === "refine" && (
            <RefinementView
              brief={brief}
              onChange={(updates) => setBrief((prev) => ({ ...prev, ...updates }))}
              onSubmit={handleRunSimulation}
              onBack={() => setPhase("review")}
              isPending={simulating}
            />
          )}
          {phase === "simulating" && (
            <SimulationLoading />
          )}
          {phase === "simulation-result" && simulationReport && (
            <SimulationView
              report={simulationReport}
              isSimulating={false}
              onProceed={handleSubmit}
              onRefine={() => setPhase("refine")}
              onBack={() => setPhase("refine")}
              isPending={isPending}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ───

function buildInitiativeBrief(brief: InitiativeBrief) {
  return {
    name: brief.name,
    description: brief.description,
    problem: brief.problem_statement || "To be defined",
    target_users: brief.target_audience ? [brief.target_audience] : ["General users"],
    product_type: mapProductType(brief.product_type),
    core_features: brief.core_features,
    integrations: brief.integrations,
    tech_preferences: brief.technical_preferences,
    deployment_target: brief.deployment_target || "vercel",
    complexity_estimate: mapComplexity(brief.core_features.length + brief.integrations.length),
    generation_depth: mapDepth(brief.generation_depth),
    expected_outputs: ["repository", "prd"],
  };
}

function mapProductType(type: string): string {
  const map: Record<string, string> = {
    saas: "saas", mvp: "saas", dashboard: "internal_tool", crud: "internal_tool",
    landing: "saas", custom: "saas", marketplace: "marketplace",
    mobile_app: "mobile_app", ai_product: "ai_product", api_product: "api_product",
  };
  return map[type] || "saas";
}

function mapComplexity(featureCount: number): string {
  if (featureCount <= 3) return "simple";
  if (featureCount <= 6) return "moderate";
  return "complex";
}

function mapDepth(depth: string): string {
  const map: Record<string, string> = {
    discovery: "mvp", prd_architecture: "mvp",
    prd_arch_stories: "production", full_pipeline: "production",
  };
  return map[depth] || "mvp";
}
