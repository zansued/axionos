/**
 * stack-guidance-resolver.ts
 * Resolves stack-specific guidance from canon entries for a given technology context.
 */

export interface StackContext {
  primaryLanguage?: string;
  framework?: string;
  runtime?: string;
  database?: string;
  deploymentTarget?: string;
}

export interface StackGuidance {
  conventions: string[];
  templates: string[];
  antiPatterns: string[];
  qualityRequirements: string[];
  stackSpecificNotes: string[];
}

export function resolveStackGuidance(
  patterns: Array<{
    canonType: string;
    stackTags: string[];
    languageTags: string[];
    frameworkTags: string[];
    summary: string;
    implementationGuidance?: string;
    qualityLevel: string;
  }>,
  stackContext: StackContext
): StackGuidance {
  const guidance: StackGuidance = {
    conventions: [],
    templates: [],
    antiPatterns: [],
    qualityRequirements: [],
    stackSpecificNotes: [],
  };

  for (const pattern of patterns) {
    const relevance = computeStackRelevance(pattern, stackContext);
    if (relevance < 0.2) continue;

    switch (pattern.canonType) {
      case 'convention':
        guidance.conventions.push(pattern.summary);
        break;
      case 'template':
        guidance.templates.push(pattern.summary);
        break;
      case 'anti_pattern':
        guidance.antiPatterns.push(pattern.summary);
        break;
      default:
        if (pattern.implementationGuidance) {
          guidance.stackSpecificNotes.push(pattern.implementationGuidance);
        }
    }

    if (pattern.qualityLevel === 'high' || pattern.qualityLevel === 'critical') {
      guidance.qualityRequirements.push(`[${pattern.qualityLevel}] ${pattern.summary}`);
    }
  }

  return guidance;
}

function computeStackRelevance(
  pattern: { stackTags: string[]; languageTags: string[]; frameworkTags: string[] },
  context: StackContext
): number {
  let score = 0;
  let checks = 0;

  if (context.primaryLanguage) {
    checks++;
    if (pattern.languageTags.includes(context.primaryLanguage)) score++;
  }
  if (context.framework) {
    checks++;
    if (pattern.frameworkTags.includes(context.framework)) score++;
  }
  if (context.runtime) {
    checks++;
    if (pattern.stackTags.includes(context.runtime)) score++;
  }

  // General patterns (no tags) are always somewhat relevant
  if (pattern.stackTags.length === 0 && pattern.languageTags.length === 0) {
    return 0.3;
  }

  return checks > 0 ? score / checks : 0;
}
