import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { QuickStartView } from "./QuickStartView";
import { BlueprintReview } from "./BlueprintReview";
import { RefinementView } from "./RefinementView";
import type { InitiativeBrief, AIBlueprint } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type WizardPhase = "quick-start" | "analyzing" | "review" | "refine";

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
  const [analysisMeta, setAnalysisMeta] = useState<{ cost_usd?: number; duration_ms?: number }>({});
  const { toast } = useToast();

  const reset = () => {
    setBrief({ ...INITIAL_BRIEF });
    setBlueprint(null);
    setPhase("quick-start");
    setAnalyzing(false);
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

      // Pre-fill brief from AI blueprint
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

  const handleSubmit = () => {
    // Enrich brief with initiative_brief contract fields for pipeline consumption
    const enrichedBrief: InitiativeBrief = {
      ...brief,
      // Map wizard fields to initiative_brief contract
      _initiative_brief: {
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
      },
      _blueprint: blueprint,
    };
    onSubmit(enrichedBrief);
    reset();
    setOpen(false);
  };

  // Map frontend product_type to initiative_brief contract
  function mapProductType(type: string): string {
    const map: Record<string, string> = {
      saas: "saas",
      mvp: "saas",
      dashboard: "internal_tool",
      crud: "internal_tool",
      landing: "saas",
      custom: "saas",
      marketplace: "marketplace",
      mobile_app: "mobile_app",
      ai_product: "ai_product",
      api_product: "api_product",
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
      discovery: "mvp",
      prd_architecture: "mvp",
      prd_arch_stories: "production",
      full_pipeline: "production",
    };
    return map[depth] || "mvp";
  }

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> New Initiative</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="font-display text-base">
            {phase === "quick-start" || phase === "analyzing"
              ? "What do you want to build?"
              : phase === "review"
                ? "AI Initiative Blueprint"
                : "Refine & Launch"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {phase === "quick-start" || phase === "analyzing"
              ? "Describe your idea and let AxionOS analyze the opportunity."
              : phase === "review"
                ? "Review and edit the AI-generated blueprint."
                : "Optional refinements before starting the pipeline."}
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
              onSubmit={handleSubmit}
              onBack={() => setPhase("review")}
              isPending={isPending}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
