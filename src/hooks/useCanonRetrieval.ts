import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

async function invokeCanonRetrieval(action: string, params: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("canon-retrieval", {
    body: { action, ...params },
  });
  if (error) throw error;
  return data;
}

export function useCanonPatterns(organizationId: string | undefined, filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["canon-patterns", organizationId, filters],
    queryFn: () => invokeCanonRetrieval("retrieve_patterns", { organization_id: organizationId, ...filters }),
    enabled: !!organizationId,
  });
}

export function useCanonUsageEvents(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["canon-usage-events", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_usage_events")
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

export function useCanonPatternApplications(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["canon-pattern-applications", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_pattern_applications")
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

export function useCanonRetrievalFeedback(organizationId: string | undefined) {
  return useQuery({
    queryKey: ["canon-retrieval-feedback", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_retrieval_feedback")
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

export function useRetrievePatterns() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => invokeCanonRetrieval("retrieve_patterns", params),
    onError: (err: Error) => toast({ title: "Retrieval failed", description: err.message, variant: "destructive" }),
  });
}

export function useScoreApplicability() {
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => invokeCanonRetrieval("score_applicability", params),
  });
}

export function useRegisterUsage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => invokeCanonRetrieval("register_usage", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["canon-usage-events"] }),
  });
}

export function useSubmitFeedback() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => invokeCanonRetrieval("submit_feedback", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["canon-retrieval-feedback"] });
      toast({ title: "Feedback submitted" });
    },
    onError: (err: Error) => toast({ title: "Feedback failed", description: err.message, variant: "destructive" }),
  });
}

export function useExplainRetrieval() {
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => invokeCanonRetrieval("explain_retrieval", params),
  });
}
