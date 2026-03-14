/**
 * Source Discovery Agent Hook
 * 
 * Provides discovery, scoring, approval/rejection, and review
 * for official sources and GitHub repos.
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export interface DiscoveryCandidate {
  id: string;
  source_url: string;
  source_name: string;
  source_type: string;
  discovery_method: string;
  official_domain_match: boolean;
  official_org_match: boolean;
  github_verified_org: boolean;
  repo_stars: number | null;
  docs_quality_score: number;
  architecture_relevance_score: number;
  noise_risk_score: number;
  freshness_score: number;
  composite_trust_score: number;
  pipeline_stage: string;
  review_status: string;
  review_notes: string | null;
  rejection_reason: string | null;
  promoted_source_id: string | null;
  run_id: string | null;
  created_at: string;
}

export interface DiscoveryRun {
  id: string;
  discovery_type: string;
  query_topic: string;
  status: string;
  candidates_found: number;
  candidates_approved: number;
  candidates_rejected: number;
  created_at: string;
}

export function useSourceDiscoveryAgent() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = currentOrg?.id;

  // Fetch candidates
  const { data: candidates = [], isLoading: loadingCandidates, refetch: refetchCandidates } = useQuery({
    queryKey: ["source-discovery-candidates", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("source_discovery_candidates" as any)
        .select("*")
        .eq("organization_id", orgId)
        .order("composite_trust_score", { ascending: false })
        .limit(200);
      return (data || []) as unknown as DiscoveryCandidate[];
    },
    enabled: !!orgId,
  });

  // Fetch runs
  const { data: runs = [], refetch: refetchRuns } = useQuery({
    queryKey: ["source-discovery-runs", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from("source_discovery_runs" as any)
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data || []) as unknown as DiscoveryRun[];
    },
    enabled: !!orgId,
  });

  const refetchAll = useCallback(() => {
    refetchCandidates();
    refetchRuns();
  }, [refetchCandidates, refetchRuns]);

  // Discover sources
  const discoverSources = useMutation({
    mutationFn: async (topic: string) => {
      const { data, error } = await supabase.functions.invoke("source-discovery-agent", {
        body: { action: "discover_sources", organization_id: orgId, topic },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Fontes Oficiais Descobertas",
        description: `${data.candidates_found} candidatos encontrados para "${data.topic}".`,
      });
      refetchAll();
    },
    onError: (err: any) => {
      toast({ title: "Erro na Descoberta", description: err.message, variant: "destructive" });
    },
  });

  // Discover repos
  const discoverRepos = useMutation({
    mutationFn: async (topic: string) => {
      const { data, error } = await supabase.functions.invoke("source-discovery-agent", {
        body: { action: "discover_repos", organization_id: orgId, topic },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Repositórios Oficiais Descobertos",
        description: `${data.candidates_found} repos encontrados para "${data.topic}".`,
      });
      refetchAll();
    },
    onError: (err: any) => {
      toast({ title: "Erro na Descoberta", description: err.message, variant: "destructive" });
    },
  });

  // Approve candidate
  const approveCandidate = useMutation({
    mutationFn: async (candidateId: string) => {
      const { data, error } = await supabase.functions.invoke("source-discovery-agent", {
        body: { action: "approve_candidate", organization_id: orgId, candidate_id: candidateId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Fonte Aprovada", description: "Candidato promovido para fontes canônicas." });
      refetchAll();
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  // Reject candidate
  const rejectCandidate = useMutation({
    mutationFn: async ({ candidateId, reason }: { candidateId: string; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke("source-discovery-agent", {
        body: {
          action: "reject_candidate",
          organization_id: orgId,
          candidate_id: candidateId,
          rejection_reason: reason,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Candidato Rejeitado" });
      refetchAll();
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  // Derived stats
  const pendingCandidates = candidates.filter((c) => c.review_status === "pending");
  const approvedCandidates = candidates.filter((c) => c.review_status === "approved");
  const rejectedCandidates = candidates.filter((c) => c.review_status === "rejected");
  const highTrustPending = pendingCandidates.filter((c) => c.composite_trust_score >= 0.7);

  return {
    candidates,
    runs,
    loadingCandidates,
    pendingCandidates,
    approvedCandidates,
    rejectedCandidates,
    highTrustPending,
    discoverSources,
    discoverRepos,
    approveCandidate,
    rejectCandidate,
    refetchAll,
  };
}
