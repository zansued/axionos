import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Bot } from "lucide-react";

export default function Squads() {
  const { currentOrg } = useOrg();

  const { data: squads = [], isLoading } = useQuery({
    queryKey: ["squads", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("squads")
        .select("*, initiatives(title, status), squad_members(id, role_in_squad, agents(name, role, status))")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Squads</h1>
          <p className="text-muted-foreground mt-1">Equipes de agentes IA formadas automaticamente por iniciativa</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-48" /></Card>)}
          </div>
        ) : squads.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Nenhum squad formado ainda.</p>
              <p className="text-muted-foreground text-sm mt-1">Squads são criados automaticamente ao executar o pipeline de uma Iniciativa.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {squads.map((squad: any) => (
              <Card key={squad.id} className="border-border/50 hover:border-primary/30 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-display">{squad.name}</CardTitle>
                    {squad.auto_generated && (
                      <Badge variant="outline" className="text-[10px]">Auto</Badge>
                    )}
                  </div>
                  {squad.initiatives && (
                    <p className="text-xs text-muted-foreground">
                      Iniciativa: {squad.initiatives.title}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {squad.squad_members?.length || 0} membro(s)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(squad.squad_members || []).map((sm: any) => (
                        <Badge key={sm.id} variant="secondary" className="text-[10px] gap-1">
                          <Bot className="h-3 w-3" />
                          {sm.agents?.name || "?"} · {sm.role_in_squad}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
