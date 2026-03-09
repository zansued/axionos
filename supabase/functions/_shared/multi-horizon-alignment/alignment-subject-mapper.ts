/**
 * alignment-subject-mapper.ts
 * Maps initiatives, policies, decisions into horizon evaluation subjects.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AlignmentSubject {
  id: string;
  subject_code: string;
  subject_type: string;
  subject_ref: Record<string, unknown>;
  domain: string;
  title: string;
  summary: string;
  active: boolean;
}

export async function listSubjects(
  client: SupabaseClient,
  orgId: string,
  filters?: { subject_type?: string; domain?: string; active?: boolean },
): Promise<AlignmentSubject[]> {
  let q = client
    .from("strategic_alignment_subjects")
    .select("*")
    .eq("organization_id", orgId);

  if (filters?.subject_type) q = q.eq("subject_type", filters.subject_type);
  if (filters?.domain) q = q.eq("domain", filters.domain);
  if (filters?.active !== undefined) q = q.eq("active", filters.active);

  const { data } = await q.order("created_at", { ascending: false });
  return (data ?? []) as AlignmentSubject[];
}

export async function upsertSubject(
  client: SupabaseClient,
  orgId: string,
  subject: Omit<AlignmentSubject, "id" | "active"> & { id?: string },
): Promise<AlignmentSubject | null> {
  const payload = { ...subject, organization_id: orgId, active: true };
  const { data } = await client
    .from("strategic_alignment_subjects")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();
  return data as AlignmentSubject | null;
}

export function inferDomainFromType(subjectType: string): string {
  const map: Record<string, string> = {
    initiative: "delivery",
    policy: "governance",
    plan: "strategy",
    decision: "governance",
    program: "portfolio",
    portfolio: "portfolio",
  };
  return map[subjectType] ?? "general";
}
