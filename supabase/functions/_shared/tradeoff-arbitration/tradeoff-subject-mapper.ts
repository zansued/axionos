/**
 * tradeoff-subject-mapper.ts
 * Maps decisions, plans, initiatives into tradeoff evaluation subjects.
 */
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface TradeoffSubject {
  id: string;
  subject_code: string;
  subject_type: string;
  subject_ref: Record<string, unknown>;
  domain: string;
  title: string;
  summary: string;
  active: boolean;
}

export async function listTradeoffSubjects(
  client: SupabaseClient,
  orgId: string,
  filters?: { subject_type?: string; domain?: string; active?: boolean },
): Promise<TradeoffSubject[]> {
  let q = client.from("tradeoff_subjects").select("*").eq("organization_id", orgId);
  if (filters?.subject_type) q = q.eq("subject_type", filters.subject_type);
  if (filters?.domain) q = q.eq("domain", filters.domain);
  if (filters?.active !== undefined) q = q.eq("active", filters.active);
  const { data } = await q.order("created_at", { ascending: false });
  return (data ?? []) as TradeoffSubject[];
}

export async function upsertTradeoffSubject(
  client: SupabaseClient,
  orgId: string,
  subject: Omit<TradeoffSubject, "id" | "active"> & { id?: string },
): Promise<TradeoffSubject | null> {
  const payload = { ...subject, organization_id: orgId, active: true };
  const { data } = await client
    .from("tradeoff_subjects")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();
  return data as TradeoffSubject | null;
}
