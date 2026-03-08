// Delivery Assurance Outcome Validator
// Tracks whether one-click delivery posture matched realized outcomes.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface DeliveryOutcome {
  initiative_id: string;
  outcome_domain: string;
  expected_outcomes: Record<string, unknown>;
  realized_outcomes: Record<string, unknown>;
  accuracy_score: number;
}

export async function recordDeliveryOutcome(
  client: SupabaseClient,
  orgId: string,
  initiativeId: string,
  domain: string,
  expected: Record<string, unknown>,
  realized: Record<string, unknown>,
  metrics: Record<string, number>,
): Promise<void> {
  await client.from("delivery_assurance_outcomes").insert({
    organization_id: orgId,
    initiative_id: initiativeId,
    outcome_domain: domain,
    expected_outcomes: expected,
    realized_outcomes: realized,
    ...metrics,
  });
}

export async function getRecentDeliveryOutcomes(
  client: SupabaseClient,
  orgId: string,
  limit = 20,
): Promise<DeliveryOutcome[]> {
  const { data } = await client
    .from("delivery_assurance_outcomes")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((d: any) => ({
    initiative_id: d.initiative_id,
    outcome_domain: d.outcome_domain,
    expected_outcomes: d.expected_outcomes ?? {},
    realized_outcomes: d.realized_outcomes ?? {},
    accuracy_score: Number(d.delivery_outcome_accuracy_score ?? 0.5),
  }));
}
