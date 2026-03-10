import { AppLayout } from "@/components/AppLayout";
import { useAttentionAllocation } from "@/hooks/useAttentionAllocation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Focus, TrendingUp, Activity, Zap } from "lucide-react";

export default function AttentionAllocationDashboard() {
  const { domains, domainsLoading, metrics, metricsLoading, computeAttention } =
    useAttentionAllocation();

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">System Attention Map</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Dynamic attention allocation across operational domains
            </p>
          </div>
          <Button
            onClick={() => computeAttention.mutate({})}
            disabled={computeAttention.isPending}
          >
            {computeAttention.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Focus className="h-4 w-4 mr-2" />
            )}
            Compute Attention
          </Button>
        </div>

        {/* Metrics summary */}
        {!metricsLoading && metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Domains"
              value={metrics.total_domains}
              icon={<Activity className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              title="High Attention"
              value={metrics.high_attention}
              icon={<Zap className="h-4 w-4 text-destructive" />}
            />
            <MetricCard
              title="Medium Attention"
              value={metrics.medium_attention}
              icon={<TrendingUp className="h-4 w-4 text-primary" />}
            />
            <MetricCard
              title="Avg Score"
              value={metrics.average_score?.toFixed(2)}
              icon={<Focus className="h-4 w-4 text-muted-foreground" />}
            />
          </div>
        )}

        {/* Signal source distribution */}
        {metrics?.signal_source_distribution &&
          Object.keys(metrics.signal_source_distribution).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Signal Source Distribution</CardTitle>
                <CardDescription>Which signals are driving attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(metrics.signal_source_distribution as Record<string, number>)
                    .sort(([, a], [, b]) => b - a)
                    .map(([source, count]) => (
                      <Badge key={source} variant="secondary" className="text-xs">
                        {source.replace(/_/g, " ")}: {count}
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Domains list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attention Domains</CardTitle>
            <CardDescription>Domains ranked by attention priority</CardDescription>
          </CardHeader>
          <CardContent>
            {domainsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : domains.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No attention domains computed yet. Click "Compute Attention" to generate the map.
              </p>
            ) : (
              <div className="space-y-3">
                {domains.map((d: any) => (
                  <DomainRow key={d.allocation_id} domain={d} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function DomainRow({ domain }: { domain: any }) {
  const score = Number(domain.attention_score);
  const level = score >= 0.7 ? "high" : score >= 0.4 ? "medium" : "low";
  const badgeVariant = level === "high" ? "destructive" : level === "medium" ? "default" : "secondary";

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm text-foreground">{domain.domain_id}</span>
        <Badge variant={badgeVariant} className="text-xs">
          {level} — {(score * 100).toFixed(0)}%
        </Badge>
      </div>
      <Progress value={score * 100} className="h-1.5" />
      {domain.attention_reason && (
        <p className="text-xs text-muted-foreground">{domain.attention_reason}</p>
      )}
      {domain.signal_sources?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {domain.signal_sources.map((s: string) => (
            <Badge key={s} variant="outline" className="text-[10px]">
              {s.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
