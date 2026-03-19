/**
 * useCanonPipeline — Full Canon Pipeline Operations Hook
 * Provides ingestion, promotion, retrieval, and lifecycle management.
 */
import { useCallback, useState } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";
import type { CanonCandidate, CanonEntry, PatternRetrievalQuery } from "@/lib/canon/canon-types";

function invokeIntake(action: string, body: Record<string, unknown>) {
  return supabase.functions.invoke("canon-intake", { body: { action, ...body } });
}

function invokeRetrieval(action: string, body: Record<string, unknown>) {
  return supabase.functions.invoke("canon-retrieval", { body: { action, ...body } });
}

export function useCanonPipeline() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = currentOrg?.id;
  const [promoting, setPromoting] = useState(false);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["canon-library"] });
    qc.invalidateQueries({ queryKey: ["canon-candidates"] });
    qc.invalidateQueries({ queryKey: ["canon-sources"] });
    qc.invalidateQueries({ queryKey: ["canon-sync-runs"] });
    qc.invalidateQueries({ queryKey: ["canon-patterns"] });
    qc.invalidateQueries({ queryKey: ["canon-pipeline-stats"] });
  }, [qc]);

  // ─── Pipeline Stats ───
  const pipelineStats = useQuery({
    queryKey: ["canon-pipeline-stats", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const [sources, candidates, entries, syncRuns] = await Promise.all([
        supabase.from("canon_sources").select("id, ingestion_lifecycle_state, status").eq("organization_id", orgId),
        supabase.from("canon_candidate_entries").select("id, promotion_status, internal_validation_status").eq("organization_id", orgId),
        supabase.from("canon_entries").select("id, lifecycle_status, approval_status, canon_type, confidence_score").eq("organization_id", orgId),
        supabase.from("canon_source_sync_runs").select("id, sync_status, candidates_found, candidates_accepted, candidates_rejected, documents_fetched, chunks_created, candidates_promoted, duplicates_skipped").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50),
      ]);

      const srcData = sources.data || [];
      const candData = candidates.data || [];
      const entryData = entries.data || [];
      const runData = syncRuns.data || [];

      // Lifecycle distribution
      const lifecycleCounts: Record<string, number> = {};
      srcData.forEach((s: any) => {
        const state = s.ingestion_lifecycle_state || "discovered";
        lifecycleCounts[state] = (lifecycleCounts[state] || 0) + 1;
      });

      // Candidate status distribution
      const candidatesByStatus: Record<string, number> = {};
      candData.forEach((c: any) => {
        candidatesByStatus[c.promotion_status || "pending"] = (candidatesByStatus[c.promotion_status || "pending"] || 0) + 1;
      });

      // Entry type distribution
      const entriesByType: Record<string, number> = {};
      entryData.forEach((e: any) => {
        entriesByType[e.canon_type || "pattern"] = (entriesByType[e.canon_type || "pattern"] || 0) + 1;
      });

      // Sync run totals
      const syncTotals = runData.reduce((acc: any, r: any) => ({
        totalRuns: acc.totalRuns + 1,
        totalDocsFetched: acc.totalDocsFetched + (r.documents_fetched || 0),
        totalChunks: acc.totalChunks + (r.chunks_created || 0),
        totalCandidatesFound: acc.totalCandidatesFound + (r.candidates_found || 0),
        totalAccepted: acc.totalAccepted + (r.candidates_accepted || 0),
        totalRejected: acc.totalRejected + (r.candidates_rejected || 0),
        totalPromoted: acc.totalPromoted + (r.candidates_promoted || 0),
        totalDuplicatesSkipped: acc.totalDuplicatesSkipped + (r.duplicates_skipped || 0),
      }), { totalRuns: 0, totalDocsFetched: 0, totalChunks: 0, totalCandidatesFound: 0, totalAccepted: 0, totalRejected: 0, totalPromoted: 0, totalDuplicatesSkipped: 0 });

      return {
        totalSources: srcData.length,
        activeSources: srcData.filter((s: any) => s.status === "active").length,
        lifecycleCounts,
        totalCandidates: candData.length,
        pendingCandidates: candData.filter((c: any) => c.internal_validation_status === "pending" && c.promotion_status === "pending").length,
        needsHumanReview: candData.filter((c: any) => c.internal_validation_status === "needs_human_review" || c.internal_validation_status === "needs_review").length,
        approvedCandidates: candData.filter((c: any) => c.internal_validation_status === "approved" && c.promotion_status === "pending").length,
        promotedCandidates: candData.filter((c: any) => c.promotion_status === "promoted").length,
        candidatesByStatus,
        totalCanonEntries: entryData.length,
        activeEntries: entryData.filter((e: any) => e.lifecycle_status === "active" || e.lifecycle_status === "approved").length,
        entriesByType,
        syncTotals,
        deprecatedEntries: entryData.filter((e: any) => e.lifecycle_status === "deprecated").length,
        retrievablePatterns: entryData.filter((e: any) =>
          (e.lifecycle_status === "active" || e.lifecycle_status === "approved") &&
          e.approval_status === "approved" &&
          (e.confidence_score ?? 0) >= 0.5
        ).length,
      };
    },
    enabled: !!orgId,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // ─── Promote Candidate to Canon Entry ───
  const promoteCandidateToCanon = useCallback(async (candidateId: string) => {
    if (!orgId) return;
    setPromoting(true);
    try {
      const { data, error } = await invokeIntake("promote_to_canon", {
        organization_id: orgId,
        payload: { candidate_id: candidateId, approved_by: "system" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Promoted to Canon", description: `Entry "${data?.entry?.title}" created successfully.` });
      invalidate();
      return data;
    } catch (e: any) {
      toast({ title: "Promotion Failed", description: e.message, variant: "destructive" });
    } finally {
      setPromoting(false);
    }
  }, [orgId, toast, invalidate]);

  // ─── Batch Promote All Approved Candidates ───
  const batchPromoteApproved = useCallback(async () => {
    if (!orgId) return;
    setPromoting(true);
    try {
      const { data, error } = await invokeIntake("batch_promote", {
        organization_id: orgId,
        payload: {},
      });
      if (error) throw error;
      toast({ title: "Batch Promotion Complete", description: `${data?.promoted || 0} candidates promoted to Canon.` });
      invalidate();
      return data;
    } catch (e: any) {
      toast({ title: "Batch Promotion Failed", description: e.message, variant: "destructive" });
    } finally {
      setPromoting(false);
    }
  }, [orgId, toast, invalidate]);

  // ─── Retrieve Patterns (for AgentOS integration) ───
  const retrievePatterns = useCallback(async (query: Partial<PatternRetrievalQuery>) => {
    if (!orgId) return null;
    const { data, error } = await invokeRetrieval("retrieve_patterns", {
      organization_id: orgId,
      ...query,
    });
    if (error) throw error;
    return data;
  }, [orgId]);

  return {
    stats: pipelineStats.data,
    statsLoading: pipelineStats.isLoading,
    promoting,
    promoteCandidateToCanon,
    batchPromoteApproved,
    retrievePatterns,
    invalidate,
  };
}
