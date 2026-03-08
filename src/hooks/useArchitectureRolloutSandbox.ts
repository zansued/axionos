import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function invokeRolloutSandbox(orgId: string, action: string, params: Record<string, any> = {}) {
  return supabase.functions.invoke("architecture-rollout-sandbox", {
    body: { action, organization_id: orgId, ...params },
  });
}

export function useArchitectureRolloutSandbox() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();

  const overview = useQuery({
    queryKey: ["arch-sandbox-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invokeRolloutSandbox(orgId!, "overview");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const sandboxes = useQuery({
    queryKey: ["arch-sandbox-list", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invokeRolloutSandbox(orgId!, "sandboxes");
      if (error) throw error;
      return data;
    },
  });

  const recompute = useMutation({
    mutationFn: async () => {
      const { data, error } = await invokeRolloutSandbox(orgId!, "recompute");
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      toast.success(`Sandbox rehearsal complete: ${d.sandboxes_created} sandboxes created`);
      qc.invalidateQueries({ queryKey: ["arch-sandbox-overview"] });
      qc.invalidateQueries({ queryKey: ["arch-sandbox-list"] });
    },
    onError: () => toast.error("Failed to recompute sandboxes"),
  });

  const reviewAction = useMutation({
    mutationFn: async (params: { sandbox_id: string; action: string; review_notes?: string; blocker_reasons?: string[] }) => {
      const { data, error } = await invokeRolloutSandbox(orgId!, params.action, {
        sandbox_id: params.sandbox_id,
        review_notes: params.review_notes,
        blocker_reasons: params.blocker_reasons,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Review action applied");
      qc.invalidateQueries({ queryKey: ["arch-sandbox-list"] });
      qc.invalidateQueries({ queryKey: ["arch-sandbox-overview"] });
    },
    onError: () => toast.error("Failed to apply review action"),
  });

  return { overview, sandboxes, recompute, reviewAction };
}
