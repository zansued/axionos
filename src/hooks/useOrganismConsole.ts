import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOrganismConsole(organizationId: string | null) {
  const overview = useQuery({
    queryKey: ["organism-overview", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("organism-console", {
        body: { action: "organism_overview", organization_id: organizationId },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const metrics = useQuery({
    queryKey: ["organism-metrics", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("organism-console", {
        body: { action: "organism_metrics", organization_id: organizationId },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const activity = useQuery({
    queryKey: ["organism-activity", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("organism-console", {
        body: { action: "organism_activity", organization_id: organizationId },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  return { overview, metrics, activity };
}
