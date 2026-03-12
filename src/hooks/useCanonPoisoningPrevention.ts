import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function invoke(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("canon-poisoning-prevention", {
    body: { action, ...params },
  });
  if (error) throw error;
  return data;
}

export function usePoisoningOverview() {
  return useQuery({ queryKey: ["poisoning", "overview"], queryFn: () => invoke("overview") });
}

export function usePoisoningAssessments() {
  return useQuery({ queryKey: ["poisoning", "assessments"], queryFn: () => invoke("list_assessments") });
}

export function useQuarantinedCandidates() {
  return useQuery({ queryKey: ["poisoning", "quarantined"], queryFn: () => invoke("list_quarantined") });
}

export function usePoisoningSignals() {
  return useQuery({ queryKey: ["poisoning", "signals"], queryFn: () => invoke("list_signals") });
}

export function useAssessCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => invoke("assess_candidate", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["poisoning"] }),
  });
}

export function useAssessBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => invoke("assess_batch", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["poisoning"] }),
  });
}

export function useQuarantineCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => invoke("quarantine_candidate", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["poisoning"] }),
  });
}

export function useReleaseCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => invoke("release_candidate", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["poisoning"] }),
  });
}

export function useCheckPromotionGate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => invoke("check_promotion_gate", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["poisoning"] }),
  });
}
