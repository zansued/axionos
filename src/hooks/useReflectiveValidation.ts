import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { toast } from "@/hooks/use-toast";

export function useReflectiveValidation() {
  const { currentOrg } = useOrg();
  const qc = useQueryClient();
  const orgId = currentOrg?.id;

  const eventsQuery = useQuery({
    queryKey: ["reflective-validation-events", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("self_revision_events")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const validationRunsQuery = useQuery({
    queryKey: ["reflective-validation-runs", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("self_revision_validation_runs")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const displacementQuery = useQuery({
    queryKey: ["reflective-displacement-signals", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("self_revision_displacement_signals")
        .select("*")
        .eq("organization_id", orgId!)
        .order("detected_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const registerEvent = useMutation({
    mutationFn: async (params: {
      origin_type: string;
      revision_scope: string;
      affected_runtime_surfaces: string[];
      intended_outcome: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("reflective-validation-audit", {
        body: {
          action: "register_revision_event",
          organization_id: orgId,
          ...params,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reflective-validation-events"] });
      toast({ title: "Revision event registered" });
    },
  });

  const runValidation = useMutation({
    mutationFn: async (params: {
      revision_event_id: string;
      intended_outcome: string;
      observed_outcome: string;
      affected_surfaces: string[];
      before_metrics: Record<string, number>;
      after_metrics: Record<string, number>;
    }) => {
      const { data, error } = await supabase.functions.invoke("reflective-validation-audit", {
        body: {
          action: "run_reflective_validation",
          organization_id: orgId,
          ...params,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reflective-validation-events"] });
      qc.invalidateQueries({ queryKey: ["reflective-validation-runs"] });
      qc.invalidateQueries({ queryKey: ["reflective-displacement-signals"] });
      toast({ title: "Reflective validation completed" });
    },
  });

  return {
    events: eventsQuery.data || [],
    validationRuns: validationRunsQuery.data || [],
    displacements: displacementQuery.data || [],
    loading: eventsQuery.isLoading,
    registerEvent,
    runValidation,
  };
}
