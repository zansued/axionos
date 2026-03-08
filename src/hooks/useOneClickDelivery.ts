import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function useOneClickDelivery() {
  const { currentOrg } = useOrg();

  const overview = useQuery({
    queryKey: ["one-click-delivery-overview", currentOrg?.id],
    enabled: !!currentOrg,
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("one-click-delivery-deploy-assurance-engine", {
        body: { action: "overview", organization_id: currentOrg!.id },
      });
      return data?.overview ?? [];
    },
  });

  const assessReadiness = async (initiativeId: string) => {
    const { data } = await supabase.functions.invoke("one-click-delivery-deploy-assurance-engine", {
      body: { action: "assess_delivery_readiness", organization_id: currentOrg!.id, initiative_id: initiativeId },
    });
    return data;
  };

  const explain = async (initiativeId: string) => {
    const { data } = await supabase.functions.invoke("one-click-delivery-deploy-assurance-engine", {
      body: { action: "explain", organization_id: currentOrg!.id, initiative_id: initiativeId },
    });
    return data?.explanation;
  };

  return { overview, assessReadiness, explain };
}
