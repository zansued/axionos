import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, format } from "date-fns";

export interface DashboardKPIs {
  storiesDone: number;
  storiesTotal: number;
  pendingReview: number;
  monthlyCost: number;
  approvalRate: number;
  totalReviewed: number;
  topAgents: { name: string; role: string; completed: number }[];
}

export function useDashboardKPIs() {
  return useQuery<DashboardKPIs>({
    queryKey: ["dashboard-kpis"],
    queryFn: async () => {
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd'T'HH:mm:ss");

      // Parallel fetches
      const [storiesRes, outputsRes, agentsRes, subtasksRes] = await Promise.all([
        supabase.from("stories").select("id, status"),
        supabase.from("agent_outputs").select("id, status, cost_estimate, agent_id, created_at"),
        supabase.from("agents").select("id, name, role"),
        supabase.from("story_subtasks").select("id, status, executed_by_agent_id"),
      ]);

      const stories = storiesRes.data || [];
      const outputs = outputsRes.data || [];
      const agents = agentsRes.data || [];
      const subtasks = subtasksRes.data || [];

      // Stories done
      const storiesDone = stories.filter((s) => s.status === "done").length;

      // Pending review
      const pendingReview = outputs.filter((o) => o.status === "pending_review").length;

      // Monthly cost
      const monthlyCost = outputs
        .filter((o) => o.created_at >= monthStart)
        .reduce((sum, o) => sum + (Number(o.cost_estimate) || 0), 0);

      // Approval rate
      const reviewed = outputs.filter((o) =>
        ["approved", "rejected", "deployed"].includes(o.status)
      );
      const approved = reviewed.filter((o) =>
        ["approved", "deployed"].includes(o.status)
      );
      const approvalRate = reviewed.length > 0 ? (approved.length / reviewed.length) * 100 : 0;

      // Top agents by completed subtasks
      const agentCompletedMap: Record<string, number> = {};
      subtasks.forEach((st) => {
        if (st.status === "completed" && st.executed_by_agent_id) {
          agentCompletedMap[st.executed_by_agent_id] = (agentCompletedMap[st.executed_by_agent_id] || 0) + 1;
        }
      });

      const agentMap = new Map(agents.map((a) => [a.id, a]));
      const topAgents = Object.entries(agentCompletedMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([agentId, completed]) => {
          const agent = agentMap.get(agentId);
          return {
            name: agent?.name || "Desconhecido",
            role: agent?.role || "dev",
            completed,
          };
        });

      return {
        storiesDone,
        storiesTotal: stories.length,
        pendingReview,
        monthlyCost,
        approvalRate,
        totalReviewed: reviewed.length,
        topAgents,
      };
    },
  });
}
