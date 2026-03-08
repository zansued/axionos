// Sprint 69 — Template Initialization Engine
// Maps selected template/starter choices into journey initialization and starter artifacts.

import { InitiativeTemplateDefinition } from "./initiative-template-library.ts";
import { VerticalStarterDefinition } from "./vertical-starter-library.ts";

export interface InitializationPlan {
  templateName: string | null;
  verticalName: string | null;
  ideaScaffold: string;
  discoveryHints: Record<string, string>;
  assumptions: string[];
  suggestedStack: Record<string, string>;
  initializationQualityScore: number;
  reasoning: string;
}

export function buildInitializationPlan(params: {
  template?: InitiativeTemplateDefinition | null;
  vertical?: VerticalStarterDefinition | null;
  rawIdea: string;
}): InitializationPlan {
  const { template, vertical, rawIdea } = params;

  const ideaScaffold = template?.ideaScaffold || rawIdea;
  const discoveryHints = template?.discoveryHints || {};
  const assumptions = [
    ...(template?.defaultAssumptions || []),
  ];
  const suggestedStack = vertical?.defaultStack || {};

  let qualityScore = 0.5;
  if (template) qualityScore += 0.2;
  if (vertical) qualityScore += 0.15;
  if (rawIdea.length > 50) qualityScore += 0.1;
  qualityScore = Math.min(1, qualityScore);

  return {
    templateName: template?.templateName || null,
    verticalName: vertical?.verticalName || null,
    ideaScaffold,
    discoveryHints,
    assumptions,
    suggestedStack,
    initializationQualityScore: qualityScore,
    reasoning: template
      ? `Initialized from template "${template.templateName}"${vertical ? ` with vertical "${vertical.verticalName}"` : ""}.`
      : "Initialized from raw idea input without template.",
  };
}
