/**
 * tradeoff-dimension-resolver.ts
 * Resolves active tradeoff dimensions and constitutional posture.
 */
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface TradeoffDimension {
  id: string;
  dimension_code: string;
  dimension_name: string;
  dimension_type: string;
  description: string;
  active: boolean;
}

export interface TradeoffConstitution {
  id: string;
  constitution_code: string;
  constitution_name: string;
  scope: string;
  status: string;
  tradeoff_principles: string;
  arbitration_defaults: Record<string, unknown>;
}

const DEFAULT_DIMENSIONS: Omit<TradeoffDimension, "id">[] = [
  { dimension_code: "cost", dimension_name: "Cost", dimension_type: "cost", description: "Financial cost and resource expenditure", active: true },
  { dimension_code: "speed", dimension_name: "Speed", dimension_type: "speed", description: "Time to delivery and velocity", active: true },
  { dimension_code: "quality", dimension_name: "Quality", dimension_type: "quality", description: "Output quality and reliability", active: true },
  { dimension_code: "continuity", dimension_name: "Continuity", dimension_type: "continuity", description: "Operational and institutional continuity", active: true },
  { dimension_code: "sovereignty", dimension_name: "Sovereignty", dimension_type: "sovereignty", description: "Decision-making independence and lock-in risk", active: true },
  { dimension_code: "legitimacy", dimension_name: "Legitimacy", dimension_type: "legitimacy", description: "Institutional legitimacy and stakeholder trust", active: true },
  { dimension_code: "compliance", dimension_name: "Compliance", dimension_type: "compliance", description: "Regulatory and policy compliance", active: true },
  { dimension_code: "resilience", dimension_name: "Resilience", dimension_type: "resilience", description: "Ability to withstand disruption", active: true },
  { dimension_code: "ux", dimension_name: "User Experience", dimension_type: "ux", description: "End-user experience and adoption", active: true },
  { dimension_code: "mission", dimension_name: "Mission Alignment", dimension_type: "mission", description: "Alignment with core institutional mission", active: true },
];

export async function resolveActiveConstitution(
  client: SupabaseClient,
  orgId: string,
): Promise<TradeoffConstitution | null> {
  const { data } = await client
    .from("tradeoff_constitutions")
    .select("*")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as TradeoffConstitution | null;
}

export async function resolveActiveDimensions(
  client: SupabaseClient,
  orgId: string,
): Promise<TradeoffDimension[]> {
  const { data } = await client
    .from("tradeoff_dimensions")
    .select("*")
    .eq("organization_id", orgId)
    .eq("active", true)
    .order("dimension_code");
  return (data ?? []) as TradeoffDimension[];
}

export function getDefaultDimensions(): Omit<TradeoffDimension, "id">[] {
  return DEFAULT_DIMENSIONS;
}
