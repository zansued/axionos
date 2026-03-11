import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Radio, Eye } from "lucide-react";

interface RetrievalExplorerTabProps {
  sessions: any[];
  feedback: any[];
}

export function RetrievalExplorerTab({ sessions, feedback }: RetrievalExplorerTabProps) {
  const activeSessions = sessions.filter((s: any) => s.session_status === "active");
  const recentSessions = sessions.slice(0, 50);

  return (
    <div className="space-y-5">
      {/* Live activity */}
      {activeSessions.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-primary animate-pulse" />
              Live Retrieval ({activeSessions.length} active)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeSessions.slice(0, 5).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded border border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{s.agent_type}</span>
                    <span className="text-[10px] text-muted-foreground">{s.task_type || s.retrieval_reason || "—"}</span>
                  </div>
                  <span className="text-[10px] text-primary font-medium">retrieving...</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session History */}
      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Retrieval Sessions
          </CardTitle>
          <CardDescription>Agent retrieval sessions with context, results, and confidence</CardDescription>
        </CardHeader>
        <CardContent>
          {recentSessions.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Eye className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">No retrieval sessions recorded.</p>
            </div>
          ) : (
            <ScrollArea className="h-[440px]">
              <div className="space-y-2">
                {recentSessions.map((s: any) => (
                  <div key={s.id} className="p-3 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/15 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${s.session_status === "completed" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : s.session_status === "active" ? "bg-primary/20 text-primary border-primary/30" : "bg-muted text-muted-foreground"}`}>
                          {s.session_status}
                        </Badge>
                        <span className="text-xs font-medium">{s.agent_type}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground/50">{new Date(s.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{s.retrieval_reason || s.task_type || "No description"}</p>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground/60">
                      <span>Retrieved: <strong className="text-foreground/80">{s.entries_retrieved ?? 0}</strong></span>
                      <span>Applied: <strong className="text-emerald-400">{s.entries_applied ?? 0}</strong></span>
                      {s.duration_ms && <span>{s.duration_ms}ms</span>}
                      {s.retrieval_context && <span>Context: {typeof s.retrieval_context === "object" ? JSON.stringify(s.retrieval_context).slice(0, 60) : s.retrieval_context}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Feedback Summary */}
      {feedback.length > 0 && (
        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Recent Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {feedback.slice(0, 5).map((f: any) => (
                <div key={f.id} className="flex items-center justify-between p-2 rounded border border-border/20 bg-muted/10">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{f.feedback_type}</Badge>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{f.feedback_notes || "—"}</span>
                  </div>
                  <span className="text-xs font-medium">{f.feedback_score}/100</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
