import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function invoke(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("blue-team-defense", { body: { action, ...params } });
  if (error) throw error;
  return data;
}

export function useBlueTeamOverview() {
  return useQuery({ queryKey: ["blue-team", "overview"], queryFn: () => invoke("overview") });
}
export function useBlueTeamAlerts() {
  return useQuery({ queryKey: ["blue-team", "alerts"], queryFn: () => invoke("list_alerts") });
}
export function useBlueTeamIncidents() {
  return useQuery({ queryKey: ["blue-team", "incidents"], queryFn: () => invoke("list_incidents") });
}
export function useBlueTeamResponseActions() {
  return useQuery({ queryKey: ["blue-team", "actions"], queryFn: () => invoke("list_response_actions") });
}
export function useBlueTeamContainment() {
  return useQuery({ queryKey: ["blue-team", "containment"], queryFn: () => invoke("list_containment") });
}
export function useBlueTeamRecovery() {
  return useQuery({ queryKey: ["blue-team", "recovery"], queryFn: () => invoke("list_recovery") });
}
export function useBlueTeamRunbooks() {
  return useQuery({ queryKey: ["blue-team", "runbooks"], queryFn: () => invoke("list_runbooks") });
}
export function useAssessIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => invoke("assess_incident", params),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blue-team"] }),
  });
}
