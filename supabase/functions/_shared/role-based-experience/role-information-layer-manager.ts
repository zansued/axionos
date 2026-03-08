// Role Information Layer Manager
// Controls information density, summarization, and visibility by role.

import { RoleName } from "./role-experience-model-manager.ts";

export type VisibilityMode = "visible" | "summarized" | "hidden" | "deferred";

export interface InformationLayerConfig {
  information_class: string;
  visibility_mode: VisibilityMode;
  summarization_level: "full" | "summary" | "minimal" | "none";
}

const INFORMATION_LAYERS: Record<RoleName, InformationLayerConfig[]> = {
  default_user: [
    { information_class: "journey_state", visibility_mode: "visible", summarization_level: "full" },
    { information_class: "approval_state", visibility_mode: "visible", summarization_level: "full" },
    { information_class: "deploy_status", visibility_mode: "visible", summarization_level: "full" },
    { information_class: "generated_artifacts", visibility_mode: "visible", summarization_level: "summary" },
    { information_class: "governance_details", visibility_mode: "hidden", summarization_level: "none" },
    { information_class: "internal_metrics", visibility_mode: "hidden", summarization_level: "none" },
    { information_class: "policy_engines", visibility_mode: "hidden", summarization_level: "none" },
    { information_class: "architecture_internals", visibility_mode: "hidden", summarization_level: "none" },
  ],
  operator: [
    { information_class: "journey_state", visibility_mode: "visible", summarization_level: "full" },
    { information_class: "approval_state", visibility_mode: "visible", summarization_level: "full" },
    { information_class: "deploy_status", visibility_mode: "visible", summarization_level: "full" },
    { information_class: "generated_artifacts", visibility_mode: "visible", summarization_level: "full" },
    { information_class: "governance_details", visibility_mode: "visible", summarization_level: "summary" },
    { information_class: "internal_metrics", visibility_mode: "visible", summarization_level: "summary" },
    { information_class: "policy_engines", visibility_mode: "summarized", summarization_level: "summary" },
    { information_class: "architecture_internals", visibility_mode: "hidden", summarization_level: "none" },
  ],
  admin: [
    { information_class: "journey_state", visibility_mode: "visible", summarization_level: "full" },
    { information_class: "approval_state", visibility_mode: "visible", summarization_level: "full" },
    { information_class: "deploy_status", visibility_mode: "visible", summarization_level: "full" },
    { information_class: "generated_artifacts", visibility_mode: "visible", summarization_level: "full" },
    { information_class: "governance_details", visibility_mode: "visible", summarization_level: "full" },
    { information_class: "internal_metrics", visibility_mode: "visible", summarization_level: "full" },
    { information_class: "policy_engines", visibility_mode: "visible", summarization_level: "full" },
    { information_class: "architecture_internals", visibility_mode: "visible", summarization_level: "full" },
  ],
};

export function getInformationLayers(roleName: RoleName): InformationLayerConfig[] {
  return INFORMATION_LAYERS[roleName] ?? INFORMATION_LAYERS.default_user;
}

export function computeInformationSummarizationScore(roleName: RoleName): number {
  const layers = getInformationLayers(roleName);
  const visibleCount = layers.filter(l => l.visibility_mode === "visible").length;
  return Math.min(1, visibleCount / Math.max(1, layers.length));
}
