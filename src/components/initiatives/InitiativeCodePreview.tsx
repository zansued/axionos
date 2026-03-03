import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Code2, FolderTree, FileCode, FileJson, FileType, FileText,
  ChevronRight, ChevronDown, Copy, Check, Loader2,
  Download, Archive, Sparkles
} from "lucide-react";

interface InitiativeCodePreviewProps {
  initiativeId: string;
  organizationId: string;
}

interface CodeFile {
  id: string;
  file_path: string;
  file_type: string | null;
  language: string | null;
  content: string;
  description: string;
  status: string;
}

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  file?: CodeFile;
}

function buildTree(files: CodeFile[]): TreeNode {
  const root: TreeNode = { name: "", path: "", children: [] };

  for (const file of files) {
    const parts = file.file_path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      let child = current.children.find((c) => c.name === part);

      if (!child) {
        child = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          children: [],
          file: isLast ? file : undefined,
        };
        current.children.push(child);
      }

      if (isLast && !child.file) {
        child.file = file;
      }

      current = child;
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      const aIsDir = a.children.length > 0 && !a.file;
      const bIsDir = b.children.length > 0 && !b.file;
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(root.children);

  return root;
}

function getFileIcon(fileName: string) {
  if (fileName.endsWith(".tsx") || fileName.endsWith(".ts")) return <FileCode className="h-3.5 w-3.5 text-blue-400" />;
  if (fileName.endsWith(".json")) return <FileJson className="h-3.5 w-3.5 text-yellow-400" />;
  if (fileName.endsWith(".css")) return <FileType className="h-3.5 w-3.5 text-purple-400" />;
  if (fileName.endsWith(".html")) return <FileText className="h-3.5 w-3.5 text-orange-400" />;
  return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
}

function getFileTypeFromPath(filePath: string): string {
  if (filePath.includes("/components/")) return "component";
  if (filePath.includes("/pages/") || filePath.includes("/views/")) return "page";
  if (filePath.includes("/hooks/")) return "hook";
  if (filePath.includes("/utils/") || filePath.includes("/lib/")) return "util";
  if (filePath.includes("/types/") || filePath.endsWith(".d.ts")) return "type";
  if (filePath.includes("/test") || filePath.includes(".test.") || filePath.includes(".spec.")) return "test";
  if (filePath.endsWith(".css") || filePath.endsWith(".scss")) return "style";
  if (filePath.endsWith(".json") || filePath.includes("config")) return "config";
  if (filePath.includes("package.json") || filePath.includes("vite.config") || filePath.includes("tsconfig")) return "scaffold";
  return "other";
}

