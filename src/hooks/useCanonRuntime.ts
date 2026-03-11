import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";

export function useCanonRuntime() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const sessions = useQuery({
    queryKey: ["canon-retrieval-sessions", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_retrieval_sessions")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const applications = useQuery({
    queryKey: ["canon-runtime-applications", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_runtime_applications")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const feedback = useQuery({
    queryKey: ["canon-retrieval-feedback", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canon_retrieval_feedback")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Compute analytics
  const analytics = {
    totalSessions: sessions.data?.length || 0,
    activeSessions: sessions.data?.filter((s: any) => s.session_status === "active").length || 0,
    completedSessions: sessions.data?.filter((s: any) => s.session_status === "completed").length || 0,
    totalApplications: applications.data?.length || 0,
    totalFeedback: feedback.data?.length || 0,
    avgRetrieved: sessions.data?.length
      ? Math.round(sessions.data.reduce((sum: number, s: any) => sum + (s.entries_retrieved || 0), 0) / sessions.data.length)
      : 0,
    avgApplied: sessions.data?.length
      ? Math.round(sessions.data.reduce((sum: number, s: any) => sum + (s.entries_applied || 0), 0) / sessions.data.length)
      : 0,
  };

  return {
    sessions: sessions.data || [],
    applications: applications.data || [],
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
