// Delivery Output Visibility Engine
// Determines which delivery outputs should be surfaced immediately after deploy.

export interface DeliveryOutputVisibility {
  deploy_url: string | null;
  preview_url: string | null;
  repo_url: string | null;
  delivery_timestamp: string | null;
  handoff_status: string;
  output_accessibility_score: number;
  handoff_completeness_score: number;
  delivery_visibility_score: number;
  visible_outputs: string[];
}

export function computeDeliveryOutputVisibility(
  initiative: {
    deploy_url?: string | null;
    repo_url?: string | null;
    stage_status?: string | null;
  },
): DeliveryOutputVisibility {
  const deployUrl = initiative.deploy_url || null;
  const repoUrl = initiative.repo_url || null;
  const previewUrl = deployUrl; // preview = deploy for now
  const stageStatus = initiative.stage_status ?? "draft";

  const visibleOutputs: string[] = [];
  if (deployUrl) visibleOutputs.push("deploy_url");
  if (repoUrl) visibleOutputs.push("repo_url");
  if (previewUrl) visibleOutputs.push("preview_url");

  const hasDeployed = ["deployed", "completed"].includes(stageStatus);

  let handoffStatus = "pending";
  if (hasDeployed && deployUrl) handoffStatus = "complete";
  else if (deployUrl || repoUrl) handoffStatus = "partial";

  const accessibility = (deployUrl ? 0.5 : 0) + (repoUrl ? 0.3 : 0) + (previewUrl ? 0.2 : 0);
  const handoffCompleteness = handoffStatus === "complete" ? 1.0 : handoffStatus === "partial" ? 0.5 : 0;
  const visibility = Math.min(1, (visibleOutputs.length / 3) * 0.7 + (hasDeployed ? 0.3 : 0));

  return {
    deploy_url: deployUrl,
    preview_url: previewUrl,
    repo_url: repoUrl,
    delivery_timestamp: hasDeployed ? new Date().toISOString() : null,
    handoff_status: handoffStatus,
    output_accessibility_score: Number(accessibility.toFixed(3)),
    handoff_completeness_score: Number(handoffCompleteness.toFixed(3)),
    delivery_visibility_score: Number(visibility.toFixed(3)),
    visible_outputs: visibleOutputs,
  };
}
