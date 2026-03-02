import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { InitiativeCodePreview } from "@/components/initiatives/InitiativeCodePreview";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Code2, Lightbulb } from "lucide-react";

export default function CodeExplorer() {
  const { currentOrg } = useOrg();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: initiatives = [], isLoading } = useQuery({
    queryKey: ["initiatives-with-code", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("initiatives")
        .select("id, title, stage_status")
        .eq("organization_id", currentOrg.id)
        .not("stage_status", "eq", "draft")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  const selected = initiatives.find((i) => i.id === selectedId);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Código Gerado</h1>
            <p className="text-muted-foreground mt-1">Explore os arquivos de código produzidos pelo pipeline</p>
          </div>
          {initiatives.length > 0 && (
            <Select value={selectedId || ""} onValueChange={setSelectedId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Selecione uma iniciativa..." />
              </SelectTrigger>
              <SelectContent>
                {initiatives.map((init) => (
                  <SelectItem key={init.id} value={init.id}>
                    {init.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selected && currentOrg ? (
          <InitiativeCodePreview initiativeId={selected.id} organizationId={currentOrg.id} />
        ) : (
          <Card className="border-dashed border-2 flex items-center justify-center min-h-[400px]">
            <CardContent className="text-center">
              <Code2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {initiatives.length === 0
                  ? "Nenhuma iniciativa com código gerado ainda. Execute o pipeline até o estágio de Execução."
                  : "Selecione uma iniciativa para explorar o código gerado"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
