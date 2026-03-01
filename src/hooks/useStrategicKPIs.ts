import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export interface StrategicKPIs {
  costPerInitiative: { title: string; cost: number; id: string }[];
  costPerStage: { stage: string; cost: number; count: number }[];
  avgDiscoveryTime: number;
  avgPlanningTime: number;
  avgExecutionTime: number;
  reworkRate: number;
  rejectionRate: number;
  costPerArtifact: number;
  totalInitiatives: number;
  totalJobs: number;
  totalCost: number;
  avgCostPerInitiative: number;
}

export function useStrategicKPIs() {
  const { currentOrg } = useOrg();

  return useQuery<StrategicKPIs>({
    queryKey: ["strategic-kpis", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) throw new Error("No org");

      const [jobsRes, initRes, outputsRes] = await Promise.all([
        supabase
          .from("initiative_jobs")
          .select("id, initiative_id, stage, status, cost_usd, duration_ms, created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("initiatives")
          .select("id, title")
          .eq("organization_id", currentOrg.id),
        supabase
          .from("agent_outputs")
          .select("id, cost_estimate")
          .eq("organization_id", currentOrg.id),
      ]);

      const jobs = jobsRes.data || [];
      const initiatives = initRes.data || [];
      const outputs = outputsRes.data || [];

      const initIds = new Set(initiatives.map(i => i.id));
      const orgJobs = jobs.filter(j => initIds.has(j.initiative_id));

      // Cost per initiative
      const costByInit: Record<string, number> = {};
      orgJobs.forEach(j => {
        costByInit[j.initiative_id] = (costByInit[j.initiative_id] || 0) + (Number(j.cost_usd) || 0);
      });
      const initMap = new Map(initiatives.map(i => [i.id, i.title]));
      const costPerInitiative = Object.entries(costByInit)
        .map(([id, cost]) => ({ id, title: initMap.get(id) || "?", cost }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 10);

      // Cost per stage
      const stageCosts: Record<string, { cost: number; count: number }> = {};
      orgJobs.forEach(j => {
        if (!stageCosts[j.stage]) stageCosts[j.stage] = { cost: 0, count: 0 };
        stageCosts[j.stage].cost += Number(j.cost_usd) || 0;
        stageCosts[j.stage].count += 1;
      });
      const stageOrder = ["discovery", "squad_formation", "planning", "execution", "validation", "publish", "rework", "reject"];
      const costPerStage = stageOrder
        .filter(s => stageCosts[s])
        .map(stage => ({ stage, ...stageCosts[stage] }));

      // Avg duration by stage (ms → minutes)
      const avgDuration = (stage: string) => {
        const stageJobs = orgJobs.filter(j => j.stage === stage && j.status === "success" && j.duration_ms);
        if (stageJobs.length === 0) return 0;
        return stageJobs.reduce((sum, j) => sum + (j.duration_ms || 0), 0) / stageJobs.length / 60000;
      };

      // Rework & rejection rates
      const totalSuccessJobs = orgJobs.filter(j => j.status === "success").length;
      const reworkJobs = orgJobs.filter(j => j.stage === "rework" || j.stage === "reject");
      const reworkRate = totalSuccessJobs > 0 ? (reworkJobs.length / totalSuccessJobs) * 100 : 0;
      const rejectionJobs = orgJobs.filter(j => j.stage === "reject");
      const rejectionRate = totalSuccessJobs > 0 ? (rejectionJobs.length / totalSuccessJobs) * 100 : 0;

      // Cost per artifact
      const totalArtifactCost = outputs.reduce((s, o) => s + (Number(o.cost_estimate) || 0), 0);
      const costPerArtifact = outputs.length > 0 ? totalArtifactCost / outputs.length : 0;

      const totalCost = orgJobs.reduce((s, j) => s + (Number(j.cost_usd) || 0), 0);

      return {
        costPerInitiative,
        costPerStage,
        avgDiscoveryTime: avgDuration("discovery"),
        avgPlanningTime: avgDuration("planning"),
        avgExecutionTime: avgDuration("execution"),
        reworkRate,
        rejectionRate,
        costPerArtifact,
        totalInitiatives: initiatives.length,
        totalJobs: orgJobs.length,
        totalCost,
        avgCostPerInitiative: initiatives.length > 0 ? totalCost / initiatives.length : 0,
      };
    },
    enabled: !!currentOrg,
  });
}
