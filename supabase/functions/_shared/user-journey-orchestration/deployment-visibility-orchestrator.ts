// Deployment Visibility Orchestrator
// Ensures deploy-related status, readiness, and outputs are visible in the journey.

export interface DeploymentVisibility {
  has_repo: boolean;
  has_deploy_url: boolean;
  repo_url: string | null;
  deploy_url: string | null;
  build_status: string;
  deploy_status: string;
  health_status: string;
  visibility_score: number;
  delivery_label: string;
  delivery_description: string;
}

export function computeDeploymentVisibility(
  initiative: {
    repo_url?: string | null;
    deploy_url?: string | null;
    build_status?: string | null;
    stage_status?: string | null;
  },
): DeploymentVisibility {
  const hasRepo = !!initiative.repo_url;
  const hasDeployUrl = !!initiative.deploy_url;
  const buildStatus = initiative.build_status || 'unknown';
  const stageStatus = initiative.stage_status || 'draft';

  const deployStatus = resolveDeployStatus(stageStatus, hasDeployUrl);
  const healthStatus = hasDeployUrl ? 'accessible' : 'not_deployed';

  let visibilityScore = 0;
  if (hasRepo) visibilityScore += 0.3;
  if (hasDeployUrl) visibilityScore += 0.4;
  if (buildStatus === 'success') visibilityScore += 0.2;
  if (healthStatus === 'accessible') visibilityScore += 0.1;

  const { label, description } = getDeliveryLabels(deployStatus, hasDeployUrl, hasRepo);

  return {
    has_repo: hasRepo,
    has_deploy_url: hasDeployUrl,
    repo_url: initiative.repo_url || null,
    deploy_url: initiative.deploy_url || null,
    build_status: buildStatus,
    deploy_status: deployStatus,
    health_status: healthStatus,
    visibility_score: Math.min(1, visibilityScore),
    delivery_label: label,
    delivery_description: description,
  };
}

function resolveDeployStatus(stageStatus: string, hasDeployUrl: boolean): string {
  if (hasDeployUrl) return 'deployed';
  if (['deploying'].includes(stageStatus)) return 'deploying';
  if (['published'].includes(stageStatus)) return 'published';
  if (['ready_to_publish'].includes(stageStatus)) return 'ready_to_publish';
  if (['deploy_failed'].includes(stageStatus)) return 'deploy_failed';
  return 'not_started';
}

function getDeliveryLabels(deployStatus: string, hasDeployUrl: boolean, hasRepo: boolean): { label: string; description: string } {
  switch (deployStatus) {
    case 'deployed':
      return { label: 'Deployed & Live', description: 'Your software is deployed and accessible.' };
    case 'deploying':
      return { label: 'Deploying...', description: 'Deployment is in progress.' };
    case 'published':
      return { label: 'Published to Repository', description: 'Code is published. Deploy is next.' };
    case 'ready_to_publish':
      return { label: 'Ready to Publish', description: 'Build passed. Ready for repository publication.' };
    case 'deploy_failed':
      return { label: 'Deploy Failed', description: 'Deployment encountered an issue. Review needed.' };
    default:
      return {
        label: hasRepo ? 'Repository Available' : 'Not Yet Built',
        description: hasRepo ? 'Code is in the repository.' : 'Engineering has not started yet.',
      };
  }
}
