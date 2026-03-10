import { AppLayout } from "@/components/AppLayout";
import { useAdaptiveResourceRouter } from "@/hooks/useAdaptiveResourceRouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Route, ShieldCheck, Zap, Activity } from "lucide-react";

export default function AdaptiveRoutingDashboard() {
  const { profiles, metrics, metricsLoading, computeProfile } = useAdaptiveResourceRouter();

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Adaptive Routing</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Dynamic resource routing based on posture and attention signals
            </p>
          </div>
          <Button onClick={() => computeProfile.mutate({})} disabled={computeProfile.isPending}>
            {computeProfile.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Route className="h-4 w-4 mr-2" />
            )}
            Compute Profiles
          </Button>
        </div>

        {/* Summary metrics */}
        {!metricsLoading && metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Profiles" value={metrics.total_profiles} icon={<Activity className="h-4 w-4 text-muted-foreground" />} />
            <MetricCard title="Avg Publish Mod." value={metrics.average_publish_modifier?.toFixed(3)} icon={<Zap className="h-4 w-4 text-primary" />} />
            <MetricCard
              title="High Repair"
              value={Object.entries(metrics.repair_priority_distribution || {}).filter(([k]) => k === "critical" || k === "high").reduce((s, [, v]) => s + (v as number), 0)}
              icon={<ShieldCheck className="h-4 w-4 text-destructive" />}
            />
            <MetricCard
              title="Deep Validation"
              value={Object.entries(metrics.validation_depth_distribution || {}).filter(([k]) => k === "maximum" || k === "deep").reduce((s, [, v]) => s + (v as number), 0)}
              icon={<ShieldCheck className="h-4 w-4 text-primary" />}
            />
          </div>
        )}

        {/* Distribution cards */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DistributionCard title="Validation Depth" data={metrics.validation_depth_distribution} />
            <DistributionCard title="Repair Priority" data={metrics.repair_priority_distribution} />
            <DistributionCard title="Attention Level" data={metrics.attention_level_distribution} />
          </div>
        )}

        {/* Profiles list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Routing Profiles</CardTitle>
            <CardDescription>Per-domain routing adjustments</CardDescription>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : profiles.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No routing profiles yet. Click "Compute Profiles" to generate.
              </p>
            ) : (
              <div className="space-y-3">
                {profiles.map((p: any) => (
                  <ProfileRow key={p.profile_id} profile={p} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
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

function DistributionCard({ title, data }: { title: string; data?: Record<string, number> }) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {Object.entries(data).sort(([, a], [, b]) => b - a).map(([key, count]) => (
            <Badge key={key} variant="secondary" className="text-xs">
              {key}: {count}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileRow({ profile }: { profile: any }) {
  const adjustments = profile.adjustments_applied || [];
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm text-foreground">{profile.domain_id}</span>
        <div className="flex gap-1.5">
          <Badge variant="outline" className="text-[10px]">{profile.posture_state}</Badge>
          <Badge variant="secondary" className="text-[10px]">{profile.attention_level}</Badge>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>Validation: <strong className="text-foreground">{profile.validation_depth}</strong></span>
        <span>Repair: <strong className="text-foreground">{profile.repair_priority}</strong></span>
        <span>Publish mod: <strong className="text-foreground">{Number(profile.publish_threshold_modifier).toFixed(2)}</strong></span>
      </div>
      {adjustments.length > 0 && (
        <ul className="text-xs text-muted-foreground list-disc list-inside">
          {adjustments.map((a: string, i: number) => <li key={i}>{a}</li>)}
        </ul>
      )}
    </div>
  );
}
