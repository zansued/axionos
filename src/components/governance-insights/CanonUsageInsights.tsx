import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CanonUsageData } from "@/hooks/useGovernanceInsightsData";
import { BookOpen, TrendingUp, AlertTriangle, MinusCircle } from "lucide-react";

function PatternList({ patterns, emptyMsg }: { patterns: { id: string; title: string; type: string; usageCount: number; successCorrelation: number }[]; emptyMsg: string }) {
  if (patterns.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-3">{emptyMsg}</p>;
  }
  return (
    <div className="space-y-2">
      {patterns.map(p => (
        <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/30">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{p.title}</p>
            <p className="text-[10px] text-muted-foreground">{p.type.replace(/_/g, " ")}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Badge variant="secondary" className="text-[10px]">{p.usageCount}x used</Badge>
            <Badge variant={p.successCorrelation >= 0.7 ? "secondary" : "destructive"} className="text-[10px]">
              {(p.successCorrelation * 100).toFixed(0)}% corr
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CanonUsageInsights({ data }: { data: CanonUsageData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Summary */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Canon Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-secondary/40 rounded-lg p-2.5 text-center">
              <p className="text-lg font-bold text-foreground">{data.totalEntries}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Total</p>
            </div>
            <div className="bg-emerald-500/5 rounded-lg p-2.5 text-center">
              <p className="text-lg font-bold text-emerald-500">{data.activeEntries}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Active</p>
            </div>
            <div className="bg-muted rounded-lg p-2.5 text-center">
              <p className="text-lg font-bold text-muted-foreground">{data.deprecatedEntries}</p>
              <p className="text-[9px] text-muted-foreground uppercase">Deprecated</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Used */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Most Effective Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PatternList patterns={data.topUsedPatterns} emptyMsg="No usage data available" />
        </CardContent>
      </Card>

      {/* Issues */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Attention Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.failureLinkedPatterns.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase mb-1.5 font-medium">Failure-Linked</p>
              <PatternList patterns={data.failureLinkedPatterns} emptyMsg="" />
            </div>
          )}
          {data.underusedPatterns.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase mb-1.5 font-medium flex items-center gap-1">
                <MinusCircle className="h-3 w-3" /> Underused
              </p>
              <PatternList patterns={data.underusedPatterns} emptyMsg="" />
            </div>
          )}
          {data.failureLinkedPatterns.length === 0 && data.underusedPatterns.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">No canon issues detected</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
