import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useKnowledgeAcquisitionRoi() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("knowledge-acquisition-roi-engine", {
      body: { action, organizationId: currentOrg?.id, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const KEYS = {
    overview: ["acq-roi-overview", currentOrg?.id],
    snapshots: ["acq-roi-snapshots", currentOrg?.id],
    sources: ["acq-roi-sources", currentOrg?.id],
    modes: ["acq-roi-modes", currentOrg?.id],
    lowValue: ["acq-roi-low-value", currentOrg?.id],
  };

  const invalidateAll = () => Object.values(KEYS).forEach((k) => qc.invalidateQueries({ queryKey: k }));

  const overviewQuery = useQuery({ queryKey: KEYS.overview, queryFn: () => invoke("overview"), enabled: !!currentOrg });
  const snapshotsQuery = useQuery({ queryKey: KEYS.snapshots, queryFn: () => invoke("list_snapshots"), enabled: !!currentOrg });
  const sourcesQuery = useQuery({ queryKey: KEYS.sources, queryFn: () => invoke("source_analysis"), enabled: !!currentOrg });
  const modesQuery = useQuery({ queryKey: KEYS.modes, queryFn: () => invoke("mode_analysis"), enabled: !!currentOrg });
  const lowValueQuery = useQuery({ queryKey: KEYS.lowValue, queryFn: () => invoke("low_value_report"), enabled: !!currentOrg });

  const computeRoi = useMutation({
    mutationFn: () => invoke("compute_roi"),
    onSuccess: (d) => { invalidateAll(); toast({ title: "ROI computed", description: `${d.snapshots_created} snapshots created` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const feedbackToPlanner = useMutation({
    mutationFn: () => invoke("feedback_to_planner"),
    onSuccess: (d) => { invalidateAll(); toast({ title: "Feedback sent", description: `${d.feedback_generated} signals generated` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    overview: overviewQuery.data || {},
    snapshots: snapshotsQuery.data?.snapshots || [],
    sources: sourcesQuery.data?.sources || [],
    modes: modesQuery.data?.modes || [],
    lowValue: lowValueQuery.data?.low_value_items || [],
    loading: overviewQuery.isLoading,
    computeRoi,
    feedbackToPlanner,
  };
}
