/**
 * useCanonGraphMemory — Sprint 205
 * Hook for Canon Graph Memory operations: node/edge CRUD and neighborhood queries.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export type GraphRelationType =
  | "supports"
  | "contradicts"
  | "supersedes"
  | "depends_on"
  | "similar_to"
  | "derived_from";

export const GRAPH_RELATION_LABELS: Record<GraphRelationType, string> = {
  supports: "Supports",
  contradicts: "Contradicts",
  supersedes: "Supersedes",
  depends_on: "Depends On",
  similar_to: "Similar To",
  derived_from: "Derived From",
};

export interface GraphNode {
  id: string;
  organization_id: string;
  canon_entry_id: string;
  node_type: string;
  label: string;
  domain_scope: string;
  centrality_score: number;
  cluster_id: string | null;
  tags: unknown;
  metadata: unknown;
  created_at: string;
}

export interface GraphEdge {
  id: string;
  organization_id: string;
  source_node_id: string;
  target_node_id: string;
  relation_type: GraphRelationType;
  strength: number;
  confidence: number;
  provenance_source: string;
  provenance_detail: string | null;
  evidence_refs: unknown;
  bidirectional: boolean;
  metadata: unknown;
  created_at: string;
}

export interface NeighborhoodResult {
  node_id: string;
  canon_entry_id: string;
  label: string;
  node_type: string;
  domain_scope: string;
  centrality_score: number;
  edge_id: string | null;
  relation_type: string | null;
  strength: number | null;
  confidence: number | null;
  direction: string;
  provenance_source: string | null;
  depth: number;
}

export function useCanonGraphMemory() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["canon-graph-nodes"] });
    qc.invalidateQueries({ queryKey: ["canon-graph-edges"] });
    qc.invalidateQueries({ queryKey: ["canon-graph-neighborhood"] });
  };

  // ─── All nodes ───
  const nodesQuery = useQuery({
    queryKey: ["canon-graph-nodes", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("canon_graph_nodes")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as GraphNode[];
    },
    enabled: !!orgId,
  });

  // ─── All edges ───
  const edgesQuery = useQuery({
    queryKey: ["canon-graph-edges", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("canon_graph_edges")
        .select("*")
        .eq("organization_id", orgId)
        .order("strength", { ascending: false });
      if (error) throw error;
      return (data || []) as GraphEdge[];
    },
    enabled: !!orgId,
  });

  // ─── Create edge ───
  const createEdge = useMutation({
    mutationFn: async (params: {
      sourceNodeId: string;
      targetNodeId: string;
      relationType: GraphRelationType;
      strength?: number;
      confidence?: number;
      provenanceSource?: string;
      provenanceDetail?: string;
      evidenceRefs?: unknown[];
      bidirectional?: boolean;
    }) => {
      if (!orgId) throw new Error("No organization");
      const { data, error } = await supabase
        .from("canon_graph_edges")
        .insert({
          organization_id: orgId,
          source_node_id: params.sourceNodeId,
          target_node_id: params.targetNodeId,
          relation_type: params.relationType as any,
          strength: params.strength ?? 0.5,
          confidence: params.confidence ?? 0.5,
          provenance_source: params.provenanceSource ?? "manual",
          provenance_detail: params.provenanceDetail ?? null,
          evidence_refs: (params.evidenceRefs ?? []) as any,
          bidirectional: params.bidirectional ?? false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Edge created", description: "Graph relationship added." });
      invalidate();
    },
    onError: (e: any) => {
      toast({ title: "Failed to create edge", description: e.message, variant: "destructive" });
    },
  });

  // ─── Delete edge ───
  const deleteEdge = useMutation({
    mutationFn: async (edgeId: string) => {
      const { error } = await supabase.from("canon_graph_edges").delete().eq("id", edgeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Edge removed" });
      invalidate();
    },
  });

  // ─── Neighborhood query ───
  const getNeighborhood = async (
    nodeId: string,
    depth = 1,
    relationTypes?: GraphRelationType[],
    minStrength = 0
  ): Promise<NeighborhoodResult[]> => {
    if (!orgId) return [];
    const { data, error } = await supabase.rpc("get_canon_graph_neighborhood", {
      p_organization_id: orgId,
      p_node_id: nodeId,
      p_depth: depth,
      p_relation_types: relationTypes ?? null,
      p_min_strength: minStrength,
    });
    if (error) throw error;
    return (data || []) as NeighborhoodResult[];
  };

  // ─── Graph stats ───
  const stats = {
    totalNodes: nodesQuery.data?.length ?? 0,
    totalEdges: edgesQuery.data?.length ?? 0,
    relationDistribution: (edgesQuery.data || []).reduce<Record<string, number>>((acc, e) => {
      acc[e.relation_type] = (acc[e.relation_type] || 0) + 1;
      return acc;
    }, {}),
  };

  return {
    nodes: nodesQuery.data || [],
    edges: edgesQuery.data || [],
    nodesLoading: nodesQuery.isLoading,
    edgesLoading: edgesQuery.isLoading,
    createEdge,
    deleteEdge,
    getNeighborhood,
    stats,
    invalidate,
  };
}
