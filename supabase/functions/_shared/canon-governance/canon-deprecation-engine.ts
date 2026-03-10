/**
 * Canon Deprecation Engine — Sprint 115
 * Manages deprecation with lineage preservation and impact assessment.
 */

export interface DeprecationInput {
  entry_id: string;
  reason: string;
  deprecated_by: string;
  replacement_entry_id?: string;
  active_consumers_count: number;
}

export interface DeprecationResult {
  safe_to_deprecate: boolean;
  impact_level: "none" | "low" | "medium" | "high";
  impact_assessment: string;
  recommendation: string;
}

export function assessDeprecation(input: DeprecationInput): DeprecationResult {
  let impact: DeprecationResult["impact_level"] = "none";
  if (input.active_consumers_count > 10) impact = "high";
  else if (input.active_consumers_count > 3) impact = "medium";
  else if (input.active_consumers_count > 0) impact = "low";

  const hasReplacement = !!input.replacement_entry_id;
  const safe = impact !== "high" || hasReplacement;

  return {
    safe_to_deprecate: safe,
    impact_level: impact,
    impact_assessment: `${input.active_consumers_count} active consumers. ${hasReplacement ? "Replacement available." : "No replacement designated."}`,
    recommendation: !safe
      ? "HIGH IMPACT: Designate a replacement entry before deprecating."
      : hasReplacement
        ? "Safe to deprecate with replacement."
        : impact === "none"
          ? "No active consumers. Safe to deprecate."
          : "Low impact. Monitor consumers during transition.",
  };
}
