// Handoff Assurance Analyzer
// Evaluates whether the delivered software is sufficiently visible, accessible, and handoff-ready.

export interface HandoffAssurance {
  handoff_completeness_score: number;
  output_accessibility_score: number;
  handoff_label: string;
  handoff_rationale: string;
  missing_outputs: string[];
}

export function evaluateHandoffAssurance(
  hasDeployUrl: boolean,
  hasRepoUrl: boolean,
  hasPreviewUrl: boolean,
  deploySucceeded: boolean,
): HandoffAssurance {
  const missing: string[] = [];
  if (!hasDeployUrl) missing.push("deploy_url");
  if (!hasRepoUrl) missing.push("repo_url");
  if (!hasPreviewUrl) missing.push("preview_url");

  const accessibility = (hasDeployUrl ? 0.5 : 0) + (hasRepoUrl ? 0.3 : 0) + (hasPreviewUrl ? 0.2 : 0);
  const completeness = deploySucceeded && hasDeployUrl && hasRepoUrl ? 1.0
    : deploySucceeded ? 0.7
      : hasRepoUrl ? 0.3 : 0;

  const label = completeness >= 0.9 ? "Handoff Complete"
    : completeness >= 0.5 ? "Partial Handoff"
      : "Handoff Incomplete";

  return {
    handoff_completeness_score: Number(completeness.toFixed(3)),
    output_accessibility_score: Number(accessibility.toFixed(3)),
    handoff_label: label,
    handoff_rationale: missing.length === 0
      ? "All delivery outputs are accessible and visible."
      : `Missing outputs: ${missing.join(", ")}. Handoff is incomplete.`,
    missing_outputs: missing,
  };
}
