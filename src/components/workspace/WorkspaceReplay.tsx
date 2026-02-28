import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw, Play, GitCompare, Loader2, Bot, Clock, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyState, getOutputText } from "./WorkspaceShared";

interface ReplayProps {
  outputs: any[];
  agents: any[];
  orgId: string | undefined;
  workspaceId: string | undefined;
}

export function WorkspaceReplay({ outputs, agents, orgId, workspaceId }: ReplayProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);
  const [replayAgentId, setReplayAgentId] = useState<string>("");
  const [replaying, setReplaying] = useState(false);
  const [replayResult, setReplayResult] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);

  const selectedOutput = outputs.find((o: any) => o.id === selectedOutputId);

  const executeReplay = useCallback(async () => {
    if (!selectedOutput) return;
    setReplaying(true);
    setReplayResult(null);

    try {
      const agentId = replayAgentId || selectedOutput.agent_id;
      if (!agentId) throw new Error("Selecione um agente");

      // Re-execute via edge function with same subtask
      if (selectedOutput.subtask_id) {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/execute-subtask`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            subtaskId: selectedOutput.subtask_id,
            agentId,
            organizationId: orgId,
            workspaceId,
          }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "Erro" }));
          throw new Error(err.error);
        }

        const data = await resp.json();
        setReplayResult(data.output || "Sem output");
        setComparing(true);
        toast({ title: "Replay executado com sucesso!" });
        queryClient.invalidateQueries({ queryKey: ["workspace-outputs"] });
      } else {
        throw new Error("Este artefato não tem subtask associada para replay");
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro no replay", description: e.message });
    } finally {
      setReplaying(false);
    }
  }, [selectedOutput, replayAgentId, orgId, workspaceId, toast, queryClient]);

  const completedOutputs = outputs.filter((o: any) => o.subtask_id);

  if (completedOutputs.length === 0) {
    return <EmptyState icon={RefreshCw} text="Nenhum artefato com subtask para replay. Execute subtasks primeiro." />;
  }

  const originalText = selectedOutput ? getOutputText(selectedOutput.raw_output) : "";

  return (
    <div className="space-y-4">
      {/* Replay Controls */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" /> Replay de Execução
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Selecione um job concluído → troque o agente/modelo → compare o resultado
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Select Output */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Job para replay</label>
            <Select value={selectedOutputId || ""} onValueChange={setSelectedOutputId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecionar artefato..." />
              </SelectTrigger>
              <SelectContent>
                {completedOutputs.map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>
                    <div className="flex items-center gap-2">
                      <span className="truncate">{o.summary || "Sem resumo"}</span>
                      <Badge variant="outline" className="text-[9px]">{o.type}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedOutput && (
            <>
              {/* Original Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="bg-muted/20 rounded p-2">
                  <span className="text-muted-foreground">Agente original:</span>
                  <p className="font-medium mt-0.5">{selectedOutput.agents?.name || "N/A"}</p>
                </div>
                <div className="bg-muted/20 rounded p-2">
                  <span className="text-muted-foreground">Modelo:</span>
                  <p className="font-medium mt-0.5">{selectedOutput.model_used || "N/A"}</p>
                </div>
                <div className="bg-muted/20 rounded p-2">
                  <span className="text-muted-foreground">Tokens:</span>
                  <p className="font-medium mt-0.5">{selectedOutput.tokens_used?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-muted/20 rounded p-2">
                  <span className="text-muted-foreground">Custo:</span>
                  <p className="font-medium mt-0.5">${Number(selectedOutput.cost_estimate || 0).toFixed(4)}</p>
                </div>
              </div>

              {/* Replay Settings */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trocar agente (opcional)</label>
                  <Select value={replayAgentId} onValueChange={setReplayAgentId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Manter agente original" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Manter original</SelectItem>
                      {agents.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>
                          <div className="flex items-center gap-1.5">
                            <Bot className="h-3 w-3" />
                            @{a.name} ({a.role})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={executeReplay} disabled={replaying} className="gap-1.5">
                  {replaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Executar Replay
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Comparison View */}
      {comparing && selectedOutput && replayResult && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-blue-400" /> Comparação: Original vs Replay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px]">Original</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {selectedOutput.agents?.name} · {selectedOutput.tokens_used?.toLocaleString()} tokens
                  </span>
                </div>
                <ScrollArea className="h-[400px] rounded border border-border/30 bg-muted/20 p-3">
                  <pre className="text-xs whitespace-pre-wrap font-mono">{originalText}</pre>
                </ScrollArea>
              </div>
              {/* Replay */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">Replay</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {replayAgentId ? agents.find((a: any) => a.id === replayAgentId)?.name : selectedOutput.agents?.name} · Novo resultado
                  </span>
                </div>
                <ScrollArea className="h-[400px] rounded border border-primary/20 bg-primary/5 p-3">
                  <pre className="text-xs whitespace-pre-wrap font-mono">{replayResult}</pre>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
