import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, CheckCircle2, XCircle, Wrench, Loader2, GitPullRequest } from "lucide-react";

interface CIFixSwarmStatusProps {
  initiativeId: string;
}

interface CIData {
  ci_status?: string;
  ci_run_id?: string;
  ci_errors?: any[];
  ci_failed_at?: string;
  ci_passed_at?: string;
  fix_swarm_status?: string;
  fix_swarm_pr?: string;
  fix_swarm_files?: number;
  fix_swarm_failed?: string[];
  fix_swarm_at?: string;
}

export function CIFixSwarmStatus({ initiativeId }: CIFixSwarmStatusProps) {
  const [data, setData] = useState<CIData | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data: init } = await supabase
        .from("initiatives")
        .select("execution_progress")
        .eq("id", initiativeId)
        .single();
      if (init?.execution_progress && typeof init.execution_progress === "object") {
        setData(init.execution_progress as unknown as CIData);
      }
    };
    fetch();

    const channel = supabase
      .channel(`ci-status-${initiativeId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "initiatives",
        filter: `id=eq.${initiativeId}`,
      }, (payload) => {
        const ep = payload.new?.execution_progress;
        if (ep && typeof ep === "object") setData(ep as unknown as CIData);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [initiativeId]);

  if (!data?.ci_status) return null;

  const ciPassed = data.ci_status === "success";
  const ciFailed = data.ci_status === "failed";
  const fixRunning = data.fix_swarm_status === "running";
  const fixCompleted = data.fix_swarm_status === "completed";

  return (
    <Card className={`border-border/50 ${
      ciPassed ? "border-green-500/30 bg-green-500/5" :
      fixCompleted && data.fix_swarm_pr ? "border-blue-500/30 bg-blue-500/5" :
      ciFailed ? "border-destructive/30 bg-destructive/5" : ""
    }`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {ciPassed ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : fixRunning ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            ) : fixCompleted ? (
              <GitPullRequest className="h-4 w-4 text-blue-500" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            <span className="text-sm font-medium">
              {ciPassed ? "CI Passed" :
               fixRunning ? "Fix Swarm em andamento..." :
               fixCompleted ? "Fix Swarm concluído" :
               "CI Failed"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {data.ci_errors && data.ci_errors.length > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {data.ci_errors.length} erros
              </Badge>
            )}
            {fixCompleted && data.fix_swarm_files && (
              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                <Wrench className="h-2.5 w-2.5 mr-1" />
                {data.fix_swarm_files} corrigidos
              </Badge>
            )}
          </div>
        </div>

        {/* Fix Swarm PR link */}
        {data.fix_swarm_pr && (
          <a
            href={data.fix_swarm_pr}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 rounded px-2 py-1.5 transition-colors"
          >
            <GitPullRequest className="h-3.5 w-3.5" />
            <span className="font-medium">Ver Pull Request de correção</span>
            <ExternalLink className="h-3 w-3 ml-auto" />
          </a>
        )}

        {/* Failed fixes */}
        {data.fix_swarm_failed && data.fix_swarm_failed.length > 0 && (
          <div className="text-[10px] text-muted-foreground">
            <span className="text-destructive">Não corrigidos: </span>
            {data.fix_swarm_failed.join(", ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
