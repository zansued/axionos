import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

async function fetchRepairData(orgId: string, action: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke("repair-policy-engine", {
    body: { organization_id: orgId, action },
    headers: { Authorization: `Bearer ${session?.access_token}` },
  });
  if (error) throw error;
  return data;
}

export function useRepairOverview() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  return useQuery({
    queryKey: ["repair-overview", orgId],
    enabled: !!orgId,
    queryFn: () => fetchRepairData(orgId!, "overview"),
    staleTime: 30_000,
  });
}

export function useRepairProfiles() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  return useQuery<{ profiles: any[] }>({
    queryKey: ["repair-profiles", orgId],
    enabled: !!orgId,
    queryFn: () => fetchRepairData(orgId!, "profiles"),
    staleTime: 30_000,
  });
}

export function useRepairDecisions() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  return useQuery<{ decisions: any[] }>({
    queryKey: ["repair-decisions", orgId],
    enabled: !!orgId,
    queryFn: () => fetchRepairData(orgId!, "decisions"),
    staleTime: 30_000,
  });
}

export function useRepairAdjustments() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  return useQuery<{ adjustments: any[] }>({
    queryKey: ["repair-adjustments", orgId],
    enabled: !!orgId,
    queryFn: () => fetchRepairData(orgId!, "adjustments"),
    staleTime: 30_000,
  });
}
