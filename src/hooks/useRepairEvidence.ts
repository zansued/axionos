import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RepairEvidenceEntry {
  id: string;
  initiative_id: string;
  stage_name: string;
  error_category: string;
  error_code: string;
  error_message: string;
  repair_strategy: string;
  attempt_number: number;
  patch_summary: string;
  files_touched: string[];
  repair_result: string;
  revalidation_status: string;
  duration_ms: number;
  created_at: string;
}

export function useRepairEvidence(initiativeId: string | null) {
  return useQuery<RepairEvidenceEntry[]>({
    queryKey: ["repair-evidence", initiativeId],
    enabled: !!initiativeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_evidence")
        .select("id, initiative_id, stage_name, error_category, error_code, error_message, repair_strategy, attempt_number, patch_summary, files_touched, repair_result, revalidation_status, duration_ms, created_at")
        .eq("initiative_id", initiativeId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as RepairEvidenceEntry[];
    },
    staleTime: 30_000,
  });
}
