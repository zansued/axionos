import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function useAdoptionIntelligence() {
  const { currentOrg } = useOrg();

  const overview = useQuery({
    queryKey: ["adoption-intelligence-overview", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("adoption-intelligence-customer-success-engine", {
        body: { action: "overview", organization_id: currentOrg!.id },
      });
      return data?.overview ?? [];
    },
  });

  const explain = async (initiativeId: string) => {
    const { data } = await supabase.functions.invoke("adoption-intelligence-customer-success-engine", {
      body: { action: "explain", organization_id: currentOrg!.id, initiative_id: initiativeId },
    });
    return data?.explanation;
  };

  return { overview, explain };
}
