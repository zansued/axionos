/**
 * Context Doctrine Mapper
 * Identifies which context profiles impact a decision and cross-references
 * environment, domain, tenant, and regulatory sensitivity.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ContextProfile {
  id: string;
  context_code: string;
  context_name: string;
  organization_id: string;
  workspace_id: string | null;
  environment_type: string;
  operational_domain: string;
  regulatory_sensitivity: string;
  doctrine_profile_status: string;
}

export async function loadContextProfiles(
  client: SupabaseClient,
  organizationId: string,
  filters?: {
    workspaceId?: string;
    environmentType?: string;
    operationalDomain?: string;
  }
): Promise<ContextProfile[]> {
  let query = client
    .from("doctrine_context_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("doctrine_profile_status", "active");

  if (filters?.workspaceId) query = query.eq("workspace_id", filters.workspaceId);
  if (filters?.environmentType) query = query.eq("environment_type", filters.environmentType);
  if (filters?.operationalDomain) query = query.eq("operational_domain", filters.operationalDomain);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as ContextProfile[];
}

export function matchContextToDecision(
  profiles: ContextProfile[],
  decisionContext: {
    workspaceId?: string;
    domain?: string;
    environment?: string;
  }
): ContextProfile[] {
  return profiles.filter((p) => {
    if (decisionContext.workspaceId && p.workspace_id && p.workspace_id !== decisionContext.workspaceId) return false;
    if (decisionContext.domain && p.operational_domain !== "general" && p.operational_domain !== decisionContext.domain) return false;
    if (decisionContext.environment && p.environment_type !== decisionContext.environment) return false;
    return true;
  });
}
