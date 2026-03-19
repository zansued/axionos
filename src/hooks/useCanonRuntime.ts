import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

function isMissingRelationError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || "");
  const text = `${error.message || ""} ${error.details || ""}`.toLowerCase();
  return code === "PGRST205" || text.includes("does not exist") || text.includes("could not find the table");
}

export function useCanonRuntime() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const sessions = useQuery({
    queryKey: ["canon-retrieval-sessions", orgId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("semantic_retrieval_sessions" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50) as any);

      if (error && !isMissingRelationError(error)) throw error;
      return (data || []) as any[];
    },
    enabled: !!orgId,
  });

  const applications = useQuery({
    queryKey: ["canon-runtime-applications", orgId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("canon_pattern_applications" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!orgId,
  });

  const feedback = useQuery({
    queryKey: ["canon-retrieval-feedback", orgId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("canon_retrieval_feedback" as any)
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50) as any);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!orgId,
  });

  const sessionData = sessions.data || [];
  const appData = applications.data || [];

  const analytics = {
    totalSessions: sessionData.length,
    activeSessions: sessionData.filter((s: any) => s.session_status === "active").length,
    completedSessions: sessionData.filter((s: any) => s.session_status === "completed").length,
    totalApplications: appData.length,
    totalFeedback: (feedback.data || []).length,
    avgRetrieved: sessionData.length
      ? Math.round(sessionData.reduce((sum: number, s: any) => sum + (s.entries_retrieved || 0), 0) / sessionData.length)
      : 0,
    avgApplied: sessionData.length
      ? Math.round(sessionData.reduce((sum: number, s: any) => sum + (s.entries_applied || 0), 0) / sessionData.length)
      : 0,
  };

  return {
    sessions: sessionData,
    applications: appData,
    feedback: feedback.data || [],
    analytics,
    loading: sessions.isLoading,
    refetch: () => {
      sessions.refetch();
      applications.refetch();
      feedback.refetch();
    },
  };
}
