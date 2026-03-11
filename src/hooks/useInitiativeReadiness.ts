/**
 * useInitiativeReadiness — Phase 4
 *
 * Fetches initiative data and related counts,
 * then evaluates readiness via the Readiness Engine.
 *
 * Returns a fully traceable ReadinessResult.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  evaluateInitiativeReadiness,
  type ReadinessResult,
  type InitiativeReadinessInput,
} from "@/lib/readiness";

interface InitiativeRow {
  id: string;
  title: string;
  stage_status: string;
  description?: string | null;
  idea_raw?: string | null;
  discovery_payload?: any;
  architecture_content?: string | null;
  blueprint?: any;
  prd_content?: string | null;
  approved_at_discovery?: string | null;
  approved_at_planning?: string | null;
  approved_at_squad?: string | null;
  repo_url?: string | null;
  deploy_url?: string | null;
  deploy_target?: string | null;
  deploy_status?: string | null;
  build_status?: string | null;
  commit_hash?: string | null;
  simulation_report?: any;
  execution_progress?: any;
  risk_level?: string | null;
  health_status?: string | null;
}

export function useInitiativeReadiness(initiative: InitiativeRow | null | undefined) {
  const initId = initiative?.id;

  // Fetch related counts in one parallel batch
  const { data: counts } = useQuery({
    queryKey: ["initiative-readiness-counts", initId],
    queryFn: async () => {
      if (!initId) return null;

      const [storiesRes, agentsRes, artifactsRes, approvedRes, jobsRes] = await Promise.all([
        supabase.from("stories").select("id", { count: "exact", head: true }).eq("initiative_id", initId),
        supabase.from("agents").select("id", { count: "exact", head: true }),
        supabase.from("agent_outputs").select("id", { count: "exact", head: true }).eq("initiative_id", initId),
        supabase.from("agent_outputs").select("id", { count: "exact", head: true }).eq("initiative_id", initId).in("status", ["approved", "deployed"]),
        supabase.from("initiative_jobs").select("id, status").eq("initiative_id", initId),
      ]);

      const jobs = jobsRes.data || [];

      return {
        storiesCount: storiesRes.count ?? 0,
        agentsCount: agentsRes.count ?? 0,
        artifactsCount: artifactsRes.count ?? 0,
        approvedArtifacts: approvedRes.count ?? 0,
        jobsSuccessCount: jobs.filter((j) => j.status === "success").length,
        jobsFailedCount: jobs.filter((j) => j.status === "failed").length,
      };
    },
    enabled: !!initId,
    staleTime: 10_000,
  });

  const result = useMemo<ReadinessResult | null>(() => {
    if (!initiative) return null;

    const input: InitiativeReadinessInput = {
      id: initiative.id,
      title: initiative.title,
      stage_status: initiative.stage_status,
      description: initiative.description,
      idea_raw: initiative.idea_raw,
      discovery_payload: initiative.discovery_payload,
      architecture_content: initiative.architecture_content,
      blueprint: initiative.blueprint,
      prd_content: initiative.prd_content,
      approved_at_discovery: initiative.approved_at_discovery,
      approved_at_planning: initiative.approved_at_planning,
      approved_at_squad: initiative.approved_at_squad,
      repo_url: initiative.repo_url,
      deploy_url: initiative.deploy_url,
      deploy_target: initiative.deploy_target,
      deploy_status: initiative.deploy_status,
      build_status: initiative.build_status,
      commit_hash: initiative.commit_hash,
      simulation_report: initiative.simulation_report,
      execution_progress: initiative.execution_progress,
      risk_level: initiative.risk_level,
      health_status: initiative.health_status,
      ...counts,
    };

    return evaluateInitiativeReadiness(input);
  }, [initiative, counts]);

  return result;
}
