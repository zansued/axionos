import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

async function invokeEngine(orgId: string, action: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.functions.invoke("ecosystem-simulation-sandbox-engine", {
    body: { action, organization_id: orgId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data?.data;
}

export function useEcosystemSimulationSandbox() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({
    queryKey: ["eco-sandbox-overview", orgId],
    queryFn: () => invokeEngine(orgId!, "overview"),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const scenarios = useQuery({
    queryKey: ["eco-sandbox-scenarios", orgId],
    queryFn: () => invokeEngine(orgId!, "build_scenarios"),
    enabled: !!orgId,
  });

  const runs = useQuery({
    queryKey: ["eco-sandbox-runs", orgId],
    queryFn: () => invokeEngine(orgId!, "run_simulations"),
    enabled: !!orgId,
  });

  const policyConflicts = useQuery({
    queryKey: ["eco-sandbox-conflicts", orgId],
    queryFn: () => invokeEngine(orgId!, "simulate_policy_conflicts"),
    enabled: !!orgId,
  });

  const blastRadius = useQuery({
    queryKey: ["eco-sandbox-blast", orgId],
    queryFn: () => invokeEngine(orgId!, "estimate_blast_radius"),
    enabled: !!orgId,
  });

  const outcomes = useQuery({
    queryKey: ["eco-sandbox-outcomes", orgId],
    queryFn: () => invokeEngine(orgId!, "simulation_outcomes"),
    enabled: !!orgId,
  });

  return { overview, scenarios, runs, policyConflicts, blastRadius, outcomes };
}
