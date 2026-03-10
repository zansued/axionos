import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useCanonPromotionPipeline() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = currentOrg?.id;

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("canon-promotion-pipeline", {
      body: { action, organization_id: orgId, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const RECORDS_KEY = ["canon-learning-records", orgId];
  const SUMMARY_KEY = ["canon-learning-summary", orgId];

  const recordsQuery = useQuery({
    queryKey: RECORDS_KEY,
    queryFn: () => invoke("list_canon_records"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const summaryQuery = useQuery({
    queryKey: SUMMARY_KEY,
    queryFn: () => invoke("canon_summary"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: RECORDS_KEY });
    qc.invalidateQueries({ queryKey: SUMMARY_KEY });
  };

  const createRecord = useMutation({
    mutationFn: (candidateId: string) => invoke("create_record_from_candidate", { candidate_id: candidateId }),
    onSuccess: () => { invalidateAll(); toast({ title: "Canon record created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reviewRecord = useMutation({
    mutationFn: (params: { record_id: string; review_notes?: string }) => invoke("review_record", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Sent to review" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const approveRecord = useMutation({
    mutationFn: (params: { record_id: string; review_notes?: string }) => invoke("approve_record", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Record approved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const activateRecord = useMutation({
    mutationFn: (recordId: string) => invoke("activate_record", { record_id: recordId }),
    onSuccess: () => { invalidateAll(); toast({ title: "Canon record activated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deprecateRecord = useMutation({
    mutationFn: (params: { record_id: string; review_notes?: string }) => invoke("deprecate_record", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Canon record deprecated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    records: recordsQuery.data?.records || [],
    recordsLoading: recordsQuery.isLoading,
    summary: summaryQuery.data,
    summaryLoading: summaryQuery.isLoading,
    createRecord,
    reviewRecord,
    approveRecord,
    activateRecord,
    deprecateRecord,
  };
}
