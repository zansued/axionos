import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function invoke(orgId: string, action: string, params: Record<string, any> = {}) {
  return supabase.functions.invoke("architecture-migration-execution", {
    body: { action, organization_id: orgId, ...params },
  });
}

export function useArchitectureMigrationExecution() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const keys = ["arch-migrate-overview", "arch-migrate-list", "arch-migrate-outcomes", "arch-migrate-rollbacks"];

  const overview = useQuery({
    queryKey: ["arch-migrate-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => { const { data, error } = await invoke(orgId!, "overview"); if (error) throw error; return data; },
    refetchInterval: 30000,
  });

  const executions = useQuery({
    queryKey: ["arch-migrate-list", orgId],
    enabled: !!orgId,
    queryFn: async () => { const { data, error } = await invoke(orgId!, "executions"); if (error) throw error; return data; },
  });

  const outcomes = useQuery({
    queryKey: ["arch-migrate-outcomes", orgId],
    enabled: !!orgId,
    queryFn: async () => { const { data, error } = await invoke(orgId!, "outcomes"); if (error) throw error; return data; },
  });

  const rollbacks = useQuery({
    queryKey: ["arch-migrate-rollbacks", orgId],
    enabled: !!orgId,
    queryFn: async () => { const { data, error } = await invoke(orgId!, "rollbacks"); if (error) throw error; return data; },
  });

  const invalidateAll = () => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));

  const prepareMigration = useMutation({
    mutationFn: async (p: { plan_id: string; migration_name: string; pilot_id?: string; target_scope?: string; phase_count?: number }) => {
      const { data, error } = await invoke(orgId!, "prepare_migration", p);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Migration prepared"); invalidateAll(); },
    onError: () => toast.error("Failed to prepare migration"),
  });

  const migrationAction = useMutation({
    mutationFn: async (p: { migration_id: string; action: string; [k: string]: any }) => {
      const { action: act, ...rest } = p;
      const { data, error } = await invoke(orgId!, act, rest);
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("Migration action applied"); invalidateAll(); },
    onError: () => toast.error("Failed to apply migration action"),
  });

  return { overview, executions, outcomes, rollbacks, prepareMigration, migrationAction };
}
