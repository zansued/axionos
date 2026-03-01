import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError } from "@/lib/error-utils";
import { InitiativeList } from "@/components/initiatives/InitiativeList";
import { InitiativeDetail } from "@/components/initiatives/InitiativeDetail";
import { CreateInitiativeDialog } from "@/components/initiatives/CreateInitiativeDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

const PIPELINE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-initiative-pipeline`;

export default function Initiatives() {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runningStage, setRunningStage] = useState<string | null>(null);

  const { data: initiatives = [], isLoading } = useQuery({
    queryKey: ["initiatives", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("initiatives")
        .select("*, squads(id, name, squad_members(id, role_in_squad, agents(name, role)))")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["initiative-jobs", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data, error } = await supabase
        .from("initiative_jobs")
        .select("*")
        .eq("initiative_id", selectedId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: async ({ title, description }: { title: string; description: string }) => {
      if (!currentOrg || !user) throw new Error("Sem organização");
      const { data, error } = await supabase
        .from("initiatives")
        .insert({
          title,
          description: description || null,
          idea_raw: description || title,
          organization_id: currentOrg.id,
          user_id: user.id,
          stage_status: "draft" as any,
          status: "idea",
        })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
      setSelectedId(data.id);
      toast({ title: "Iniciativa criada!" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: getUserFriendlyError(e) }),
  });

  const runStage = useCallback(async (initiativeId: string, stage: string, comment?: string, publishParams?: { github_token: string; owner: string; repo: string; base_branch: string }) => {
    setRunningStage(stage);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Não autenticado");
      const resp = await fetch(PIPELINE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          initiativeId, stage,
          ...(comment ? { comment } : {}),
          ...(publishParams || {}),
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro" }));
        throw new Error(err.error || `Erro ${resp.status}`);
      }
      const result = await resp.json();
      const stageLabels: Record<string, string> = {
        discovery: "Descoberta inteligente concluída ✅",
        squad_formation: `Squad formado com ${result.agents?.length || 0} agentes ✅`,
        planning: `Planning completo: ${result.stories?.length || 0} stories criadas ✅`,
        approve: "Stage aprovado ✅",
        reject: "Ajustes solicitados — pipeline retornou ao estágio anterior ⟲",
        execution: `Execução concluída: ${result.executed || 0} subtasks executadas ✅`,
        validation: result.overall_pass
          ? `Validação aprovada: ${result.passed || 0}/${result.artifacts_validated || 0} artefatos ✅`
          : `Validação: ${result.failed || 0} falhas de ${result.artifacts_validated || 0} artefatos ⚠️`,
        publish: result.pr_url
          ? `PR criado: ${result.files_committed || 0} arquivos commitados ✅`
          : `Publicação concluída: ${result.files_committed || 0} arquivos ✅`,
      };
      toast({ title: stageLabels[stage] || "Concluído!" });
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
      queryClient.invalidateQueries({ queryKey: ["initiative-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["squads"] });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setRunningStage(null);
    }
  }, [toast, queryClient]);

  const selected = initiatives.find((i: any) => i.id === selectedId);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Iniciativas</h1>
            <p className="text-muted-foreground mt-1">Da ideia ao software — pipeline governado com aprovação humana</p>
          </div>
          <CreateInitiativeDialog
            onSubmit={(title, desc) => createMutation.mutate({ title, description: desc })}
            isPending={createMutation.isPending}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
          <InitiativeList
            initiatives={initiatives}
            isLoading={isLoading}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {selected ? (
            <InitiativeDetail
              initiative={selected}
              jobs={jobs}
              runningStage={runningStage}
              onRunStage={(stage, comment, publishParams) => runStage(selected.id, stage, comment, publishParams)}
              onApprove={() => runStage(selected.id, "approve")}
            />
          ) : (
            <Card className="border-dashed border-2 flex items-center justify-center min-h-[400px]">
              <CardContent className="text-center">
                <Lightbulb className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Selecione uma iniciativa para ver o pipeline</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
