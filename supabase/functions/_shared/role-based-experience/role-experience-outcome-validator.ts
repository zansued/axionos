// Role Experience Outcome Validator
// Tracks expected vs realized outcomes of role-based experience decisions.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RoleName } from "./role-experience-model-manager.ts";
import { computeQualityMetrics } from "./role-experience-quality-analyzer.ts";

export interface RoleExperienceOutcome {
  role_name: RoleName;
  outcome_domain: string;
  expected_outcomes: Record<string, unknown>;
  realized_outcomes: Record<string, unknown>;
  accuracy_score: number;
}

export async function recordOutcome(
  client: SupabaseClient,
  orgId: string,
  roleName: RoleName,
  domain: string,
  expected: Record<string, unknown>,
  realized: Record<string, unknown>,
): Promise<void> {
  const metrics = computeQualityMetrics(roleName, []);

  await client.from("role_experience_outcomes").insert({
    organization_id: orgId,
    role_name: roleName,
    outcome_domain: domain,
    expected_outcomes: expected,
    realized_outcomes: realized,
    role_experience_quality_score: metrics.role_experience_quality_score,
    navigation_clarity_score: metrics.navigation_clarity_score,
    complexity_exposure_score: metrics.complexity_exposure_score,
    internal_complexity_leakage_score: metrics.internal_complexity_leakage_score,
    approval_visibility_score: metrics.approval_visibility_score,
    information_summarization_score: metrics.information_summarization_score,
    operator_surface_effectiveness_score: metrics.operator_surface_effectiveness_score,
    default_user_journey_clarity_score: metrics.default_user_journey_clarity_score,
    admin_surface_integrity_score: metrics.admin_surface_integrity_score,
    permission_alignment_score: metrics.permission_alignment_score,
    role_friction_score: metrics.role_friction_score,
    role_experience_outcome_accuracy_score: 0.5,
    bounded_visibility_coherence_score: metrics.bounded_visibility_coherence_score,
    role_surface_separation_score: metrics.role_surface_separation_score,
  });
}

export async function getRecentOutcomes(
  client: SupabaseClient,
  orgId: string,
  limit = 20,
): Promise<RoleExperienceOutcome[]> {
  const { data } = await client
    .from("role_experience_outcomes")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((d: any) => ({
    role_name: d.role_name as RoleName,
    outcome_domain: d.outcome_domain,
    expected_outcomes: d.expected_outcomes ?? {},
    realized_outcomes: d.realized_outcomes ?? {},
    accuracy_score: Number(d.role_experience_outcome_accuracy_score ?? 0.5),
  }));
}
