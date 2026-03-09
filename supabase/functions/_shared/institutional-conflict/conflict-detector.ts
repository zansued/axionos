/**
 * Conflict Detector
 * Identifies collisions between policies, decisions, and contexts.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface DetectedConflict {
  conflict_type: string;
  conflict_title: string;
  conflict_summary: string;
  severity: string;
  urgency: string;
  blast_radius: string;
  involved_domains: string[];
  involved_subjects: Array<{ type: string; id: string; label: string }>;
  detected_by: string;
}

export async function detectConflicts(
  client: SupabaseClient,
  organizationId: string
): Promise<DetectedConflict[]> {
  const conflicts: DetectedConflict[] = [];

  // Check doctrine adaptation evaluations for conflicting/blocked results
  const { data: evals } = await client
    .from("doctrine_adaptation_evaluations")
    .select("*")
    .eq("organization_id", organizationId)
    .in("evaluation_result", ["conflicting", "blocked"])
    .order("created_at", { ascending: false })
    .limit(20);

  for (const e of evals || []) {
    conflicts.push({
      conflict_type: "doctrine",
      conflict_title: `Doctrine adaptation conflict (${e.evaluation_result})`,
      conflict_summary: e.adaptation_summary || "Doctrine evaluation flagged as conflicting or blocked.",
      severity: e.evaluation_result === "blocked" ? "high" : "medium",
      urgency: e.drift_risk_score > 0.6 ? "high" : "normal",
      blast_radius: "local",
      involved_domains: ["doctrine_adaptation"],
      involved_subjects: [
        { type: "doctrine", id: e.doctrine_id, label: "doctrine" },
        { type: "context_profile", id: e.context_profile_id, label: "context" },
      ],
      detected_by: "conflict_detector",
    });
  }

  // Check for open drift events with high severity
  const { data: drifts } = await client
    .from("doctrine_drift_events")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("resolution_status", "open")
    .in("severity", ["high", "critical"])
    .limit(10);

  for (const d of drifts || []) {
    conflicts.push({
      conflict_type: "compliance",
      conflict_title: `High-severity doctrine drift: ${d.drift_type}`,
      conflict_summary: d.drift_summary,
      severity: d.severity,
      urgency: d.severity === "critical" ? "critical" : "high",
      blast_radius: "cross_context",
      involved_domains: ["doctrine_drift", "governance"],
      involved_subjects: [
        { type: "doctrine", id: d.doctrine_id, label: "doctrine" },
        { type: "context_profile", id: d.context_profile_id, label: "context" },
      ],
      detected_by: "drift_conflict_detector",
    });
  }

  return conflicts;
}
