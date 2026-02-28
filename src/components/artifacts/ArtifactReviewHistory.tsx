import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Send, Rocket, MessageSquare, RotateCcw, Eye, Clock } from "lucide-react";

const ACTION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  submit_review: { label: "Enviado p/ Revisão", icon: Eye, color: "text-yellow-400" },
  approve: { label: "Aprovado", icon: CheckCircle2, color: "text-green-400" },
  reject: { label: "Rejeitado", icon: XCircle, color: "text-destructive" },
  request_changes: { label: "Alterações Solicitadas", icon: RotateCcw, color: "text-orange-400" },
  deploy: { label: "Deployed", icon: Rocket, color: "text-blue-400" },
  comment: { label: "Comentário", icon: MessageSquare, color: "text-muted-foreground" },
};

interface Props {
  outputId: string;
}

export function ArtifactReviewHistory({ outputId }: Props) {
  const { data: reviews = [] } = useQuery({
    queryKey: ["artifact-reviews", outputId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artifact_reviews")
        .select("*")
        .eq("output_id", outputId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (reviews.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
        <Clock className="h-3.5 w-3.5" />
        <span>Nenhuma ação de revisão registrada</span>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[300px]">
      <div className="space-y-2.5 py-1">
        {reviews.map((review: any) => {
          const config = ACTION_CONFIG[review.action] || ACTION_CONFIG.comment;
          const Icon = config.icon;
          return (
            <div key={review.id} className="flex gap-2.5 text-xs">
              <div className="flex flex-col items-center pt-0.5">
                <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                <div className="w-px flex-1 bg-border/50 mt-1" />
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] font-normal">
                    {config.label}
                  </Badge>
                  <span className="text-muted-foreground text-[10px]">
                    {new Date(review.created_at).toLocaleString("pt-BR", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
                {review.comment && (
                  <p className="mt-1 text-foreground/80 leading-relaxed">{review.comment}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
