import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Auto-bootstraps observability data if all core tables are empty.
 * Runs once per session, silently in the background.
 */
export function useObservabilityBootstrap() {
  const { currentOrg } = useOrg();
  const triggered = useRef(false);
  const [status, setStatus] = useState<"idle" | "checking" | "bootstrapping" | "done" | "error">("idle");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentOrg?.id || triggered.current) return;

    const run = async () => {
      setStatus("checking");
      try {
        // Check if any of the core observability tables have data
        const { count } = await supabase
          .from("error_patterns")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", currentOrg.id);

        if ((count || 0) > 0) {
          setStatus("done");
          return;
        }

        // Tables are empty — trigger bootstrap
        triggered.current = true;
        setStatus("bootstrapping");

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setStatus("error");
          return;
        }

        const { error } = await supabase.functions.invoke("observability-bootstrap", {
          body: { organization_id: currentOrg.id },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (error) {
          console.error("Observability bootstrap error:", error);
          setStatus("error");
          return;
        }

        // Invalidate all observability queries so tabs refresh
        queryClient.invalidateQueries({ queryKey: ["error-patterns"] });
        queryClient.invalidateQueries({ queryKey: ["prevention-rules"] });
        queryClient.invalidateQueries({ queryKey: ["prevention-events"] });
        queryClient.invalidateQueries({ queryKey: ["predictive-risk-assessments"] });
        queryClient.invalidateQueries({ queryKey: ["predictive-preventive-actions"] });
        queryClient.invalidateQueries({ queryKey: ["repair-overview"] });
        queryClient.invalidateQueries({ queryKey: ["repair-profiles"] });
        queryClient.invalidateQueries({ queryKey: ["repair-decisions"] });
        queryClient.invalidateQueries({ queryKey: ["repair-adjustments"] });
        queryClient.invalidateQueries({ queryKey: ["cross-stage"] });
        queryClient.invalidateQueries({ queryKey: ["execution-policy"] });

        setStatus("done");
      } catch (err) {
        console.error("Bootstrap check failed:", err);
        setStatus("error");
      }
    };

    run();
  }, [currentOrg?.id, queryClient]);

  return { status };
}
