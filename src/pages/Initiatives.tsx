import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { usePipeline } from "@/contexts/PipelineContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError } from "@/lib/error-utils";
import { InitiativeList } from "@/components/initiatives/InitiativeList";
import { InitiativeDetail } from "@/components/initiatives/InitiativeDetail";
import { CreateInitiativeDialog } from "@/components/initiatives/CreateInitiativeDialog";
import { SLABreachAlerts } from "@/components/governance/SLABreachAlerts";
import { useSLABreaches } from "@/hooks/useStageSLA";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

export default function Initiatives() {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { runStage, rollbackToStage, getRunningStage } = usePipeline();

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

  const { data: initiativeStories = [] } = useQuery({
    queryKey: ["initiative-stories", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data, error } = await supabase
        .from("stories")
        .select("*, story_phases(*, story_subtasks(*))")
        .eq("initiative_id", selectedId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: async ({ title, description, referenceUrl }: { title: string; description: string; referenceUrl?: string }) => {
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
          reference_url: referenceUrl || null,
        } as any)
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

  const { data: gitConnections = [] } = useQuery({
    queryKey: ["git-connections", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("git_connections")
        .select("*, github_token")
        .eq("organization_id", currentOrg.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  const selected = initiatives.find((i: any) => i.id === selectedId);
  const runningStage = selectedId ? getRunningStage(selectedId) : null;
  const { breaches } = useSLABreaches(initiatives);

  const handleDeleteInitiative = async (id: string) => {
    try {
      const { error } = await supabase.rpc("delete_initiative_cascade", { p_initiative_id: id });
      if (error) throw error;
      toast({ title: "Iniciativa excluída", description: "Todos os dados associados foram removidos." });
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: getUserFriendlyError(e) });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Iniciativas</h1>
            <p className="text-muted-foreground mt-1">Da ideia ao software — pipeline governado com aprovação humana</p>
          </div>
          <CreateInitiativeDialog
            onSubmit={(title, desc, referenceUrl) => createMutation.mutate({ title, description: desc, referenceUrl })}
            isPending={createMutation.isPending}
          />
        </div>

        {breaches.length > 0 && (
          <SLABreachAlerts breaches={breaches} onNavigate={(id) => setSelectedId(id)} />
        )}

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
              stories={initiativeStories}
              runningStage={runningStage}
              gitConnections={gitConnections}
              onRunStage={(stage, comment, publishParams) => runStage(selected.id, stage, comment, publishParams)}
              onApprove={() => runStage(selected.id, "approve")}
              onRollbackToStage={(macroKey) => rollbackToStage(selected.id, macroKey)}
              onDelete={() => handleDeleteInitiative(selected.id)}
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
