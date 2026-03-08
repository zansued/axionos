// Sprint 69 — Onboarding Flow Manager
// Manages guided onboarding flow definitions and step logic.

export interface OnboardingStep {
  stepKey: string;
  title: string;
  description: string;
  inputType: "text" | "select" | "multi_select" | "confirm";
  options?: string[];
  required: boolean;
  validationHint?: string;
}

export interface OnboardingFlowDefinition {
  flowName: string;
  flowType: "guided" | "quick_start" | "template_driven";
  targetRole: "default_user" | "operator" | "admin";
  steps: OnboardingStep[];
  clarityScore: number;
}

const DEFAULT_GUIDED_STEPS: OnboardingStep[] = [
  {
    stepKey: "idea_input",
    title: "Describe your idea",
    description: "What do you want to build? A brief description is enough.",
    inputType: "text",
    required: true,
    validationHint: "At least 20 characters describing the core concept",
  },
  {
    stepKey: "product_type",
    title: "Product type",
    description: "What kind of product is this?",
    inputType: "select",
    options: ["SaaS", "Marketplace", "Internal Tool", "AI Workflow", "Content Platform", "API / Backend", "Landing Page", "Other"],
    required: true,
  },
  {
    stepKey: "target_audience",
    title: "Who is this for?",
    description: "Describe your target users in one sentence.",
    inputType: "text",
    required: false,
  },
  {
    stepKey: "intent",
    title: "What do you want to do?",
    description: "Choose your primary intent.",
    inputType: "select",
    options: ["Validate the idea", "Plan & architect it", "Build it for me"],
    required: true,
  },
];

export function getDefaultOnboardingFlow(): OnboardingFlowDefinition {
  return {
    flowName: "Default Guided Onboarding",
    flowType: "guided",
    targetRole: "default_user",
    steps: DEFAULT_GUIDED_STEPS,
    clarityScore: 0.85,
  };
}

export function evaluateOnboardingClarity(flow: OnboardingFlowDefinition): number {
  const stepCount = flow.steps.length;
  if (stepCount === 0) return 0;
  const requiredRatio = flow.steps.filter((s) => s.required).length / stepCount;
  const hasDescriptions = flow.steps.every((s) => s.description.length > 10);
  const hasValidation = flow.steps.filter((s) => s.validationHint).length / stepCount;
  return Math.min(1, (requiredRatio * 0.3 + (hasDescriptions ? 0.4 : 0.1) + hasValidation * 0.3));
}

export function buildOnboardingFlowsOverview(flows: OnboardingFlowDefinition[]) {
  return {
    totalFlows: flows.length,
    averageClarityScore: flows.length > 0 ? flows.reduce((a, f) => a + f.clarityScore, 0) / flows.length : 0,
    flowsByType: flows.reduce((acc, f) => { acc[f.flowType] = (acc[f.flowType] || 0) + 1; return acc; }, {} as Record<string, number>),
  };
}
