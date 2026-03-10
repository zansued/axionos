import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

async function invokeRepairArchive(action: string, params: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("repair-intelligence-archive", {
    body: { action, ...params },
  });
  if (error) throw error;
  return data;
}

export function useFailureMemoryEntries(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["failure-memory-entries", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("failure_memory_entries")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });
}

export function useRepairAttemptRecords(organizationId: string | undefined, failureMemoryId?: string) {
  return useQuery({
    queryKey: ["repair-attempt-records", organizationId, failureMemoryId],
    queryFn: async () => {
      let q = supabase
        .from("repair_attempt_records")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (failureMemoryId) q = q.eq("failure_memory_id", failureMemoryId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });
}

export function useFalseFixRecords(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["false-fix-records", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("false_fix_records")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });
}

export function useMitigationPatterns(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["mitigation-patterns", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mitigation_patterns")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("confidence_score", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });
}

export function useExplainFailure() {
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => invokeRepairArchive("explain_failure_pattern", params),
  });
}

export function useDetectFalseFixes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => invokeRepairArchive("detect_false_fix", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["false-fix-records"] }),
  });
}

export function useScoreFailureMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => invokeRepairArchive("score_failure_memory", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["failure-memory-entries"] }),
  });
}
