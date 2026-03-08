import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

async function invoke(action: string, organization_id: string, extra: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke("change-advisory-orchestrator", {
    body: { action, organization_id, ...extra },
  });
  if (error) throw error;
  return data;
}

export function useChangeAdvisoryOrchestrator() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({
    queryKey: ["change-advisory-overview", orgId],
    queryFn: () => invoke("overview", orgId!),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const signals = useQuery({
    queryKey: ["change-advisory-signals", orgId],
    queryFn: () => invoke("signals", orgId!),
    enabled: !!orgId,
  });

  const agendas = useQuery({
    queryKey: ["change-advisory-agendas", orgId],
    queryFn: () => invoke("agendas", orgId!),
    enabled: !!orgId,
  });

  const reviews = useQuery({
    queryKey: ["change-advisory-reviews", orgId],
    queryFn: () => invoke("reviews", orgId!),
    enabled: !!orgId,
  });

  const health = useQuery({
    queryKey: ["change-advisory-health", orgId],
    queryFn: () => invoke("health", orgId!),
    enabled: !!orgId,
  });

  return { overview, signals, agendas, reviews, health };
}