function TreeItem({
  node, depth, selectedPath, onSelect,
}: {
  node: TreeNode; depth: number; selectedPath: string | null; onSelect: (file: CodeFile) => void;
}) {
  const isDir = node.children.length > 0;
  const [open, setOpen] = useState(depth < 2);
  const isSelected = node.file && node.path === selectedPath;

  if (isDir && !node.file) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 w-full text-left py-0.5 px-1 rounded text-xs hover:bg-muted/50 transition-colors"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
          <FolderTree className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span className="font-medium text-foreground/80">{node.name}</span>
        </button>
        {open && node.children.map((child) => (
          <TreeItem key={child.path} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  if (node.file) {
    return (
      <button
        onClick={() => onSelect(node.file!)}
        className={`flex items-center gap-1.5 w-full text-left py-0.5 px-1 rounded text-xs transition-colors ${
          isSelected ? "bg-primary/15 text-primary" : "hover:bg-muted/50 text-foreground/70"
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {getFileIcon(node.name)}
        <span className={isSelected ? "font-semibold" : ""}>{node.name}</span>
      </button>
    );
  }

  return null;
}

export function InitiativeCodePreview({ initiativeId, organizationId }: InitiativeCodePreviewProps) {
  const [selectedFile, setSelectedFile] = useState<CodeFile | null>(null);
  const [copied, setCopied] = useState(false);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [modifyPrompt, setModifyPrompt] = useState("");
  const [isModifying, setIsModifying] = useState(false);
  const { toast } = useToast();

  const { data: codeFiles = [], isLoading } = useQuery({
    queryKey: ["initiative-code-files", initiativeId],
    queryFn: async () => {
      const { data: stories } = await supabase
        .from("stories")
        .select("id")
        .eq("initiative_id", initiativeId);

      if (!stories?.length) return [];

      const storyIds = stories.map((s) => s.id);
      const { data: phases } = await supabase
        .from("story_phases")
        .select("id")
        .in("story_id", storyIds);

      if (!phases?.length) return [];

      const phaseIds = phases.map((p) => p.id);
      
      const { data: subtasks } = await supabase
        .from("story_subtasks")
        .select("id, description, file_path, file_type, output, status")
        .in("phase_id", phaseIds)
        .eq("status", "completed")
        .not("output", "is", null);

      if (!subtasks?.length) return [];

      const files: CodeFile[] = [];
      for (const st of subtasks) {
        const filePath = st.file_path || `docs/${st.description.slice(0, 60).replace(/[^a-zA-Z0-9-_]/g, '-')}.md`;
        
        files.push({
          id: st.id,
          file_path: filePath,
          file_type: st.file_type || getFileTypeFromPath(filePath),
          language: filePath.endsWith(".ts") || filePath.endsWith(".tsx") ? "typescript" : null,
          content: st.output || "",
          description: st.description,
          status: st.status,
        });
      }

      return files.sort((a, b) => a.file_path.localeCompare(b.file_path));
    },
    enabled: !!initiativeId,
  });

  const tree = useMemo(() => buildTree(codeFiles), [codeFiles]);

  const fileTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of codeFiles) {
      const type = f.file_type || "other";
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  }, [codeFiles]);

  const handleCopy = async () => {
    if (!selectedFile) return;
    await navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = useCallback(() => {
    if (!selectedFile) return;
    const blob = new Blob([selectedFile.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedFile.file_path.split("/").pop() || "file.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleDownloadZip = useCallback(async () => {
    // Generate a simple concatenated file bundle as a downloadable text file
    // For a real ZIP we'd need JSZip, but we can create a shell script that recreates the structure
    const script = codeFiles.map((f) => {
      const dir = f.file_path.split("/").slice(0, -1).join("/");
      const escapedContent = f.content.replace(/'/g, "'\\\\''");
      return `${dir ? `mkdir -p '${dir}'` : ""}\\\\ncat > '${f.file_path}' << 'AXIONEOF'\\\\n${f.content}\\\\nAXIONEOF\\\\n`;
    }).join("\\n");

    const header = `#!/bin/bash\\\\n# Generated by AxionOS - ${codeFiles.length} files\\\\n# Run: bash this_file.sh\\\\n\\\\n`;
    const blob = new Blob([header + script], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `axionos-project-${initiativeId.slice(0, 8)}.sh`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Download iniciado!", description: "Execute o script .sh para recriar a estrutura de arquivos." });
  }, [codeFiles, initiativeId, toast]);

  const handleModifyWithAI = async () => {
    if (!modifyPrompt.trim() || !selectedFile) return;
    setIsModifying(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Não autenticado");

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-initiative-pipeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          initiativeId,
          stage: "fast_modify",
          modification: {
            file_path: selectedFile.file_path,
            file_content: selectedFile.content,
            prompt: modifyPrompt.trim(),
          },
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro" }));
        throw new Error(err.error || `Erro ${resp.status}`);
      }

      const result = await resp.json();
      toast({
        title: "Modificação concluída! ✅",
        description: `${result.files_modified || 1} arquivo(s) atualizado(s). ${result.pr_url ? "PR atualizado no GitHub." : ""}`,
      });
      setModifyOpen(false);
      setModifyPrompt("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setIsModifying(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (codeFiles.length === 0) return null;

  const typeColorMap: Record<string, string> = {
    component: "bg-blue-500/15 text-blue-400",
    page: "bg-indigo-500/15 text-indigo-400",
    scaffold: "bg-green-500/15 text-green-400",
    config: "bg-yellow-500/15 text-yellow-400",
    style: "bg-purple-500/15 text-purple-400",
    hook: "bg-cyan-500/15 text-cyan-400",
    util: "bg-orange-500/15 text-orange-400",
    type: "bg-pink-500/15 text-pink-400",
    test: "bg-red-500/15 text-red-400",
    other: "bg-muted text-muted-foreground",
  };

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" /> Código Gerado
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleDownloadZip}>
                <Archive className="h-3.5 w-3.5" />
                Download Projeto
              </Button>
              <span className="text-xs text-muted-foreground">{codeFiles.length} arquivos</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(fileTypeCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <Badge key={type} variant="secondary" className={`text-[10px] ${typeColorMap[type] || typeColorMap.other}`}>
                  {type}: {count}
                </Badge>
              ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[220px,1fr] gap-3 min-h-[350px]">
            <ScrollArea className="h-[400px] rounded border border-border/30 bg-muted/10 p-1.5">
              {tree.children.map((node) => (
                <TreeItem
                  key={node.path}
                  node={node}
                  depth={0}
                  selectedPath={selectedFile?.file_path || null}
                  onSelect={setSelectedFile}
                />
              ))}
            </ScrollArea>

            <div className="rounded border border-border/30 bg-[hsl(var(--card))] overflow-hidden flex flex-col">
              {selectedFile ? (
                <>
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-muted/20">
                    <div className="flex items-center gap-2 min-w-0">
                      {getFileIcon(selectedFile.file_path)}
                      <span className="text-xs font-mono text-foreground/80 truncate">{selectedFile.file_path}</span>
                      {selectedFile.file_type && (
                        <Badge variant="secondary" className={`text-[9px] shrink-0 ${typeColorMap[selectedFile.file_type] || typeColorMap.other}`}>
                          {selectedFile.file_type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDownloadFile} title="Download arquivo">
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy} title="Copiar">
                        {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-primary"
                        onClick={() => setModifyOpen(true)}
                        title="Modificar com IA"
                      >
                        <Sparkles className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 h-[360px]">
                    <pre className="text-xs font-mono p-3 leading-5 text-foreground/90 whitespace-pre-wrap overflow-x-auto">
                      <code>{selectedFile.content}</code>
                    </pre>
                  </ScrollArea>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground/40">
                  <div className="text-center">
                    <FileCode className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-xs">Selecione um arquivo na árvore</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modify with AI Dialog */}
      <Dialog open={modifyOpen} onOpenChange={setModifyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Modificar com IA
            </DialogTitle>
            <DialogDescription>
              Descreva a mudança desejada. O agente responsável executará a modificação e republicará no GitHub automaticamente.
            </DialogDescription>
          </DialogHeader>
          {selectedFile && (
            <div className="rounded border border-border/30 bg-muted/20 p-2">
              <div className="flex items-center gap-2 text-xs">
                {getFileIcon(selectedFile.file_path)}
                <span className="font-mono text-foreground/80">{selectedFile.file_path}</span>
              </div>
            </div>
          )}
          <Textarea
            placeholder="Ex: Adicionar campo de telefone no formulário de cadastro, com máscara e validação..."
            value={modifyPrompt}
            onChange={(e) => setModifyPrompt(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModifyOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleModifyWithAI}
              disabled={modifyPrompt.trim().length < 10 || isModifying}
              className="gap-1.5"
            >
              {isModifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Modificando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Modificar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
