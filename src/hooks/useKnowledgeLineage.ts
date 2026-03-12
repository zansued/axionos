import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

function invoke(body: Record<string, any>) {
  return supabase.functions.invoke("knowledge-lineage-engine", { body }).then(({ data, error }) => {
    if (error) throw error;
    return data;
  });
}

export function useKnowledgeLineage() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const { toast } = useToast();

  const lineageEvents = useQuery({
    queryKey: ["knowledge-lineage-events", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_lineage_events")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const provenanceLinks = useQuery({
    queryKey: ["knowledge-provenance-links", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_provenance_links")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const confidenceBreakdowns = useQuery({
    queryKey: ["knowledge-confidence-breakdowns", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_confidence_breakdowns")
        .select("*")
        .eq("organization_id", orgId!)
        .order("final_confidence", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["knowledge-lineage-events"] });
    qc.invalidateQueries({ queryKey: ["knowledge-provenance-links"] });
    qc.invalidateQueries({ queryKey: ["knowledge-confidence-breakdowns"] });
  };

  const buildLineage = useMutation({
    mutationFn: () => invoke({ action: "build_lineage", organization_id: orgId }),
    onSuccess: (d) => { invalidateAll(); toast({ title: "Lineage built", description: `${d?.events_created || 0} events, ${d?.links_created || 0} links` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const computeBreakdowns = useMutation({
    mutationFn: () => invoke({ action: "compute_confidence_breakdowns", organization_id: orgId }),
    onSuccess: (d) => { invalidateAll(); toast({ title: "Breakdowns computed", description: `${d?.computed || 0} entries` }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const checkIntegrity = useMutation({
    mutationFn: () => invoke({ action: "check_integrity", organization_id: orgId }),
    onSuccess: (d) => { toast({ title: "Integrity check complete", description: `${d?.alerts_count || 0} issues found` }); return d; },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return {
    lineageEvents,
    provenanceLinks,
    confidenceBreakdowns,
    buildLineage,
    computeBreakdowns,
    checkIntegrity,
    loading: lineageEvents.isLoading,
  };
}
