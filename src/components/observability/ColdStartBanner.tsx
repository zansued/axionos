import { AlertTriangle, Info, Snowflake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ColdStartLabel, ColdStartSignal } from "@/hooks/useColdStart";

const labelConfig: Record<ColdStartLabel, { icon: typeof AlertTriangle; color: string; badgeVariant: "destructive" | "outline" | "secondary" | "default"; text: string }> = {
  cold_start: { icon: Snowflake, color: "text-destructive", badgeVariant: "destructive", text: "Cold Start" },
  insufficient_history: { icon: AlertTriangle, color: "text-destructive", badgeVariant: "destructive", text: "Insufficient History" },
  low_confidence: { icon: Info, color: "text-yellow-500", badgeVariant: "outline", text: "Low Confidence" },
  ready: { icon: Info, color: "text-primary", badgeVariant: "default", text: "Ready" },
};

interface ColdStartBannerProps {
  label: ColdStartLabel;
  summary: string;
  signals: ColdStartSignal[];
}

export function ColdStartBanner({ label, summary, signals }: ColdStartBannerProps) {
  if (label === "ready") return null;

  const config = labelConfig[label];
  const Icon = config.icon;
  const unmetSignals = signals.filter((s) => !s.met);

  return (
    <Card className="border-border/50 bg-muted/30">
      <CardContent className="pt-4 pb-3">
        <Collapsible>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center gap-3">
              <Icon className={`h-5 w-5 ${config.color} shrink-0`} />
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <Badge variant={config.badgeVariant} className="text-[10px]">{config.text}</Badge>
                  <span className="text-xs text-muted-foreground">Click for details</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{summary}</p>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 space-y-1.5 pl-8">
              {unmetSignals.map((s) => (
                <div key={s.dimension} className="flex items-center gap-2 text-xs">
                  <span className="text-destructive">✗</span>
                  <span className="text-muted-foreground">{s.explanation}</span>
                  <span className="ml-auto font-mono text-muted-foreground">
                    {s.current_value}/{s.required_value}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
