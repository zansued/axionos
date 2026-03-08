import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function fetchTenantArchAction(action: string) {
  const { data, error } = await supabase.functions.invoke("tenant-architecture-modes", {
    body: { action },
  });
  if (error) throw error;
  return data;
}

export function useTenantArchitectureModes() {
  const overview = useQuery({
    queryKey: ["tenant-architecture-modes", "overview"],
    queryFn: () => fetchTenantArchAction("overview"),
    refetchInterval: 30000,
  });

  const health = useQuery({
    queryKey: ["tenant-architecture-modes", "health"],
    queryFn: () => fetchTenantArchAction("health"),
    refetchInterval: 30000,
  });

  return { overview, health };
}
