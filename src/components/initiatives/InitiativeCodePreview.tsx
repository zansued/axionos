import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Code2, FolderTree, FileCode, FileJson, FileType, FileText,
  ChevronRight, ChevronDown, Copy, Check, Loader2
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
  agent_name: string;
  agent_role: string;
}

// Build a nested tree from flat file paths
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

  // Sort: directories first, then files, alphabetically
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

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (file: CodeFile) => void;
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

// Simple syntax coloring via regex - returns spans with color classes
function highlightCode(code: string, language: string | null): JSX.Element {
  // For simplicity, just render as preformatted text with monospace
  // A full syntax highlighter would be heavy; this gives a good enough preview
  return <>{code}</>;
}

export function InitiativeCodePreview({ initiativeId, organizationId }: InitiativeCodePreviewProps) {
  const [selectedFile, setSelectedFile] = useState<CodeFile | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: codeFiles = [], isLoading } = useQuery({
    queryKey: ["initiative-code-files", initiativeId],
    queryFn: async () => {
      // Get stories for this initiative
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
        .select("id, file_path, file_type")
        .in("phase_id", phaseIds)
        .not("file_path", "is", null);

      if (!subtasks?.length) return [];

      const subtaskIds = subtasks.map((st) => st.id);
      const subtaskMap = new Map(subtasks.map((st) => [st.id, st]));

      const { data: artifacts } = await supabase
        .from("agent_outputs")
        .select("id, raw_output, subtask_id, agents(name, role)")
        .in("subtask_id", subtaskIds)
        .eq("organization_id", organizationId)
        .eq("type", "code");

      if (!artifacts?.length) return [];

      const files: CodeFile[] = [];
      for (const art of artifacts) {
        const raw = art.raw_output as any;
        const subtask = art.subtask_id ? subtaskMap.get(art.subtask_id) : null;
        const filePath = raw?.file_path || subtask?.file_path;
        if (!filePath) continue;

        files.push({
          id: art.id,
          file_path: filePath,
          file_type: raw?.file_type || subtask?.file_type || null,
          language: raw?.language || null,
          content: raw?.content || raw?.text || "",
          agent_name: (art as any).agents?.name || "?",
          agent_role: (art as any).agents?.role || "?",
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
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Code2 className="h-4 w-4 text-primary" /> Código Gerado
          </CardTitle>
          <span className="text-xs text-muted-foreground">{codeFiles.length} arquivos</span>
        </div>
        {/* File type counts */}
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
          {/* Tree View */}
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

          {/* Code Preview */}
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
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {selectedFile.agent_name} ({selectedFile.agent_role})
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
                      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <ScrollArea className="flex-1 h-[360px]">
                  <pre className="text-xs font-mono p-3 leading-5 text-foreground/90 whitespace-pre overflow-x-auto">
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
  );
}
