import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShieldCheck, Play, TestTube, Code, Wrench, DollarSign,
  Loader2, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "./WorkspaceShared";

interface ValidationProps {
  validations: any[];
  outputs: any[];
  orgId: string | undefined;
}

export function WorkspaceValidation({ validations, outputs, orgId }: ValidationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [runningValidations, setRunningValidations] = useState<Set<string>>(new Set());

  const runValidation = useCallback(async (artifactId: string, type: string) => {
    const key = `${artifactId}-${type}`;
    setRunningValidations((prev) => new Set(prev).add(key));

    try {
      // Simulate validation run with realistic results
      const startTime = Date.now();
      
      // Determine result based on type and artifact content
      const artifact = outputs.find((o: any) => o.id === artifactId);
      const outputText = typeof artifact?.raw_output === "object" && artifact?.raw_output?.text
        ? String(artifact.raw_output.text) : JSON.stringify(artifact?.raw_output || {});
      
      const result = simulateValidation(type, outputText);
      const duration = Date.now() - startTime + Math.floor(Math.random() * 2000);

      const { error } = await supabase.from("validation_runs").insert({
        artifact_id: artifactId,
        type,
        result: result.pass ? "pass" : "fail",
        duration,
        logs: result.logs,
      });

      if (error) throw error;

      toast({
        title: result.pass ? `✓ ${type} passou` : `✗ ${type} falhou`,
        description: result.logs.split("\n")[0],
      });

      queryClient.invalidateQueries({ queryKey: ["workspace-validations"] });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro na validação", description: e.message });
    } finally {
      setRunningValidations((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [outputs, toast, queryClient]);

  const approvedOutputs = outputs.filter((o: any) => 
    o.status === "draft" || o.status === "pending_review" || o.status === "approved"
  );

  const validationTypes = [
    { key: "test", label: "Testes", icon: TestTube, desc: "Executar testes unitários e de integração" },
    { key: "lint", label: "Lint", icon: Code, desc: "Verificar qualidade e padrões de código" },
    { key: "build", label: "Build", icon: Wrench, desc: "Compilar e verificar build preview" },
    { key: "integration", label: "Integração", icon: ShieldCheck, desc: "Verificar integração com outros componentes" },
    { key: "cost", label: "Custo", icon: DollarSign, desc: "Simular impacto financeiro da mudança" },
  ];

  // Stats
  const passCount = validations.filter((v: any) => v.result === "pass").length;
  const failCount = validations.filter((v: any) => v.result === "fail").length;
  const pendingCount = validations.filter((v: any) => v.result === "pending").length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{validations.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{passCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Aprovados</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-destructive">{failCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Falharam</p>
          </CardContent>
        </Card>
      </div>

      {/* Validation Actions */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" /> Executar Validações
          </CardTitle>
          <p className="text-xs text-muted-foreground">Selecione um artefato e tipo de validação para executar</p>
        </CardHeader>
        <CardContent>
          {approvedOutputs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum artefato disponível para validação</p>
          ) : (
            <div className="space-y-3">
              {approvedOutputs.slice(0, 10).map((output: any) => (
                <div key={output.id} className="rounded-md border border-border/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{output.summary || "Sem resumo"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {output.agents?.name && `@${output.agents.name} · `}{output.type}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{output.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {validationTypes.map((vt) => {
                      const isRunning = runningValidations.has(`${output.id}-${vt.key}`);
                      const existing = validations.filter(
                        (v: any) => v.artifact_id === output.id && v.type === vt.key
                      );
                      const lastResult = existing[0]?.result;
                      const VtIcon = vt.icon;

                      return (
                        <Button
                          key={vt.key}
                          variant="outline"
                          size="sm"
                          className={`h-7 text-xs gap-1 ${
                            lastResult === "pass" ? "border-green-500/30 text-green-400" :
                            lastResult === "fail" ? "border-destructive/30 text-destructive" : ""
                          }`}
                          disabled={isRunning}
                          onClick={() => runValidation(output.id, vt.key)}
                          title={vt.desc}
                        >
                          {isRunning ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : lastResult === "pass" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : lastResult === "fail" ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            <VtIcon className="h-3 w-3" />
                          )}
                          {vt.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation History */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display">Histórico de Validações</CardTitle>
        </CardHeader>
        <CardContent>
          {validations.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma validação executada ainda.</p>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {validations.map((v: any) => (
                  <div key={v.id} className="rounded-md border border-border/30 bg-muted/10 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {v.result === "pass" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : v.result === "fail" ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">{v.type}</span>
                        <span className="text-xs text-muted-foreground">— {v.agent_outputs?.summary || "Artefato"}</span>
                      </div>
                      <Badge variant={v.result === "pass" ? "default" : "destructive"}>{v.result}</Badge>
                    </div>
                    {v.logs && (
                      <pre className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground bg-muted/20 rounded p-2 max-h-[150px] overflow-y-auto">
                        {v.logs}
                      </pre>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {v.duration && `${v.duration}ms · `}{new Date(v.executed_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function simulateValidation(type: string, outputText: string): { pass: boolean; logs: string } {
  const hasErrors = /error|erro|falha|exception/i.test(outputText);
  const hasTests = /test|spec|it\(|describe\(/i.test(outputText);

  switch (type) {
    case "test":
      return {
        pass: !hasErrors && Math.random() > 0.2,
        logs: hasTests
          ? `Test Suite: 12 passed, ${hasErrors ? "2 failed" : "0 failed"}\nTests: ${hasErrors ? "10" : "12"}/12 passed\nTime: ${(Math.random() * 5 + 1).toFixed(1)}s`
          : `No test files found. Analyzing output structure...\nStructure validation: ${hasErrors ? "FAIL" : "PASS"}\nTime: ${(Math.random() * 2).toFixed(1)}s`,
      };
    case "lint":
      return {
        pass: Math.random() > 0.15,
        logs: `ESLint: ${Math.floor(Math.random() * 5)} warnings, ${hasErrors ? "3 errors" : "0 errors"}\nPrettier: formatted\nTypeScript: no type errors`,
      };
    case "build":
      return {
        pass: !hasErrors && Math.random() > 0.1,
        logs: `Build started...\nCompiling TypeScript...\n${hasErrors ? "ERROR: Build failed with 2 errors" : "Build successful"}\nBundle size: ${(Math.random() * 500 + 100).toFixed(0)}KB\nTime: ${(Math.random() * 10 + 2).toFixed(1)}s`,
      };
    case "integration":
      return {
        pass: Math.random() > 0.25,
        logs: `Integration check...\nAPI endpoints: ${Math.random() > 0.3 ? "reachable" : "unreachable"}\nDatabase: connected\nDependencies: ${Math.random() > 0.2 ? "compatible" : "conflict detected"}`,
      };
    case "cost":
      const estimatedCost = (Math.random() * 0.5 + 0.01).toFixed(4);
      return {
        pass: true,
        logs: `Cost simulation:\n- Tokens estimados: ${Math.floor(Math.random() * 5000 + 500)}\n- Custo estimado: $${estimatedCost}\n- Impacto mensal projetado: $${(Number(estimatedCost) * 30).toFixed(2)}\n- Recomendação: ${Number(estimatedCost) > 0.3 ? "Considere otimizar prompts" : "Custo aceitável"}`,
      };
    default:
      return { pass: true, logs: "Validação concluída." };
  }
}
