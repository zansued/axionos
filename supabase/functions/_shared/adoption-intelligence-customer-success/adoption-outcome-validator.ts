// Adoption Outcome Validator
// Tracks whether customer-success recommendations improved actual adoption outcomes.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AdoptionOutcome {
  initiative_id: string | null;
  outcome_domain: string;
  expected_outcomes: Record<string, unknown>;
  realized_outcomes: Record<string, unknown>;
  accuracy_score: number;
}

export async function recordAdoptionOutcome(
  client: SupabaseClient,
  orgId: string,
  initiativeId: string | null,
  domain: string,
  expected: Record<string, unknown>,
  realized: Record<string, unknown>,
  accuracy: number,
): Promise<void> {
  await client.from("adoption_outcomes").insert({
    organization_id: orgId,
    initiative_id: initiativeId,
    outcome_domain: domain,
    expected_outcomes: expected,
    realized_outcomes: realized,
    accuracy_score: accuracy,
  });
}

export async function getRecentAdoptionOutcomes(
  client: SupabaseClient,
  orgId: string,
  limit = 20,
): Promise<AdoptionOutcome[]> {
  const { data } = await client
    .from("adoption_outcomes")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((d: any) => ({
    initiative_id: d.initiative_id,
    outcome_domain: d.outcome_domain,
    expected_outcomes: d.expected_outcomes ?? {},
    realized_outcomes: d.realized_outcomes ?? {},
    accuracy_score: Number(d.accuracy_score ?? 0.5),
  }));
}
