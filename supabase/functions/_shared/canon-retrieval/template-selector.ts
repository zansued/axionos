/**
 * template-selector.ts
 * Selects the best matching template from canon entries for a given generation task.
 */

import type { ImplementationPattern } from "./implementation-pattern-library.ts";

export interface TemplateSelectionRequest {
  artifactType: string;
  stack?: string;
  language?: string;
  framework?: string;
  problemType?: string;
  qualityRequirement?: string;
}

export interface TemplateSelectionResult {
  selectedTemplate: ImplementationPattern | null;
  alternativeTemplates: ImplementationPattern[];
  selectionReason: string;
  confidenceScore: number;
}

export function selectBestTemplate(
  patterns: ImplementationPattern[],
  request: TemplateSelectionRequest
): TemplateSelectionResult {
  // Filter to template-type entries only
  const templates = patterns.filter(p =>
    p.canonType === 'template' || p.canonType === 'pattern' || p.canonType === 'blueprint'
  );

  if (templates.length === 0) {
    return {
      selectedTemplate: null,
      alternativeTemplates: [],
      selectionReason: 'No matching templates found in approved canon',
      confidenceScore: 0,
    };
  }

  // Score each template
  const scored = templates.map(t => ({
    template: t,
    score: scoreTemplate(t, request),
  })).sort((a, b) => b.score - a.score);

  const best = scored[0];
  const alternatives = scored.slice(1, 4).map(s => s.template);

  return {
    selectedTemplate: best.template,
    alternativeTemplates: alternatives,
    selectionReason: buildSelectionReason(best.template, request),
    confidenceScore: Math.min(best.score, 1.0),
  };
}

function scoreTemplate(template: ImplementationPattern, request: TemplateSelectionRequest): number {
  let score = template.confidenceScore * 0.4;

  if (request.stack && template.stackTags.includes(request.stack)) score += 0.2;
  if (request.language && template.languageTags.includes(request.language)) score += 0.15;
  if (request.framework && template.frameworkTags.includes(request.framework)) score += 0.15;
  if (request.problemType && template.problemType === request.problemType) score += 0.1;

  // Quality match
  if (request.qualityRequirement === 'high' && template.qualityLevel === 'high') score += 0.1;
  if (request.qualityRequirement === 'critical' && template.qualityLevel === 'critical') score += 0.15;

  return score;
}

function buildSelectionReason(template: ImplementationPattern, request: TemplateSelectionRequest): string {
  const reasons: string[] = [`Selected "${template.title}" (confidence: ${template.confidenceScore.toFixed(2)})`];
  if (request.stack && template.stackTags.includes(request.stack)) reasons.push(`stack match: ${request.stack}`);
  if (request.language && template.languageTags.includes(request.language)) reasons.push(`language match: ${request.language}`);
  if (request.framework && template.frameworkTags.includes(request.framework)) reasons.push(`framework match: ${request.framework}`);
  return reasons.join('; ');
}
