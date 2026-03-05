import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, BookOpen, Lightbulb, Code2, Shield, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MEMORY_TYPE_CONFIG: Record<string, { label: string; icon: typeof Brain; color: string }> = {
  lesson_learned: { label: "Lição", icon: Lightbulb, color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  pattern: { label: "Padrão", icon: Code2, color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  architectural_decision: { label: "ADR", icon: Shield, color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  best_practice: { label: "Best Practice", icon: BookOpen, color: "bg-green-500/15 text-green-400 border-green-500/30" },
};

interface AgentMemory {
  id: string;
  key: string;
  value: string;
  memory_type: string;
  scope: string;
  relevance_score: number;
  times_used: number;
  created_at: string;
  initiative_id: string | null;
}

interface KBEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
  source_initiative_id: string | null;
}

export function AgentMemoryPanel() {
  const { currentOrg } = useOrg();

  const { data: memories = [], isLoading: memLoading } = useQuery({
    queryKey: ["agent-memories", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("agent_memory")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as AgentMemory[];
    },
    enabled: !!currentOrg,
  });

  const { data: kbEntries = [], isLoading: kbLoading } = useQuery({
    queryKey: ["org-knowledge-base", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("org_knowledge_base")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as KBEntry[];
    },
    enabled: !!currentOrg,
  });

  const isLoading = memLoading || kbLoading;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="memories" className="w-full">
        <TabsList>
          <TabsTrigger value="memories" className="gap-1.5">
            <Brain className="h-4 w-4" /> Memória dos Agentes
            {memories.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{memories.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-1.5">
            <BookOpen className="h-4 w-4" /> Base de Conhecimento
            {kbEntries.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{kbEntries.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="memories" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : memories.length === 0 ? (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Brain className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <h3 className="font-semibold text-lg">Nenhuma memória ainda</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Os agentes aprenderão automaticamente conforme executam iniciativas. Lições, padrões e decisões serão armazenados aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {memories.map((mem) => {
                const config = MEMORY_TYPE_CONFIG[mem.memory_type] || MEMORY_TYPE_CONFIG.lesson_learned;
                const Icon = config.icon;
                return (
                  <Card key={mem.id} className="border-border/50 bg-card/80">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <CardTitle className="text-sm font-medium truncate">{mem.key}</CardTitle>
                        </div>
                        <Badge variant="outline" className={`shrink-0 text-[10px] ${config.color}`}>
                          {config.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground line-clamp-3">{mem.value}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground/70">
                        <span>Relevância: {Math.round((mem.relevance_score || 0) * 100)}%</span>
                        <span>•</span>
                        <span>Usado {mem.times_used}x</span>
                        <span>•</span>
                        <span>{mem.scope}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="knowledge" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : kbEntries.length === 0 ? (
            <Card className="border-dashed border-2 border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <h3 className="font-semibold text-lg">Base de conhecimento vazia</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  Decisões arquiteturais (ADRs) serão salvas aqui automaticamente após cada execução para guiar projetos futuros.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {kbEntries.map((entry) => (
                <Card key={entry.id} className="border-border/50 bg-card/80">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-medium">{entry.title}</CardTitle>
                      <div className="flex gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[10px] bg-purple-500/15 text-purple-400 border-purple-500/30">
                          {entry.category === "architectural_decision" ? "ADR" : entry.category}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{entry.content}</p>
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] h-4 px-1.5">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
