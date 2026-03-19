import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle, CheckCircle2, XCircle, Edit3, Eye, Search,
  Loader2, FileCode, ChevronDown, ChevronUp, RotateCcw,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ArtifactReviewPanelProps {
  initiativeId: string;
}

export function ArtifactReviewPanel({ initiativeId }: ArtifactReviewPanelProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [expanded, setExpanded] = useState(true);

  // Fetch escalated artifacts
  const { data: artifacts, isLoading } = useQuery({
    queryKey: ["escalated-artifacts", initiativeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_outputs")
        .select("id, type, summary, raw_output, status, subtask_id, tokens_used, model_used, cost_estimate, created_at, updated_at")
        .eq("initiative_id", initiativeId)
        .in("status", ["pending_review", "rejected"]);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000,
  });

  // Fetch review history
  const { data: reviews } = useQuery({
    queryKey: ["artifact-reviews", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artifact_reviews")
        .select("*")
        .eq("output_id", selectedId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content?: string }) => {
      const updates: any = { status: "approved", updated_at: new Date().toISOString() };
      if (content) {
        updates.raw_output = { text: content, content };
      }
      const { error } = await supabase.from("agent_outputs").update(updates).eq("id", id);
      if (error) throw error;

      // Record review
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("artifact_reviews").insert({
        output_id: id,
        reviewer_id: user?.id || "system",
        action: "human_approved",
        previous_status: "pending_review",
        new_status: "approved",
        comment: reviewNotes || "Aprovado via revisão humana",
      });
    },
    onSuccess: () => {
      toast({ title: "✅ Artefato aprovado" });
      qc.invalidateQueries({ queryKey: ["escalated-artifacts", initiativeId] });
      setSelectedId(null);
      setIsEditing(false);
      setReviewNotes("");
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agent_outputs")
        .update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("artifact_reviews").insert({
        output_id: id,
        reviewer_id: user?.id || "system",
        action: "human_rejected",
        previous_status: "pending_review",
        new_status: "rejected",
        comment: reviewNotes || "Rejeitado via revisão humana",
      });
    },
    onSuccess: () => {
      toast({ title: "Artefato rejeitado" });
      qc.invalidateQueries({ queryKey: ["escalated-artifacts", initiativeId] });
      setSelectedId(null);
      setReviewNotes("");
    },
  });

  // Retry with web search
  const retryWithSearchMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("artifact-web-fix", {
        body: { artifact_id: id, initiative_id: initiativeId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "🔍 Correção com pesquisa web aplicada", description: data?.message || "Artefato re-processado" });
      qc.invalidateQueries({ queryKey: ["escalated-artifacts", initiativeId] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const escalatedCount = artifacts?.length || 0;

  if (escalatedCount === 0 && !isLoading) return null;

  const selected = artifacts?.find((a: any) => a.id === selectedId);
  const selectedContent = selected ? extractText(selected.raw_output) : "";

  function extractText(raw: any): string {
    if (typeof raw === "string") return raw;
    if (typeof raw === "object") return raw?.text || raw?.content || JSON.stringify(raw, null, 2);
    return String(raw);
  }

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card className="border-warning/30 bg-warning/5">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Revisão Humana de Artefatos
                <Badge variant="outline" className="text-warning border-warning/40">
                  {escalatedCount} pendente{escalatedCount > 1 ? "s" : ""}
                </Badge>
              </CardTitle>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando artefatos...
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* List */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Artefatos Escalados
                  </p>
                  <ScrollArea className="h-[300px]">
                    {artifacts?.map((a: any) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          setSelectedId(a.id);
                          setEditContent(extractText(a.raw_output));
                          setIsEditing(false);
                        }}
                        className={`w-full text-left p-2 rounded-md text-xs mb-1 transition-colors ${
                          selectedId === a.id
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted/50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <FileCode className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate font-medium">{a.summary || a.id.slice(0, 8)}</span>
                        </div>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-[9px] px-1">
                            {a.type}
                          </Badge>
                          <Badge variant="outline" className={`text-[9px] px-1 ${
                            a.status === "pending_review" ? "text-warning border-warning/30" : "text-destructive border-destructive/30"
                          }`}>
                            {a.status === "pending_review" ? "pendente" : "rejeitado"}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </ScrollArea>
                </div>

                {/* Content + Actions */}
                <div className="lg:col-span-2">
                  {selected ? (
                    <Tabs defaultValue="content">
                      <TabsList className="h-7">
                        <TabsTrigger value="content" className="text-[10px] gap-1">
                          <Eye className="h-3 w-3" /> Conteúdo
                        </TabsTrigger>
                        <TabsTrigger value="history" className="text-[10px] gap-1">
                          <RotateCcw className="h-3 w-3" /> Histórico ({reviews?.length || 0})
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="content" className="mt-2 space-y-2">
                        {isEditing ? (
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="font-mono text-[11px] min-h-[200px] bg-background"
                            placeholder="Edite o artefato aqui..."
                          />
                        ) : (
                          <ScrollArea className="h-[200px] rounded-md border border-border/50 bg-background p-2">
                            <pre className="text-[11px] font-mono whitespace-pre-wrap break-words">
                              {selectedContent.slice(0, 5000)}
                              {selectedContent.length > 5000 && "\n\n... (truncado)"}
                            </pre>
                          </ScrollArea>
                        )}

                        <Textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Notas de revisão (opcional)..."
                          className="text-xs h-16"
                        />

                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1"
                            onClick={() => {
                              setIsEditing(!isEditing);
                              if (!isEditing) setEditContent(selectedContent);
                            }}
                          >
                            <Edit3 className="h-3 w-3" />
                            {isEditing ? "Visualizar" : "Editar"}
                          </Button>

                          <Button
                            size="sm"
                            className="text-xs gap-1 bg-green-600 hover:bg-green-700"
                            onClick={() => approveMutation.mutate({
                              id: selected.id,
                              content: isEditing ? editContent : undefined,
                            })}
                            disabled={approveMutation.isPending}
                          >
                            {approveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            Aprovar
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs gap-1"
                            onClick={() => rejectMutation.mutate(selected.id)}
                            disabled={rejectMutation.isPending}
                          >
                            <XCircle className="h-3 w-3" /> Rejeitar
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1 text-blue-400 border-blue-400/30"
                            onClick={() => retryWithSearchMutation.mutate(selected.id)}
                            disabled={retryWithSearchMutation.isPending}
                          >
                            {retryWithSearchMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                            Corrigir com Pesquisa Web
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="history" className="mt-2">
                        <ScrollArea className="h-[260px]">
                          {reviews?.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma revisão registrada</p>
                          ) : (
                            <div className="space-y-1.5">
                              {reviews?.map((r: any) => (
                                <div key={r.id} className="p-2 border border-border/30 rounded-md text-[11px]">
                                  <div className="flex justify-between items-center">
                                    <Badge variant="outline" className="text-[9px]">{r.action}</Badge>
                                    <span className="text-muted-foreground">
                                      {new Date(r.created_at).toLocaleString("pt-BR")}
                                    </span>
                                  </div>
                                  {r.comment && <p className="mt-1 text-muted-foreground">{r.comment}</p>}
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground text-xs">
                      Selecione um artefato para revisar
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
