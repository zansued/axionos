/**
 * Doctrine Adaptation Engine
 * Applies adaptation rules and classifies results as
 * compatible, adapted, conflicting, or blocked.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DoctrineRecord } from "./doctrine-core-loader.ts";
import { ContextProfile } from "./context-doctrine-mapper.ts";

export interface AdaptationRule {
  id: string;
  doctrine_id: string;
  context_profile_id: string;
  adaptation_type: string;
  adaptation_rule_text: string;
  justification: string;
  boundary_conditions: Record<string, unknown>;
  confidence_model: Record<string, unknown>;
  requires_review: boolean;
  active: boolean;
}

export interface AdaptationResult {
  doctrineId: string;
  doctrineName: string;
  contextProfileId: string;
  contextName: string;
  evaluationResult: "compatible" | "adapted" | "conflicting" | "blocked";
  compatibilityScore: number;
  driftRiskScore: number;
  adaptationSummary: string;
  blockedReasons: string[];
  appliedRules: AdaptationRule[];
}

export async function loadAdaptationRules(
  client: SupabaseClient,
  organizationId: string,
  doctrineId?: string,
  contextProfileId?: string
): Promise<AdaptationRule[]> {
  let query = client
    .from("doctrine_adaptation_rules")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("active", true);

  if (doctrineId) query = query.eq("doctrine_id", doctrineId);
  if (contextProfileId) query = query.eq("context_profile_id", contextProfileId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as AdaptationRule[];
}

export function evaluateAdaptation(
  doctrine: DoctrineRecord,
  context: ContextProfile,
  rules: AdaptationRule[]
): AdaptationResult {
  const applicableRules = rules.filter(
    (r) => r.doctrine_id === doctrine.id && r.context_profile_id === context.id
  );

  // If doctrine is strict-immutable, no adaptation is allowed
  if (doctrine.immutability_level === "strict" && applicableRules.length > 0) {
    const hasPermissive = applicableRules.some((r) => r.adaptation_type === "permissive");
    if (hasPermissive) {
      return {
        doctrineId: doctrine.id,
        doctrineName: doctrine.doctrine_name,
        contextProfileId: context.id,
        contextName: context.context_name,
        evaluationResult: "blocked",
        compatibilityScore: 0,
        driftRiskScore: 1.0,
        adaptationSummary: `Doctrine "${doctrine.doctrine_name}" is strictly immutable. Permissive adaptations are blocked.`,
        blockedReasons: ["Strict immutability prevents permissive adaptation"],
        appliedRules: applicableRules,
      };
    }
  }

  // No rules → compatible by default
  if (applicableRules.length === 0) {
    return {
      doctrineId: doctrine.id,
      doctrineName: doctrine.doctrine_name,
      contextProfileId: context.id,
      contextName: context.context_name,
      evaluationResult: "compatible",
      compatibilityScore: 1.0,
      driftRiskScore: 0,
      adaptationSummary: `No adaptation rules found. Doctrine "${doctrine.doctrine_name}" applies directly.`,
      blockedReasons: [],
      appliedRules: [],
    };
  }

  // Calculate scores based on rule types
  const restrictiveCount = applicableRules.filter((r) => r.adaptation_type === "restrictive").length;
  const permissiveCount = applicableRules.filter((r) => r.adaptation_type === "permissive").length;
  const interpretiveCount = applicableRules.filter((r) => r.adaptation_type === "interpretive").length;

  const driftRisk = Math.min(1.0, (permissiveCount * 0.3 + restrictiveCount * 0.1) / Math.max(1, applicableRules.length));
  const compatibility = Math.max(0, 1.0 - driftRisk * 0.5);

  let result: "compatible" | "adapted" | "conflicting" | "blocked" = "adapted";
  if (compatibility >= 0.9 && driftRisk < 0.1) result = "compatible";
  else if (driftRisk > 0.7) result = "conflicting";

  const blockedReasons: string[] = [];
  if (doctrine.immutability_level === "strict" && permissiveCount > 0) {
    result = "blocked";
    blockedReasons.push("Cannot apply permissive rules to strict doctrine");
  }

  return {
    doctrineId: doctrine.id,
    doctrineName: doctrine.doctrine_name,
    contextProfileId: context.id,
    contextName: context.context_name,
    evaluationResult: result,
    compatibilityScore: Number(compatibility.toFixed(3)),
    driftRiskScore: Number(driftRisk.toFixed(3)),
    adaptationSummary: `${applicableRules.length} adaptation rule(s) applied: ${interpretiveCount} interpretive, ${restrictiveCount} restrictive, ${permissiveCount} permissive.`,
    blockedReasons,
    appliedRules: applicableRules,
  };
}
