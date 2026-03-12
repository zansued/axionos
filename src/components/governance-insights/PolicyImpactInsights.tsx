import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PolicyImpactData } from "@/hooks/useGovernanceInsightsData";
import { Shield, Lock, UserCheck, RotateCcw } from "lucide-react";

export function PolicyImpactInsights({ data }: { data: PolicyImpactData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Summary */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Policy Enforcement Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/40 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-foreground">{data.totalEnforcements}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Total Enforcements</p>
            </div>
            <div className="bg-destructive/5 rounded-lg p-3 text-center border border-destructive/10">
              <Lock className="h-3.5 w-3.5 mx-auto text-destructive mb-1" />
              <p className="text-xl font-bold text-destructive">{data.blockedByPolicy}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Blocked by Policy</p>
            </div>
            <div className="bg-yellow-500/5 rounded-lg p-3 text-center border border-yellow-500/10">
              <UserCheck className="h-3.5 w-3.5 mx-auto text-yellow-500 mb-1" />
              <p className="text-xl font-bold text-yellow-500">{data.approvalRequired}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Approval Required</p>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <RotateCcw className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
              <p className="text-xl font-bold text-muted-foreground">{data.overrideCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Overrides</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdowns */}
      <Card className="border-border/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(data.byRiskLevel).length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase mb-2 font-medium">By Risk Level</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(data.byRiskLevel).map(([level, count]) => (
                  <Badge key={level} variant={level === "critical" || level === "high" ? "destructive" : "secondary"} className="text-[10px]">
                    {level}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {Object.keys(data.byStage).length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase mb-2 font-medium">By Stage</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(data.byStage).map(([stage, count]) => (
                  <Badge key={stage} variant="outline" className="text-[10px]">
                    {stage}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {Object.keys(data.byRiskLevel).length === 0 && Object.keys(data.byStage).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No policy enforcement data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
