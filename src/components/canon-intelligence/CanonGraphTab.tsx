import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitBranch } from "lucide-react";

interface CanonGraphTabProps {
  library: any[];
  supersessions: any[];
  conflicts: any[];
}

export function CanonGraphTab({ library, supersessions, conflicts }: CanonGraphTabProps) {
  // Group by domain
  const domainGroups = new Map<string, any[]>();
  library.forEach((e: any) => {
    const d = e.domain || e.stack_scope || "general";
    const g = domainGroups.get(d) || [];
    g.push(e);
    domainGroups.set(d, g);
  });

  // Build supersession map
  const successorMap = new Map<string, string>();
  supersessions.forEach((s: any) => {
    successorMap.set(s.predecessor_entry_id, s.successor_entry_id);
  });

  return (
    <div className="space-y-5">
      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            Canon Knowledge Graph
          </CardTitle>
          <CardDescription>Explore pattern relationships, supersession chains, and domain structure</CardDescription>
        </CardHeader>
        <CardContent>
          {library.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <GitBranch className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">No canon entries to visualize.</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-6">
                {[...domainGroups.entries()].map(([domain, entries]) => (
                  <div key={domain} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">{domain}</h3>
                      <span className="text-[10px] text-muted-foreground">({entries.length})</span>
                    </div>
                    <div className="ml-4 border-l border-border/30 pl-4 space-y-1.5">
                      {entries.map((e: any) => {
                        const hasSuccessor = successorMap.has(e.id);
                        const isSuperseded = e.lifecycle_status === "superseded" || e.lifecycle_status === "deprecated";
                        return (
                          <div key={e.id} className={`flex items-center justify-between p-2 rounded border border-border/20 ${isSuperseded ? "bg-muted/5 opacity-50" : "bg-muted/10"}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`text-xs truncate ${isSuperseded ? "line-through text-muted-foreground" : "font-medium"}`}>{e.title}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant="outline" className="text-[9px]">{e.lifecycle_status}</Badge>
                              {hasSuccessor && (
                                <span className="text-[9px] text-muted-foreground">→ superseded</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Supersession chains */}
                {supersessions.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-border/20">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Supersession Chains</h3>
                    <div className="space-y-1.5">
                      {supersessions.map((s: any) => (
                        <div key={s.id} className="flex items-center gap-2 p-2 rounded border border-border/20 bg-muted/5 text-xs">
                          <span className="text-muted-foreground font-mono truncate max-w-[100px]">{s.predecessor_entry_id?.slice(0, 8)}...</span>
                          <span className="text-primary">→</span>
                          <span className="font-mono truncate max-w-[100px]">{s.successor_entry_id?.slice(0, 8)}...</span>
                          <span className="text-[10px] text-muted-foreground/50 ml-auto">{s.reason || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Open Conflicts */}
                {conflicts.filter((c: any) => c.resolution_status !== "resolved").length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-border/20">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">Open Conflicts</h3>
                    <div className="space-y-1.5">
                      {conflicts.filter((c: any) => c.resolution_status !== "resolved").map((c: any) => (
                        <div key={c.id} className="p-2 rounded border border-amber-500/20 bg-amber-500/5 text-xs">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30">{c.severity}</Badge>
                            <span>{c.conflict_type}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">{c.conflict_description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
