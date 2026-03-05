import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileCode, Database, Puzzle, Globe, Box, Brain, GitBranch, ArrowRight, Layers } from "lucide-react";

const NODE_TYPE_ICONS: Record<string, typeof FileCode> = {
  file: FileCode, component: Puzzle, hook: GitBranch, service: Globe,
  api: Globe, table: Database, type: Box, schema: Database,
  edge_function: Globe, page: FileCode, context: Brain, util: Box,
};

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  planned: { bg: "bg-muted/50", border: "border-muted-foreground/20", text: "text-muted-foreground", dot: "bg-muted-foreground" },
  generated: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", dot: "bg-blue-500" },
  validated: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400", dot: "bg-green-500" },
  published: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", dot: "bg-purple-500" },
  error: { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", dot: "bg-destructive" },
};

interface BrainNode {
  id: string;
  name: string;
  node_type: string;
  file_path: string | null;
  status: string;
  metadata: any;
}

interface BrainEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relation_type: string;
}

interface BrainDAGGraphProps {
  nodes: BrainNode[];
  edges: BrainEdge[];
}

/**
 * Compute topological layers (waves) via BFS from roots.
 * Nodes with no incoming edges are wave 0.
 */
function computeWaves(nodes: BrainNode[], edges: BrainEdge[]): Map<string, number> {
  const nodeIds = new Set(nodes.map(n => n.id));
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjList.set(id, []);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.source_node_id) || !nodeIds.has(edge.target_node_id)) continue;
    adjList.get(edge.source_node_id)!.push(edge.target_node_id);
    inDegree.set(edge.target_node_id, (inDegree.get(edge.target_node_id) || 0) + 1);
  }

  const waveMap = new Map<string, number>();
  const queue: string[] = [];

  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
      waveMap.set(id, 0);
    }
  }

  let idx = 0;
  while (idx < queue.length) {
    const curr = queue[idx++];
    const currWave = waveMap.get(curr) || 0;
    for (const neighbor of adjList.get(curr) || []) {
      const newWave = currWave + 1;
      if (!waveMap.has(neighbor) || waveMap.get(neighbor)! < newWave) {
        waveMap.set(neighbor, newWave);
      }
      inDegree.set(neighbor, (inDegree.get(neighbor) || 1) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Orphans (cycles or disconnected) get wave 0
  for (const id of nodeIds) {
    if (!waveMap.has(id)) waveMap.set(id, 0);
  }

  return waveMap;
}

export function BrainDAGGraph({ nodes, edges }: BrainDAGGraphProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const { waves, maxWave, stats } = useMemo(() => {
    const waveMap = computeWaves(nodes, edges);
    const grouped = new Map<number, BrainNode[]>();
    let max = 0;

    for (const node of nodes) {
      const wave = waveMap.get(node.id) || 0;
      if (wave > max) max = wave;
      if (!grouped.has(wave)) grouped.set(wave, []);
      grouped.get(wave)!.push(node);
    }

    const statusCounts: Record<string, number> = {};
    for (const n of nodes) {
      statusCounts[n.status] = (statusCounts[n.status] || 0) + 1;
    }

    return { waves: grouped, maxWave: max, stats: statusCounts };
  }, [nodes, edges]);

  const selectedEdges = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const set = new Set<string>();
    for (const e of edges) {
      if (e.source_node_id === selectedNode || e.target_node_id === selectedNode) {
        set.add(e.id);
        set.add(e.source_node_id);
        set.add(e.target_node_id);
      }
    }
    return set;
  }, [selectedNode, edges]);

  const nodeById = useMemo(() => {
    const map = new Map<string, BrainNode>();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  // Get dependencies for selected node
  const selectedDeps = useMemo(() => {
    if (!selectedNode) return { incoming: [] as BrainNode[], outgoing: [] as BrainNode[] };
    const incoming: BrainNode[] = [];
    const outgoing: BrainNode[] = [];
    for (const e of edges) {
      if (e.target_node_id === selectedNode) {
        const src = nodeById.get(e.source_node_id);
        if (src) incoming.push(src);
      }
      if (e.source_node_id === selectedNode) {
        const tgt = nodeById.get(e.target_node_id);
        if (tgt) outgoing.push(tgt);
      }
    }
    return { incoming, outgoing };
  }, [selectedNode, edges, nodeById]);

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <Badge variant="outline" className="gap-1.5 text-xs">
          <Layers className="h-3 w-3" />
          {maxWave + 1} waves
        </Badge>
        <Badge variant="outline" className="gap-1.5 text-xs">
          <GitBranch className="h-3 w-3" />
          {edges.length} deps
        </Badge>
        {Object.entries(stats).map(([status, count]) => {
          const s = STATUS_STYLES[status] || STATUS_STYLES.planned;
          return (
            <Badge key={status} variant="outline" className={`text-xs ${s.text} ${s.border}`}>
              <span className={`h-2 w-2 rounded-full ${s.dot} mr-1.5`} />
              {count} {status}
            </Badge>
          );
        })}
      </div>

      {/* DAG Waves */}
      <TooltipProvider delayDuration={200}>
        <div className="space-y-3">
          {Array.from({ length: maxWave + 1 }, (_, waveIdx) => {
            const waveNodes = waves.get(waveIdx) || [];
            if (waveNodes.length === 0) return null;

            return (
              <div key={waveIdx} className="relative">
                {/* Wave header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider bg-muted/50 px-2 py-0.5 rounded">
                    Wave {waveIdx}
                  </span>
                  <div className="flex-1 h-px bg-border/50" />
                  <span className="text-[10px] text-muted-foreground">{waveNodes.length} nós</span>
                </div>

                {/* Wave nodes */}
                <div className="flex flex-wrap gap-2">
                  {waveNodes.map((node) => {
                    const s = STATUS_STYLES[node.status] || STATUS_STYLES.planned;
                    const Icon = NODE_TYPE_ICONS[node.node_type] || FileCode;
                    const isSelected = selectedNode === node.id;
                    const isHighlighted = selectedNode ? selectedEdges.has(node.id) : true;
                    const dimmed = selectedNode && !isHighlighted;

                    return (
                      <Tooltip key={node.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setSelectedNode(isSelected ? null : node.id)}
                            className={`
                              group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs
                              transition-all duration-200 cursor-pointer
                              ${s.bg} ${s.border} ${s.text}
                              ${isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background scale-105" : ""}
                              ${dimmed ? "opacity-25 scale-95" : "hover:scale-[1.03]"}
                            `}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${s.dot} shrink-0`} />
                            <Icon className="h-3 w-3 shrink-0 opacity-70" />
                            <span className="truncate max-w-[120px] font-medium">{node.name}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold text-xs">{node.name}</p>
                            {node.file_path && <p className="text-[10px] font-mono text-muted-foreground">{node.file_path}</p>}
                            <div className="flex gap-1.5">
                              <Badge variant="outline" className="text-[10px]">{node.node_type}</Badge>
                              <Badge variant="outline" className={`text-[10px] ${s.text} ${s.border}`}>{node.status}</Badge>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>

                {/* Arrow connector to next wave */}
                {waveIdx < maxWave && (
                  <div className="flex justify-center py-1">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Selected node detail panel */}
      {selectedNode && nodeById.get(selectedNode) && (
        <Card className="border-primary/30 bg-primary/5 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(() => {
                const n = nodeById.get(selectedNode)!;
                const Icon = NODE_TYPE_ICONS[n.node_type] || FileCode;
                return (
                  <>
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{n.name}</span>
                  </>
                );
              })()}
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
          </div>

          {nodeById.get(selectedNode)!.file_path && (
            <p className="text-xs font-mono text-muted-foreground">{nodeById.get(selectedNode)!.file_path}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Depende de ({selectedDeps.incoming.length})</p>
              {selectedDeps.incoming.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhuma dependência (root)</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {selectedDeps.incoming.map(d => {
                    const ds = STATUS_STYLES[d.status] || STATUS_STYLES.planned;
                    return (
                      <Badge key={d.id} variant="outline" className={`text-[10px] ${ds.text} ${ds.border} cursor-pointer`} onClick={() => setSelectedNode(d.id)}>
                        {d.name}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Dependentes ({selectedDeps.outgoing.length})</p>
              {selectedDeps.outgoing.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhum dependente (leaf)</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {selectedDeps.outgoing.map(d => {
                    const ds = STATUS_STYLES[d.status] || STATUS_STYLES.planned;
                    return (
                      <Badge key={d.id} variant="outline" className={`text-[10px] ${ds.text} ${ds.border} cursor-pointer`} onClick={() => setSelectedNode(d.id)}>
                        {d.name}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
