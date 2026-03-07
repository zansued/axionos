import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { toast } from "sonner";

export function useSemanticRetrieval() {
  const { currentOrg } = useOrg();
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<any>(null);
  const [domains, setDomains] = useState<any[]>([]);
  const [indices, setIndices] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const callAction = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    if (!currentOrg?.id) return null;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("semantic-retrieval", {
        body: { action, organization_id: currentOrg.id, ...extra },
      });
      if (error) throw error;
      return data;
    } catch (e: any) {
      toast.error(e.message || "Erro na operação");
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentOrg?.id]);

  const fetchOverview = useCallback(async () => {
    const data = await callAction("overview");
    if (data) setOverview(data);
  }, [callAction]);

  const fetchDomains = useCallback(async () => {
    const data = await callAction("domains");
    if (data?.domains) setDomains(data.domains);
  }, [callAction]);

  const fetchIndices = useCallback(async () => {
    const data = await callAction("indices");
    if (data?.indices) setIndices(data.indices);
  }, [callAction]);

  const fetchSessions = useCallback(async () => {
    const data = await callAction("sessions");
    if (data?.sessions) setSessions(data.sessions);
  }, [callAction]);

  const runRetrieval = useCallback(async (params: Record<string, unknown>) => {
    return await callAction("run_retrieval", params);
  }, [callAction]);

  const submitFeedback = useCallback(async (sessionId: string, status: string, reason?: string) => {
    const result = await callAction("review_feedback", {
      retrieval_session_id: sessionId,
      usefulness_status: status,
      feedback_reason: reason ? { note: reason } : null,
    });
    if (result?.success) toast.success("Feedback registrado");
    return result;
  }, [callAction]);

  const rebuildIndex = useCallback(async (indexId: string) => {
    const result = await callAction("rebuild_index", { index_id: indexId });
    if (result?.success) toast.success("Índice reconstruído");
    else toast.error(result?.reason || "Falha ao reconstruir");
    return result;
  }, [callAction]);

  const freezeIndex = useCallback(async (indexId: string) => {
    const result = await callAction("freeze_index", { index_id: indexId });
    if (result?.success) toast.success("Índice congelado");
    else toast.error(result?.reason || "Falha ao congelar");
    return result;
  }, [callAction]);

  return {
    loading,
    overview,
    domains,
    indices,
    sessions,
    fetchOverview,
    fetchDomains,
    fetchIndices,
    fetchSessions,
    runRetrieval,
    submitFeedback,
    rebuildIndex,
    freezeIndex,
  };
}
