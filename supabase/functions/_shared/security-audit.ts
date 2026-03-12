import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuditEntry {
  organization_id: string;
  actor_id: string;
  function_name: string;
  action: string;
  outcome?: string;
  context?: Record<string, unknown>;
}

/**
 * Log a security-sensitive action to the audit trail.
 * Fire-and-forget — does not throw on failure.
 */
export async function logSecurityAudit(
  serviceClient: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  try {
    await serviceClient.from("security_audit_events").insert({
      organization_id: entry.organization_id,
      actor_id: entry.actor_id,
      function_name: entry.function_name,
      action: entry.action,
      outcome: entry.outcome ?? "success",
      context: entry.context ?? {},
    });
  } catch (err) {
    console.error("[SecurityAudit] Failed to log:", err);
  }
}

/**
 * Resolve the user's organization from their membership.
 * If org_id is provided in the payload, validates it against actual membership.
 * Returns { orgId, error }.
 */
export async function resolveAndValidateOrg(
  serviceClient: SupabaseClient,
  userId: string,
  payloadOrgId?: string
): Promise<{ orgId: string | null; error: string | null }> {
  const { data: memberships, error } = await serviceClient
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId);

  if (error || !memberships || memberships.length === 0) {
    return { orgId: null, error: "User is not a member of any organization" };
  }

  if (payloadOrgId) {
    const match = memberships.find((m: any) => m.organization_id === payloadOrgId);
    if (!match) {
      return { orgId: null, error: "Not a member of the specified organization" };
    }
    return { orgId: payloadOrgId, error: null };
  }

  // Default to first org
  return { orgId: memberships[0].organization_id, error: null };
}
