import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { usePipeline } from "@/contexts/PipelineContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError } from "@/lib/error-utils";
import { InitiativeList } from "@/components/initiatives/InitiativeList";
import { InitiativeDetail } from "@/components/initiatives/InitiativeDetail";
import { InitiativeWizard } from "@/components/initiatives/wizard/InitiativeWizard";
import type { InitiativeBrief } from "@/components/initiatives/wizard/types";
import { SLABreachAlerts } from "@/components/governance/SLABreachAlerts";
import { useSLABreaches } from "@/hooks/useStageSLA";
import { useI18n } from "@/contexts/I18nContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, Download } from "lucide-react";
import { PageGuidanceShell } from "@/components/guidance";
import { exportToCSV } from "@/lib/export-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToPDF } from "@/lib/export-utils";

export default function Initiatives() {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { runStage, rollbackToStage, getRunningStage } = usePipeline();
  const { t, locale } = useI18n();

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
    mutationFn: async (brief: InitiativeBrief) => {
      if (!currentOrg || !user) throw new Error("Sem organização");
      const enrichedDesc = [
        brief.description,
        brief.problem_statement && `Problem: ${brief.problem_statement}`,
        brief.target_audience && `Audience: ${brief.target_audience}`,
        brief.core_features.length > 0 && `Features: ${brief.core_features.join(", ")}`,
        brief.integrations.length > 0 && `Integrations: ${brief.integrations.join(", ")}`,
      ].filter(Boolean).join("\n");

      const simReport = brief._simulation_report as Record<string, unknown> | undefined;
      const insertData: Record<string, unknown> = {
        title: brief.name,
        description: enrichedDesc,
        idea_raw: brief.description,
        organization_id: currentOrg.id,
        user_id: user.id,
        stage_status: "draft",
        status: "idea",
        complexity: brief.core_features.length + brief.integrations.length <= 3 ? "low" : brief.core_features.length + brief.integrations.length <= 6 ? "medium" : "high",
        target_user: brief.target_audience || null,
        initiative_brief: brief._initiative_brief || null,
        blueprint: brief._blueprint || null,
        generation_depth: brief._initiative_brief?.generation_depth || null,
        simulation_report: simReport || null,
        pipeline_recommendation: (simReport?.pipeline_recommendation as string) || null,
        risk_flags: (simReport?.risk_flags as unknown) || null,
        estimated_cost_min: (simReport?.estimated_cost_range as any)?.min_usd || null,
        estimated_cost_max: (simReport?.estimated_cost_range as any)?.max_usd || null,
        estimated_time_min: (simReport?.estimated_time_minutes as any)?.min || null,
        estimated_time_max: (simReport?.estimated_time_minutes as any)?.max || null,
        recommended_generation_depth: (simReport?.recommended_generation_depth as string) || null,
        discovery_payload: {
          product_type: brief.product_type,
          core_features: brief.core_features,
          integrations: brief.integrations,
          generation_depth: brief.generation_depth,
          technical_preferences: brief.technical_preferences,
          deployment_target: brief.deployment_target,
        },
      };
      const { data, error } = await supabase
        .from("initiatives")
        .insert(insertData as any)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
      setSelectedId(data.id);
      toast({ title: t("initiatives.created") });
    },
    onError: (e: any) => toast({ variant: "destructive", title: t("common.error"), description: getUserFriendlyError(e) }),
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
      toast({ title: t("initiatives.deleted"), description: t("initiatives.deletedDesc") });
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
    } catch (e: any) {
      toast({ variant: "destructive", title: t("initiatives.deleteError"), description: getUserFriendlyError(e) });
    }
  };

  const handleExportCSV = () => {
    const rows = initiatives.map((i: any) => ({
      title: i.title,
      status: i.status,
      stage: i.stage_status,
      complexity: i.complexity || "",
      risk: i.risk_level || "",
      created: i.created_at,
    }));
    exportToCSV(rows, "initiatives");
  };

  const handleExportPDF = () => {
    const rows = initiatives.map((i: any) => ({
      title: i.title,
      status: i.status,
      stage: i.stage_status,
      complexity: i.complexity || "",
      risk: i.risk_level || "",
      created: new Date(i.created_at).toLocaleDateString(),
    }));
    exportToPDF(t("initiatives.title"), rows, "initiatives");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{t("initiatives.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("initiatives.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            {initiatives.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    {t("common.export")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleExportCSV}>{t("common.exportCSV")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>{t("common.exportPDF")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <InitiativeWizard
              onSubmit={(brief) => createMutation.mutate(brief)}
              isPending={createMutation.isPending}
            />
          </div>
        </div>

        {/* Contextual Guidance */}
        <PageGuidanceShell pageKey="initiatives" />

        {breaches.length > 0 && (
          <SLABreachAlerts breaches={breaches} onNavigate={(id) => setSelectedId(id)} />
        )}

        {selected ? (
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
              onClick={() => setSelectedId(null)}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {locale === "en-US" ? "All initiatives" : "Todas iniciativas"}
            </Button>
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
          </div>
        ) : (
          <InitiativeList
            initiatives={initiatives}
            isLoading={isLoading}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}
      </div>
    </AppLayout>
  );
}
