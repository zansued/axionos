import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

function invoke(action: string, orgId: string, extra: Record<string, unknown> = {}) {
  return supabase.functions.invoke("platform-self-stabilization", {
    body: { action, organization_id: orgId, ...extra },
  });
}

export function usePlatformStabilization() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();

  const overview = useQuery({
    queryKey: ["platform-stabilization-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke("overview", orgId!);
      if (error) throw error;
      return data as any;
    },
  });

  const signals = useQuery({
    queryKey: ["platform-stabilization-signals", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke("get_signals", orgId!);
      if (error) throw error;
      return data as any;
    },
  });

  const actions = useQuery({
    queryKey: ["platform-stabilization-actions", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke("get_actions", orgId!);
      if (error) throw error;
      return data as any;
    },
  });

  const safeModeProfiles = useQuery({
    queryKey: ["platform-stabilization-safe-modes", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke("get_safe_mode_profiles", orgId!);
      if (error) throw error;
      return data as any;
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["platform-stabilization-overview"] });
    qc.invalidateQueries({ queryKey: ["platform-stabilization-signals"] });
    qc.invalidateQueries({ queryKey: ["platform-stabilization-actions"] });
  };

  const recompute = useMutation({
    mutationFn: async (params: Record<string, unknown> = {}) => {
      const { data, error } = await invoke("recompute", orgId!, params);
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  const reviewAction = useMutation({
    mutationFn: async (actionId: string) => {
      const { data, error } = await invoke("review_action", orgId!, { action_id: actionId });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  const applyStabilization = useMutation({
    mutationFn: async (actionId: string) => {
      const { data, error } = await invoke("apply_stabilization", orgId!, { action_id: actionId });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  const rollbackStabilization = useMutation({
    mutationFn: async (params: { action_id: string; restored_state?: Record<string, unknown>; reason?: Record<string, unknown> }) => {
      const { data, error } = await invoke("rollback_stabilization", orgId!, params);
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  const rejectAction = useMutation({
    mutationFn: async (actionId: string) => {
      const { data, error } = await invoke("reject_action", orgId!, { action_id: actionId });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  return {
    overview, signals, actions, safeModeProfiles,
    recompute, reviewAction, applyStabilization, rollbackStabilization, rejectAction,
  };
}
