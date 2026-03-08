import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function invokePilot(orgId: string, action: string, params: Record<string, any> = {}) {
  return supabase.functions.invoke("architecture-rollout-pilot", {
    body: { action, organization_id: orgId, ...params },
  });
}

export function useArchitectureRolloutPilot() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();

  const overview = useQuery({
    queryKey: ["arch-pilot-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invokePilot(orgId!, "overview");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const pilots = useQuery({
    queryKey: ["arch-pilot-list", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invokePilot(orgId!, "pilots");
      if (error) throw error;
      return data;
    },
  });

  const outcomes = useQuery({
    queryKey: ["arch-pilot-outcomes", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invokePilot(orgId!, "outcomes");
      if (error) throw error;
      return data;
    },
  });

  const rollbacks = useQuery({
    queryKey: ["arch-pilot-rollbacks", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invokePilot(orgId!, "rollbacks");
      if (error) throw error;
      return data;
    },
  });

  const recompute = useMutation({
    mutationFn: async () => {
      const { data, error } = await invokePilot(orgId!, "recompute");
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      toast.success(`Pilot candidates created: ${d.pilots_created}`);
      qc.invalidateQueries({ queryKey: ["arch-pilot-overview"] });
      qc.invalidateQueries({ queryKey: ["arch-pilot-list"] });
    },
    onError: () => toast.error("Failed to recompute pilots"),
  });

  const pilotAction = useMutation({
    mutationFn: async (params: { pilot_id: string; action: string; review_notes?: string; review_reason_codes?: string[]; rollback_reason?: Record<string, unknown>; rollback_mode?: string }) => {
      const { data, error } = await invokePilot(orgId!, params.action, {
        pilot_id: params.pilot_id,
        review_notes: params.review_notes,
        review_reason_codes: params.review_reason_codes,
        rollback_reason: params.rollback_reason,
        rollback_mode: params.rollback_mode,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Pilot action applied");
      qc.invalidateQueries({ queryKey: ["arch-pilot-list"] });
      qc.invalidateQueries({ queryKey: ["arch-pilot-overview"] });
      qc.invalidateQueries({ queryKey: ["arch-pilot-outcomes"] });
      qc.invalidateQueries({ queryKey: ["arch-pilot-rollbacks"] });
    },
    onError: () => toast.error("Failed to apply pilot action"),
  });

  return { overview, pilots, outcomes, rollbacks, recompute, pilotAction };
}
