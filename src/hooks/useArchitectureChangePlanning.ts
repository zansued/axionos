import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function invokeArchPlan(orgId: string, action: string, params: Record<string, any> = {}) {
  return supabase.functions.invoke("architecture-change-planning", {
    body: { action, organization_id: orgId, ...params },
  });
}

export function useArchitectureChangePlanning() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();

  const overview = useQuery({
    queryKey: ["arch-plan-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invokeArchPlan(orgId!, "overview");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const plans = useQuery({
    queryKey: ["arch-plan-plans", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invokeArchPlan(orgId!, "plans");
      if (error) throw error;
      return data;
    },
  });

  const rolloutProfiles = useQuery({
    queryKey: ["arch-plan-profiles", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invokeArchPlan(orgId!, "rollout_profiles");
      if (error) throw error;
      return data;
    },
  });

  const recompute = useMutation({
    mutationFn: async () => {
      const { data, error } = await invokeArchPlan(orgId!, "recompute");
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      toast.success(`Planning complete: ${d.plans_created} plans created`);
      qc.invalidateQueries({ queryKey: ["arch-plan-overview"] });
      qc.invalidateQueries({ queryKey: ["arch-plan-plans"] });
    },
    onError: () => toast.error("Failed to recompute plans"),
  });

  const reviewAction = useMutation({
    mutationFn: async (params: { plan_id: string; action: string; review_notes?: string; blocker_reasons?: string[] }) => {
      const { data, error } = await invokeArchPlan(orgId!, params.action, {
        plan_id: params.plan_id,
        review_notes: params.review_notes,
        blocker_reasons: params.blocker_reasons,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Review action applied");
      qc.invalidateQueries({ queryKey: ["arch-plan-plans"] });
      qc.invalidateQueries({ queryKey: ["arch-plan-overview"] });
    },
    onError: () => toast.error("Failed to apply review action"),
  });

  return { overview, plans, rolloutProfiles, recompute, reviewAction };
}
