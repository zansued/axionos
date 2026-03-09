/**
 * horizon-model-resolver.ts
 * Resolves active horizon constitution and relevant horizons for an organization.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface HorizonConstitution {
  id: string;
  constitution_code: string;
  constitution_name: string;
  scope: string;
  status: string;
  horizon_principles: string;
  default_horizon_weights: Record<string, number>;
}

export interface StrategicHorizon {
  id: string;
  horizon_code: string;
  horizon_name: string;
  horizon_type: string;
  default_timeframe: string;
  description: string;
  active: boolean;
}

export async function resolveActiveConstitution(
  client: SupabaseClient,
  orgId: string,
): Promise<HorizonConstitution | null> {
  const { data } = await client
    .from("strategic_horizon_constitutions")
    .select("*")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as HorizonConstitution | null;
}

export async function resolveActiveHorizons(
  client: SupabaseClient,
  orgId: string,
): Promise<StrategicHorizon[]> {
  const { data } = await client
    .from("strategic_horizons")
    .select("*")
    .eq("organization_id", orgId)
    .eq("active", true)
    .order("horizon_type");
  return (data ?? []) as StrategicHorizon[];
}

export function getDefaultHorizons(): Array<{
  horizon_code: string;
  horizon_name: string;
  horizon_type: string;
  default_timeframe: string;
  description: string;
}> {
  return [
    { horizon_code: "short_term", horizon_name: "Short Term", horizon_type: "short_term", default_timeframe: "0-3 months", description: "Immediate operational priorities and tactical execution." },
    { horizon_code: "medium_term", horizon_name: "Medium Term", horizon_type: "medium_term", default_timeframe: "3-12 months", description: "Execution alignment and structural capacity building." },
    { horizon_code: "long_term", horizon_name: "Long Term", horizon_type: "long_term", default_timeframe: "1-5 years", description: "Strategic direction, capability evolution, institutional positioning." },
    { horizon_code: "mission_continuity", horizon_name: "Mission Continuity", horizon_type: "mission_continuity", default_timeframe: "5+ years", description: "Mission durability, institutional identity preservation, civilizational continuity." },
  ];
}
