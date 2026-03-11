import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function invoke(action: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("red-team-simulation", {
    body: { action, ...params },
  });
  if (error) throw error;
  return data;
}

export function useRedTeamOverview() {
  return useQuery({ queryKey: ["red-team", "overview"], queryFn: () => invoke("overview") });
}

export function useRedTeamExercises() {
  return useQuery({ queryKey: ["red-team", "exercises"], queryFn: () => invoke("list_exercises") });
}

export function useRedTeamScenarios() {
  return useQuery({ queryKey: ["red-team", "scenarios"], queryFn: () => invoke("list_scenarios") });
}

export function useRedTeamRuns() {
  return useQuery({ queryKey: ["red-team", "runs"], queryFn: () => invoke("list_runs") });
}

export function useRedTeamFindings() {
  return useQuery({ queryKey: ["red-team", "findings"], queryFn: () => invoke("list_findings") });
}

export function useRedTeamReviews() {
  return useQuery({ queryKey: ["red-team", "reviews"], queryFn: () => invoke("list_reviews") });
}

export function useRunSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => invoke("run_simulation", params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["red-team"] });
    },
  });
}
