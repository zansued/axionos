import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, CheckCircle2, XCircle } from "lucide-react";

interface ApplicationsTabProps {
  applications: any[];
  sessions: any[];
}

export function ApplicationsTab({ applications, sessions }: ApplicationsTabProps) {
  // Enrich applications with session context
  const sessionMap = new Map(sessions.map((s: any) => [s.id, s]));

  return (
    <div className="space-y-4">
      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Runtime Applications
          </CardTitle>
          <CardDescription>
            Concrete events where canon patterns influenced agent execution
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Zap className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">No runtime applications recorded yet.</p>
              <p className="text-xs text-muted-foreground/60">Applications appear when agents apply canon patterns during task execution.</p>
            </div>
          ) : (
            <ScrollArea className="h-[480px]">
              <div className="space-y-2">
                {applications.map((a: any) => {
                  const session = sessionMap.get(a.session_id);
                  const isSuccess = a.outcome_status === "applied" || a.outcome_status === "success";
                  return (
                    <div key={a.id} className="p-4 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/15 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {isSuccess
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                            : <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                          }
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">{a.application_type || "pattern_application"}</Badge>
                              <span className="text-xs font-medium">{a.agent_type || "Agent"}</span>
                            </div>
                            {session && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Session: {session.task_type || session.retrieval_reason || "—"}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className={`text-[10px] ${isSuccess ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
                            {a.outcome_status || "pending"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground/60 ml-6">
                        <span>Confidence: {a.confidence_at_application ?? 0}%</span>
                        {a.canon_entry_id && <span className="font-mono">Entry: {a.canon_entry_id.slice(0, 8)}...</span>}
                        <span>{new Date(a.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
