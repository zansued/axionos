import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useToast } from "@/hooks/use-toast";

export function useRuntimeFeedbackMesh() {
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const qc = useQueryClient();

  const invoke = async (action: string, extra: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke("runtime-feedback-mesh", {
      body: { action, organizationId: currentOrg?.id, ...extra },
    });
    if (error) throw error;
    return data;
  };

  const EVENTS_KEY = ["runtime-feedback-events", currentOrg?.id];
  const INCIDENTS_KEY = ["runtime-incidents", currentOrg?.id];
  const HEALTH_KEY = ["runtime-health", currentOrg?.id];

  const eventsQuery = useQuery({
    queryKey: EVENTS_KEY,
    queryFn: () => invoke("list_events"),
    enabled: !!currentOrg,
    refetchInterval: 30000,
  });

  const incidentsQuery = useQuery({
    queryKey: INCIDENTS_KEY,
    queryFn: () => invoke("list_incidents"),
    enabled: !!currentOrg,
    refetchInterval: 30000,
  });

  const healthQuery = useQuery({
    queryKey: HEALTH_KEY,
    queryFn: () => invoke("compute_runtime_health"),
    enabled: !!currentOrg,
    refetchInterval: 60000,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: EVENTS_KEY });
    qc.invalidateQueries({ queryKey: INCIDENTS_KEY });
    qc.invalidateQueries({ queryKey: HEALTH_KEY });
  };

  const registerEvent = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("register_runtime_event", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Evento registrado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const linkDeployOutcome = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("link_deploy_outcome", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Deploy outcome vinculado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const classifyIncident = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("classify_incident", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Incidente classificado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const registerRollback = useMutation({
    mutationFn: (params: Record<string, any>) => invoke("register_rollback", params),
    onSuccess: () => { invalidateAll(); toast({ title: "Rollback registrado" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const explainLineage = useMutation({
    mutationFn: (eventId?: string) => invoke("explain_outcome_lineage", { event_id: eventId }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    events: eventsQuery.data?.events || [],
    incidents: incidentsQuery.data?.incidents || [],
    health: healthQuery.data || null,
    loadingEvents: eventsQuery.isLoading,
    loadingIncidents: incidentsQuery.isLoading,
    loadingHealth: healthQuery.isLoading,
    registerEvent,
    linkDeployOutcome,
    classifyIncident,
    registerRollback,
    explainLineage,
  };
}
