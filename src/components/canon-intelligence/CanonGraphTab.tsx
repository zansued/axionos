import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitBranch, Sparkles, TrendingUp, Zap, AlertTriangle, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CanonGraphTabProps {
  library: any[];
  supersessions: any[];
  conflicts: any[];
  learningSignals?: any[]; // New: Signals from neural feedback
  learningCandidates?: any[]; // New: Pending evolution items
}

export function CanonGraphTab({ library, supersessions, conflicts, learningSignals = [], learningCandidates = [] }: CanonGraphTabProps) {
  // 1. Group by domain
  const domainGroups = new Map<string, any[]>();
  library.forEach((e: any) => {
    const d = e.domain || e.stack_scope || "general";
    const g = domainGroups.get(d) || [];
    g.push(e);
    domainGroups.set(d, g);
  });

  // 2. Build learning map (Heatmap logic)
  const learningIntensity = new Map<string, number>();
  learningSignals.forEach((s: any) => {
    const domain = s.payload?.domain || "general";
    const count = learningIntensity.get(domain) || 0;
    learningIntensity.set(domain, count + 1);
  });

  // 3. Build supersession map
  const successorMap = new Map<string, string>();
  supersessions.forEach((s: any) => {
    successorMap.set(s.predecessor_entry_id, s.successor_entry_id);
  });

  return (
    <div className="space-y-5">
      <Card className="border-border/40 bg-card/60 overflow-hidden relative">
        {/* Ambient background glow for 'Learning' areas */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[100px] pointer-events-none" />

        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 font-display">
              <GitBranch className="h-4 w-4 text-primary" />
              Sovereign Learning Map
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-[10px] gap-1 bg-primary/5 border-primary/20">
                <Sparkles className="h-3 w-3 text-primary" />
                {learningSignals.length} Active Signals
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/5 border-emerald-500/20 text-emerald-400">
                <Lightbulb className="h-3 w-3" />
                {learningCandidates.length} Evolution Candidates
              </Badge>
            </div>
          </div>
          <CardDescription className="text-xs">
            Visualize institutional memory evolution and real-time learning friction.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="relative z-10">
          {library.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <GitBranch className="h-12 w-12 text-muted-foreground/20 mx-auto" />
              <p className="text-sm text-muted-foreground font-mono">CANON_EMPTY: Awaiting operational evidence...</p>
            </div>
          ) : (
            <ScrollArea className="h-[550px] pr-4">
              <div className="space-y-8">
                {[...domainGroups.entries()].map(([domain, entries]) => {
                  const intensity = learningIntensity.get(domain) || 0;
                  const isHot = intensity > 2;
                  const candidates = learningCandidates.filter(c => c.payload?.domain === domain || c.source_type === "neural_feedback" && domain === "general");

                  return (
                    <div key={domain} className="group space-y-3">
                      {/* Domain Header with Heatmap Indicator */}
                      <div className="flex items-center gap-3">
                        <div className={`h-1.5 w-1.5 rounded-full ${isHot ? "bg-primary animate-pulse shadow-[0_0_8px_rgba(20,136,252,0.6)]" : "bg-muted-foreground/30"}`} />
                        <h3 className={`text-[11px] font-bold uppercase tracking-[0.15em] ${isHot ? "text-primary" : "text-muted-foreground/70"}`}>
                          {domain}
                        </h3>
                        {isHot && (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] h-4 py-0 font-bold uppercase">
                            Fast Learning
                          </Badge>
                        )}
                        <div className="flex-1 border-b border-border/20 border-dashed" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 ml-4">
                        {/* Existing Canon Entries */}
                        {entries.map((e: any) => {
                          const hasSuccessor = successorMap.has(e.id);
                          const isSuperseded = e.lifecycle_status === "superseded" || e.lifecycle_status === "deprecated";
                          
                          return (
                            <motion.div 
                              key={e.id} 
                              whileHover={{ x: 2, backgroundColor: "rgba(255,255,255,0.03)" }}
                              className={`relative group/item flex flex-col p-3 rounded-lg border transition-all duration-200
                                ${isSuperseded ? "border-border/10 opacity-40 bg-muted/5 grayscale" : "border-border/30 bg-card/40 hover:border-primary/40 shadow-sm"}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className={`text-[13px] leading-snug truncate ${isSuperseded ? "line-through" : "font-medium text-foreground/90"}`}>
                                  {e.title}
                                </span>
                                <Badge variant="outline" className={`text-[9px] px-1.5 h-4 shrink-0 font-mono ${isSuperseded ? "border-muted" : "border-primary/20 bg-primary/5 text-primary/70"}`}>
                                  {e.lifecycle_status.slice(0, 3)}
                                </Badge>
                              </div>
                              
                              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground/50">
                                <span className="font-mono">ID: {e.id.slice(0, 8)}</span>
                                {hasSuccessor && (
                                  <div className="flex items-center gap-1 text-primary/60">
                                    <TrendingUp className="h-3 w-3" />
                                    <span>Superseded</span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}

                        {/* Evolution Candidates (Future Canon) */}
                        {candidates.map((c: any) => (
                          <motion.div 
                            key={c.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative flex flex-col p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                          >
                            <div className="absolute -top-1.5 -right-1.5">
                              <span className="flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                              </span>
                            </div>
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[13px] leading-snug font-semibold text-emerald-400">
                                {c.title}
                              </span>
                              <Badge variant="outline" className="text-[9px] px-1.5 h-4 shrink-0 bg-emerald-500/10 border-emerald-500/30 text-emerald-500">
                                CANDIDATE
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                              {c.summary}
                            </p>
                            <div className="mt-2 flex items-center gap-2 text-[9px] font-mono text-emerald-500/60 uppercase tracking-wider">
                              <Zap className="h-3 w-3" />
                              Confidence: {c.confidence_score}%
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Conflict Awareness Section */}
                {conflicts.filter((c: any) => c.resolution_status !== "resolved").length > 0 && (
                  <div className="space-y-3 pt-6 border-t border-border/20">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-500/80">Active Memory Conflicts</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {conflicts.filter((c: any) => c.resolution_status !== "resolved").map((c: any) => (
                        <div key={c.id} className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-amber-400 uppercase">{c.severity}</span>
                            <span className="text-[10px] text-amber-500/60 font-mono">{c.conflict_type}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground/80 leading-relaxed italic">
                            "{c.conflict_description}"
                          </p>
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
