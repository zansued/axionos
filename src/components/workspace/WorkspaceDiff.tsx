import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { GitCompare, FileCode, ArrowRight, Layers, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EmptyState, getOutputText } from "./WorkspaceShared";

interface DiffProps {
  outputs: any[];
  codeArtifacts: any[];
}

export function WorkspaceDiff({ outputs, codeArtifacts }: DiffProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const codeOutputs = outputs.filter((o: any) => o.type === "code");

  if (codeOutputs.length === 0) {
    return <EmptyState icon={GitCompare} text="Nenhum artefato de código gerado. Execute subtasks com agentes Dev/DevOps." />;
  }

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{codeOutputs.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Artefatos de Código</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{codeArtifacts.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Code Artifacts</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">
              {codeArtifacts.reduce((acc: number, ca: any) => {
                const files = ca.files_affected;
                return acc + (Array.isArray(files) ? files.length : 0);
              }, 0)}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Arquivos Afetados</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">
              {codeOutputs.filter((o: any) => o.status === "approved" || o.status === "deployed").length}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Aprovados</p>
          </CardContent>
        </Card>
      </div>

      {/* Diff Cards */}
      {codeOutputs.map((o: any) => {
        const artifact = codeArtifacts.find((ca: any) => ca.output_id === o.id);
        const isExpanded = expandedId === o.id;
        const outputText = getOutputText(o.raw_output);

        // Parse structural changes from output
        const filesFromOutput = extractFilesFromOutput(outputText);
        const impactLevel = estimateImpact(outputText);

        return (
          <Card key={o.id} className="border-border/50">
            <Collapsible open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : o.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                      <GitCompare className="h-4 w-4 text-blue-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm font-display">{o.summary || "Artefato de código"}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          {o.agents && <span>@{o.agents.name}</span>}
                          <span>{o.tokens_used?.toLocaleString()} tokens</span>
                          <span>{new Date(o.created_at).toLocaleString("pt-BR")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <ImpactBadge level={impactLevel} />
                      <Badge variant="outline">{o.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  {/* Files Affected */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileCode className="h-3.5 w-3.5" /> Arquivos Afetados
                    </h4>
                    <div className="space-y-1">
                      {artifact && Array.isArray(artifact.files_affected) && artifact.files_affected.length > 0 ? (
                        artifact.files_affected.map((f: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs font-mono bg-muted/20 rounded px-2 py-1">
                            <FileCode className="h-3 w-3 text-primary" />
                            <span>{typeof f === "string" ? f : f.path || JSON.stringify(f)}</span>
                          </div>
                        ))
                      ) : filesFromOutput.length > 0 ? (
                        filesFromOutput.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs font-mono bg-muted/20 rounded px-2 py-1">
                            <FileCode className="h-3 w-3 text-primary" />
                            <span>{f}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Nenhum arquivo identificado — verifique o output abaixo</p>
                      )}
                    </div>
                  </div>

                  {/* Structural Changes */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" /> Mudanças Estruturais
                    </h4>
                    <div className="rounded-md bg-muted/10 border border-border/30 p-3">
                      {artifact?.branch_name && (
                        <div className="flex items-center gap-2 text-xs mb-2">
                          <span className="text-muted-foreground">Branch:</span>
                          <code className="bg-muted/30 px-1.5 py-0.5 rounded text-primary">{artifact.branch_name}</code>
                        </div>
                      )}
                      {artifact?.pr_url && (
                        <div className="flex items-center gap-2 text-xs mb-2">
                          <span className="text-muted-foreground">PR:</span>
                          <a href={artifact.pr_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">{artifact.pr_url}</a>
                        </div>
                      )}
                      {artifact?.build_status && (
                        <div className="flex items-center gap-2 text-xs mb-2">
                          <span className="text-muted-foreground">Build:</span>
                          <Badge variant={artifact.build_status === "pass" ? "default" : "outline"} className="text-[10px]">{artifact.build_status}</Badge>
                        </div>
                      )}
                      {artifact?.test_status && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Testes:</span>
                          <Badge variant={artifact.test_status === "pass" ? "default" : "outline"} className="text-[10px]">{artifact.test_status}</Badge>
                        </div>
                      )}
                      {!artifact && (
                        <p className="text-xs text-muted-foreground italic">Dados de estrutura não disponíveis ainda</p>
                      )}
                    </div>
                  </div>

                  {/* Diff Output */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5" /> Output Completo
                    </h4>
                    <ScrollArea className="max-h-[400px] rounded border border-border/30 bg-muted/20 p-3">
                      <pre className="text-xs whitespace-pre-wrap font-mono">{outputText}</pre>
                    </ScrollArea>
                  </div>

                  {artifact?.diff_patch && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Diff Patch</h4>
                      <ScrollArea className="max-h-[300px] rounded border border-border/30 bg-muted/20 p-3">
                        <pre className="text-xs whitespace-pre-wrap font-mono text-green-400">{artifact.diff_patch}</pre>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}

function ImpactBadge({ level }: { level: "low" | "medium" | "high" | "critical" }) {
  const config = {
    low: { label: "Baixo", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    medium: { label: "Médio", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    high: { label: "Alto", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    critical: { label: "Crítico", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const c = config[level];
  return (
    <Badge className={`text-[10px] ${c.className}`}>
      {level === "high" || level === "critical" ? <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> : null}
      Impacto {c.label}
    </Badge>
  );
}

function extractFilesFromOutput(text: string): string[] {
  const patterns = [
    /(?:src|lib|app|pages|components|utils|hooks|services)\/[\w\-\/]+\.\w+/g,
    /[\w\-]+\.(tsx?|jsx?|css|json|yaml|toml|sql|py|go|rs)/g,
  ];
  const files = new Set<string>();
  for (const p of patterns) {
    const matches = text.match(p);
    if (matches) matches.forEach((m) => files.add(m));
  }
  return Array.from(files).slice(0, 20);
}

function estimateImpact(text: string): "low" | "medium" | "high" | "critical" {
  const len = text.length;
  const hasDB = /database|migration|schema|tabela|rls|policy/i.test(text);
  const hasAuth = /auth|security|permission|token/i.test(text);
  const hasInfra = /deploy|ci\/cd|docker|kubernetes|infra/i.test(text);
  
  if (hasAuth && hasDB) return "critical";
  if (hasInfra || hasDB) return "high";
  if (len > 3000) return "medium";
  return "low";
}
