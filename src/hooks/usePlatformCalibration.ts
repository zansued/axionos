import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

function invoke(action: string, orgId: string, extra: Record<string, unknown> = {}) {
  return supabase.functions.invoke("platform-self-calibration", {
    body: { action, organization_id: orgId, ...extra },
  });
}

export function usePlatformCalibration() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();

  const overview = useQuery({
    queryKey: ["platform-calibration-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke("overview", orgId!);
      if (error) throw error;
      return data as any;
    },
  });

  const parameters = useQuery({
    queryKey: ["platform-calibration-parameters", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke("get_parameters", orgId!);
      if (error) throw error;
      return data as any;
    },
  });

  const proposals = useQuery({
    queryKey: ["platform-calibration-proposals", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke("get_proposals", orgId!);
      if (error) throw error;
      return data as any;
    },
  });

  const applications = useQuery({
    queryKey: ["platform-calibration-applications", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke("get_applications", orgId!);
      if (error) throw error;
      return data as any;
    },
  });

  const rollbacks = useQuery({
    queryKey: ["platform-calibration-rollbacks", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke("get_rollbacks", orgId!);
      if (error) throw error;
      return data as any;
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["platform-calibration-overview"] });
    qc.invalidateQueries({ queryKey: ["platform-calibration-parameters"] });
    qc.invalidateQueries({ queryKey: ["platform-calibration-proposals"] });
    qc.invalidateQueries({ queryKey: ["platform-calibration-applications"] });
    qc.invalidateQueries({ queryKey: ["platform-calibration-rollbacks"] });
  };

  const recompute = useMutation({
    mutationFn: async () => {
      const { data, error } = await invoke("recompute", orgId!);
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  const reviewProposal = useMutation({
    mutationFn: async (proposalId: string) => {
      const { data, error } = await invoke("review_proposal", orgId!, { proposal_id: proposalId });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  const rejectProposal = useMutation({
    mutationFn: async (proposalId: string) => {
      const { data, error } = await invoke("reject_proposal", orgId!, { proposal_id: proposalId });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  const applyCalibration = useMutation({
    mutationFn: async (proposalId: string) => {
      const { data, error } = await invoke("apply_calibration", orgId!, { proposal_id: proposalId });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  const rollbackCalibration = useMutation({
    mutationFn: async (applicationId: string) => {
      const { data, error } = await invoke("rollback", orgId!, { application_id: applicationId });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidateAll,
  });

  return {
    overview, parameters, proposals, applications, rollbacks,
    recompute, reviewProposal, rejectProposal, applyCalibration, rollbackCalibration,
  };
}
