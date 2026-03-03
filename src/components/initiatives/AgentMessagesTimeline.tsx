import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, ArrowRight, CheckCircle2, AlertTriangle, Wrench, Send } from "lucide-react";

const MESSAGE_TYPE_CONFIG: Record<string, { icon: typeof Send; label: string; color: string }> = {
  handoff: { icon: Send, label: "Handoff", color: "text-info" },
  review: { icon: CheckCircle2, label: "Review", color: "text-warning" },
  fix: { icon: Wrench, label: "Correção", color: "text-accent" },
  feedback: { icon: AlertTriangle, label: "Feedback", color: "text-destructive" },
};

const ROLE_COLORS: Record<string, string> = {
  architect: "bg-accent/15 text-accent border-accent/30",
  dev: "bg-primary/15 text-primary border-primary/30",
  qa: "bg-warning/15 text-warning border-warning/30",
};

interface AgentMessagesTimelineProps {
  initiativeId: string;
}

export function AgentMessagesTimeline({ initiativeId }: AgentMessagesTimelineProps) {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["agent-messages", initiativeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_messages" as any)
        .select("*")
        .eq("initiative_id", initiativeId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!initiativeId,
  });

  if (isLoading || messages.length === 0) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-info" />
          Chain-of-Agents ({messages.length} mensagens)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="relative pl-4 space-y-3">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

            {messages.map((msg: any, idx: number) => {
              const typeConfig = MESSAGE_TYPE_CONFIG[msg.message_type] || MESSAGE_TYPE_CONFIG.handoff;
              const Icon = typeConfig.icon;
              const fromColor = ROLE_COLORS[msg.role_from] || "bg-muted text-muted-foreground";
              const toColor = ROLE_COLORS[msg.role_to] || "bg-muted text-muted-foreground";

              // Parse QA review JSON if applicable
              let qaData: any = null;
              if (msg.message_type === "review") {
                try { qaData = JSON.parse(msg.content); } catch { /* not JSON */ }
              }

              return (
                <div key={msg.id || idx} className="relative flex gap-3">
                  {/* Timeline dot */}
                  <div className={`absolute -left-4 top-1 h-3 w-3 rounded-full border-2 border-background ${
                    msg.message_type === "review" ? "bg-warning" :
                    msg.message_type === "fix" ? "bg-accent" :
                    "bg-info"
                  }`} />

                  <div className="flex-1 border border-border/30 rounded-lg p-2.5 space-y-1.5 bg-card/50">
                    {/* Header */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] py-0 ${fromColor}`}>
                        {msg.role_from}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline" className={`text-[10px] py-0 ${toColor}`}>
                        {msg.role_to}
                      </Badge>
                      <Badge variant="secondary" className={`text-[10px] py-0 gap-1 ${typeConfig.color}`}>
                        <Icon className="h-2.5 w-2.5" />
                        {typeConfig.label}
                      </Badge>
                      {msg.iteration > 1 && (
                        <span className="text-[10px] text-muted-foreground">iter. {msg.iteration}</span>
                      )}
                      {msg.tokens_used > 0 && (
                        <span className="text-[10px] text-muted-foreground ml-auto">{msg.tokens_used} tokens</span>
                      )}
                    </div>

                    {/* Content */}
                    {qaData ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={qaData.approved ? "default" : "destructive"} className="text-[10px]">
                            {qaData.approved ? "✅ Aprovado" : "❌ Reprovado"}
                          </Badge>
                          {qaData.score !== undefined && (
                            <span className="text-[10px] text-muted-foreground">Score: {qaData.score}/100</span>
                          )}
                        </div>
                        {qaData.issues?.length > 0 && (
                          <div className="text-[11px] text-destructive/80">
                            {qaData.issues.map((issue: string, i: number) => (
                              <p key={i} className="flex items-start gap-1">
                                <span className="shrink-0">•</span> {issue}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap break-words max-h-[150px] overflow-hidden">
                        {msg.content?.slice(0, 500)}{msg.content?.length > 500 ? "..." : ""}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
