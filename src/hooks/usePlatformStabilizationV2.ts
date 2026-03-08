import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

async function invoke(action: string, organization_id: string, extra: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke("platform-stabilization-v2", {
    body: { action, organization_id, ...extra },
  });
  if (error) throw error;
  return data;
}

export function usePlatformStabilizationV2() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const overview = useQuery({
    queryKey: ["stability-v2-overview", orgId],
    queryFn: () => invoke("overview", orgId!),
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const signals = useQuery({
    queryKey: ["stability-v2-signals", orgId],
    queryFn: () => invoke("signals", orgId!),
    enabled: !!orgId,
  });

  const envelopes = useQuery({
    queryKey: ["stability-v2-envelopes", orgId],
    queryFn: () => invoke("envelopes", orgId!),
    enabled: !!orgId,
  });

  const outcomes = useQuery({
    queryKey: ["stability-v2-outcomes", orgId],
    queryFn: () => invoke("outcomes", orgId!),
    enabled: !!orgId,
  });

  const health = useQuery({
    queryKey: ["stability-v2-health", orgId],
    queryFn: () => invoke("health", orgId!),
    enabled: !!orgId,
  });

  return { overview, signals, envelopes, outcomes, health };
}
