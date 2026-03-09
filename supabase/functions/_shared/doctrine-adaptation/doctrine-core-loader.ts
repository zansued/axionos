/**
 * Doctrine Core Loader
 * Resolves the base doctrine applicable to a given context, building
 * the inheritance chain: core → federated → local → operational.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface DoctrineRecord {
  id: string;
  doctrine_code: string;
  doctrine_name: string;
  doctrine_scope: string;
  doctrine_domain: string;
  doctrine_text: string;
  doctrine_version: number;
  lifecycle_status: string;
  immutability_level: string;
  recommendation_strength: string;
  confidence_score: number;
  organization_id: string;
}

const SCOPE_PRIORITY: Record<string, number> = {
  core: 0,
  federated: 1,
  local: 2,
  operational: 3,
};

export async function loadDoctrineChain(
  client: SupabaseClient,
  organizationId: string,
  domain?: string
): Promise<DoctrineRecord[]> {
  let query = client
    .from("institutional_doctrines")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("lifecycle_status", "active")
    .order("created_at", { ascending: true });

  if (domain) {
    query = query.eq("doctrine_domain", domain);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Sort by scope priority (core first)
  return (data || []).sort(
    (a: any, b: any) =>
      (SCOPE_PRIORITY[a.doctrine_scope] ?? 99) -
      (SCOPE_PRIORITY[b.doctrine_scope] ?? 99)
  ) as DoctrineRecord[];
}

export function resolveEffectiveDoctrine(
  chain: DoctrineRecord[]
): DoctrineRecord | null {
  if (chain.length === 0) return null;
  // The most specific scope that is active wins, but core is always the baseline
  return chain[chain.length - 1];
}

export function getCoreDoctrines(chain: DoctrineRecord[]): DoctrineRecord[] {
  return chain.filter((d) => d.doctrine_scope === "core");
}
