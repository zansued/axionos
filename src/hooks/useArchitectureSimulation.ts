import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function invokeArchSim(orgId: string, action: string, params: Record<string, any> = {}) {
  return supabase.functions.invoke("architecture-simulation", {
    body: { action, organization_id: orgId, ...params },
  });
}

export function useArchitectureSimulation() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();

  const overview = useQuery({
    queryKey: ["arch-sim-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invokeArchSim(orgId!, "overview");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const proposals = useQuery({
    queryKey: ["arch-sim-proposals", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invokeArchSim(orgId!, "proposals");
      if (error) throw error;
      return data;
    },
  });

  const outcomes = useQuery({
    queryKey: ["arch-sim-outcomes", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invokeArchSim(orgId!, "outcomes");
      if (error) throw error;
      return data;
    },
  });

  const scopeProfiles = useQuery({
    queryKey: ["arch-sim-scope-profiles", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invokeArchSim(orgId!, "scope_profiles");
      if (error) throw error;
      return data;
    },
  });

  const recompute = useMutation({
    mutationFn: async () => {
      const { data, error } = await invokeArchSim(orgId!, "recompute");
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      toast.success(`Simulation complete: ${d.simulations_created} simulations created`);
      qc.invalidateQueries({ queryKey: ["arch-sim-overview"] });
      qc.invalidateQueries({ queryKey: ["arch-sim-outcomes"] });
      qc.invalidateQueries({ queryKey: ["arch-sim-proposals"] });
    },
    onError: () => toast.error("Failed to recompute simulations"),
  });

  const linkRecommendation = useMutation({
    mutationFn: async (recommendation_id: string) => {
      const { data, error } = await invokeArchSim(orgId!, "link_recommendation", { recommendation_id });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Recommendation linked to proposal");
      qc.invalidateQueries({ queryKey: ["arch-sim-proposals"] });
    },
    onError: () => toast.error("Failed to link recommendation"),
  });

  const reviewAction = useMutation({
    mutationFn: async (params: { simulation_outcome_id: string; action: string; review_notes?: string; review_reason_codes?: string[] }) => {
      const { data, error } = await invokeArchSim(orgId!, params.action, {
        simulation_outcome_id: params.simulation_outcome_id,
        review_notes: params.review_notes,
        review_reason_codes: params.review_reason_codes,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Review action applied");
      qc.invalidateQueries({ queryKey: ["arch-sim-outcomes"] });
      qc.invalidateQueries({ queryKey: ["arch-sim-overview"] });
    },
    onError: () => toast.error("Failed to apply review action"),
  });

  return { overview, proposals, outcomes, scopeProfiles, recompute, linkRecommendation, reviewAction };
}
