import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { startOfMonth, format } from "date-fns";

export interface ProductDashboardKPIs {
  totalInitiatives: number;
  deployedCount: number;
  pipelineSuccessRate: number;
  deploySuccessRate: number;
  repairSuccessRate: number;
  monthlyCost: number;
  tokensUsed: number;
  totalRuns: number;
  totalDeployments: number;
  totalRepairs: number;
}

export function useProductDashboard() {
  const { currentOrg } = useOrg();

  return useQuery<ProductDashboardKPIs>({
    queryKey: ["product-dashboard", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) throw new Error("No org");
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd'T'HH:mm:ss");

      const [initRes, jobsRes, outputsRes, obsRes] = await Promise.all([
        supabase
          .from("initiatives")
          .select("id, stage_status")
          .eq("organization_id", currentOrg.id),
        supabase
          .from("initiative_jobs")
          .select("id, stage, status, cost_usd")
          .gte("created_at", monthStart),
        supabase
          .from("agent_outputs")
          .select("id, tokens_used, cost_estimate")
          .eq("organization_id", currentOrg.id)
          .gte("created_at", monthStart),
        supabase
          .from("initiative_observability")
          .select("pipeline_success_rate, deploy_success_rate, automatic_repair_success_rate")
          .eq("organization_id", currentOrg.id),
      ]);

      const inits = initRes.data ?? [];
      const jobs = jobsRes.data ?? [];
      const outputs = outputsRes.data ?? [];
      const obs = obsRes.data ?? [];

      // Filter jobs to this org's initiatives
      const initIds = new Set(inits.map((i) => i.id));
      const orgJobs = jobs.filter((j: any) => initIds.has(j.initiative_id));

      const completedJobs = orgJobs.filter((j) => j.status === "completed").length;
      const pipelineSuccessRate = orgJobs.length > 0 ? (completedJobs / orgJobs.length) * 100 : 0;

      const avgDeploy = obs.length > 0
        ? obs.reduce((s, o) => s + Number(o.deploy_success_rate), 0) / obs.length
        : 0;
      const avgRepair = obs.length > 0
        ? obs.reduce((s, o) => s + Number(o.automatic_repair_success_rate), 0) / obs.length
        : 0;

      const deployJobs = orgJobs.filter((j) => ["publish", "deploy"].includes(j.stage) && j.status === "completed");
      const repairJobs = orgJobs.filter((j) => ["rework", "build_repair", "self_healing"].includes(j.stage));

      return {
        totalInitiatives: inits.length,
        deployedCount: inits.filter((i) => i.stage_status === "deployed").length,
        pipelineSuccessRate: Math.round(pipelineSuccessRate * 10) / 10,
        deploySuccessRate: Math.round(avgDeploy * 10) / 10,
        repairSuccessRate: Math.round(avgRepair * 10) / 10,
        monthlyCost: orgJobs.reduce((s, j) => s + (Number(j.cost_usd) || 0), 0),
        tokensUsed: outputs.reduce((s, o) => s + (o.tokens_used ?? 0), 0),
        totalRuns: orgJobs.length,
        totalDeployments: deployJobs.length,
        totalRepairs: repairJobs.length,
      };
    },
    enabled: !!currentOrg,
  });
}
