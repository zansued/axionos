import { useState } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { useEconomicOptimization } from "@/hooks/useEconomicOptimization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, ShieldAlert, BarChart3, Target, Activity, GitBranch, Layers, ArrowRightLeft, Eye } from "lucide-react";

export function EconomicOptimizationDashboard() {
  const { currentOrg } = useOrg();
  const {
    overview, health, migrationRoi, rolloutEconomics,
    tenantModeEconomics, assessChange, explainAssessment,
  } = useEconomicOptimization(currentOrg?.id);

  const ov = overview.data || {};
  const h = health.data || {};

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Economic Optimization
        </h2>
        <p className="text-sm text-muted-foreground">Advisory-first cost and ROI awareness across architecture changes.</p>
      </div>

      {/* Health Metrics */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <MetricCard label="Confidence Index" value={formatPct(h.economic_confidence_index)} icon={Target} />
        <MetricCard label="Tradeoff Index" value={formatPct(h.economic_tradeoff_index)} icon={BarChart3} />
        <MetricCard label="Forecast Accuracy" value={formatPct(h.forecast_accuracy_index)} icon={Activity} />
        <MetricCard label="Rec. Hit Rate" value={formatPct(h.recommendation_hit_rate)} icon={TrendingUp} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="migration">Migration ROI</TabsTrigger>
          <TabsTrigger value="rollout">Rollout Economics</TabsTrigger>
          <TabsTrigger value="tenant">Tenant Modes</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <OverviewSection ov={ov} />
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments">
          <AssessmentsSection ov={ov} onExplain={(a: any) => explainAssessment.mutate(a)} explanation={explainAssessment.data} />
        </TabsContent>

        {/* Migration ROI Tab */}
        <TabsContent value="migration">
          <MigrationROISection migrationRoi={migrationRoi} />
        </TabsContent>

        {/* Rollout Economics Tab */}
        <TabsContent value="rollout">
          <RolloutEconomicsSection rolloutEconomics={rolloutEconomics} />
        </TabsContent>

        {/* Tenant Mode Economics Tab */}
        <TabsContent value="tenant">
          <TenantModeSection tenantModeEconomics={tenantModeEconomics} />
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations">
          <RecommendationsSection ov={ov} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Sub-sections ---

function OverviewSection({ ov }: { ov: any }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Projected Savings</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-primary">${(ov.total_projected_savings || 0).toFixed(4)}</p>
          <p className="text-xs text-muted-foreground mt-1">{ov.total_assessments || 0} assessments</p>
        </CardContent>
      </Card>
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Cost Exposure</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-accent-foreground">${(ov.total_cost_exposure || 0).toFixed(4)}</p>
          <p className="text-xs text-muted-foreground mt-1">Avg confidence: {formatPct(ov.avg_confidence)}</p>
        </CardContent>
      </Card>
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Open Recommendations</CardTitle></CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-primary">{ov.open_recommendations || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">{ov.recent_outcomes || 0} recent outcomes</p>
        </CardContent>
      </Card>
    </div>
  );
}

function AssessmentsSection({ ov, onExplain, explanation }: { ov: any; onExplain: (a: any) => void; explanation: any }) {
  return (
    <div className="space-y-4">
      {(ov.recent_assessments || []).length > 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Recent Assessments</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(ov.recent_assessments || []).map((a: any, i: number) => (
                <div key={a.id || i} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{a.change_type}</Badge>
                    <Badge variant={a.status === "assessed" ? "default" : "secondary"} className="text-xs">{a.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Cost: ${(Number(a.projected_change_cost) || 0).toFixed(4)}</span>
                    <span>ROI 30d: {((Number(a.migration_roi_30d) || 0) * 100).toFixed(0)}%</span>
                    <span>Score: {((Number(a.economic_tradeoff_score) || 0) * 100).toFixed(0)}/100</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      onClick={() => onExplain({
                        change_type: a.change_type,
                        projected_change_cost: a.projected_change_cost,
                        projected_reliability_gain: a.projected_reliability_gain,
                        projected_stability_gain: a.projected_stability_gain,
                        rollback_cost: a.projected_rollback_cost,
                        tradeoff_score: a.economic_tradeoff_score,
                        confidence_score: a.economic_confidence_score,
                        roi_30d: a.migration_roi_30d,
                        roi_90d: a.migration_roi_90d,
                      })}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6 text-center text-muted-foreground text-sm">No assessments yet.</CardContent>
        </Card>
      )}

      {explanation?.explanation && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-sm">Explanation</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">{explanation.explanation.summary}</p>
            {explanation.explanation.sections?.map((s: any, i: number) => (
              <div key={i} className="p-2 rounded bg-muted/20">
                <p className="font-medium text-xs">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.content}</p>
              </div>
            ))}
            {explanation.explanation.safety_notes?.map((n: string, i: number) => (
              <p key={i} className="text-xs text-destructive flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> {n}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MigrationROISection({ migrationRoi }: { migrationRoi: any }) {
  const result = migrationRoi.data;

  return (
    <div className="space-y-4">
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4" /> Migration ROI Estimator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Estimate whether a migration is economically justified.</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => migrationRoi.mutate({
              implementation_cost: 0.5,
              rollback_cost: 0.15,
              projected_monthly_savings: 0.3,
              reliability_gain: 0.2,
              stability_gain: 0.15,
            })}
            disabled={migrationRoi.isPending}
          >
            {migrationRoi.isPending ? "Estimating..." : "Run Sample ROI Estimate"}
          </Button>

          {result && (
            <div className="space-y-2 mt-3">
              <div className="grid grid-cols-3 gap-2">
                <MiniMetric label="ROI 30d" value={`${((result.roi?.migration_roi_30d || 0) * 100).toFixed(0)}%`} />
                <MiniMetric label="ROI 90d" value={`${((result.roi?.migration_roi_90d || 0) * 100).toFixed(0)}%`} />
                <MiniMetric label="Break-even" value={result.roi?.break_even_days ? `${result.roi.break_even_days}d` : "N/A"} />
              </div>
              <Badge variant={result.justified ? "default" : "secondary"} className="text-xs">
                {result.recommendation}
              </Badge>
              <p className="text-xs text-muted-foreground">Confidence: {formatPct(result.confidence?.confidence_score)}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RolloutEconomicsSection({ rolloutEconomics }: { rolloutEconomics: any }) {
  const result = rolloutEconomics.data;

  return (
    <div className="space-y-4">
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4" /> Rollout Cost Envelope Planner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Compare conservative / balanced / aggressive rollout scenarios.</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => rolloutEconomics.mutate({
              total_projected_cost: 2.0,
              rollback_cost: 0.6,
            })}
            disabled={rolloutEconomics.isPending}
          >
            {rolloutEconomics.isPending ? "Planning..." : "Generate Rollout Scenarios"}
          </Button>

          {result?.scenarios && (
            <div className="grid md:grid-cols-3 gap-3 mt-3">
              {result.scenarios.map((s: any, i: number) => (
                <Card key={i} className="bg-muted/20 border-border/30">
                  <CardContent className="pt-3 pb-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs capitalize">{s.label}</Badge>
                      <span className="text-xs text-muted-foreground">{s.phases?.length || 0} phases</span>
                    </div>
                    <MiniMetric label="Budget Envelope" value={`$${(s.total_budget_envelope || 0).toFixed(4)}`} />
                    <MiniMetric label="Rollback Reserve" value={`$${(s.total_rollback_reserve || 0).toFixed(4)}`} />
                    <MiniMetric label="Confidence" value={formatPct(s.confidence_score)} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TenantModeSection({ tenantModeEconomics }: { tenantModeEconomics: any }) {
  const result = tenantModeEconomics.data;

  return (
    <div className="space-y-4">
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" /> Tenant Mode Economics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Evaluate specialization benefit vs fragmentation cost.</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => tenantModeEconomics.mutate({
              tenant_mode_count: 3,
              tenant_count: 10,
              avg_mode_divergence: 0.3,
              avg_mode_adoption: 0.6,
              reliability_delta: 0.15,
              stability_delta: 0.1,
              base_operating_cost: 5.0,
            })}
            disabled={tenantModeEconomics.isPending}
          >
            {tenantModeEconomics.isPending ? "Analyzing..." : "Run Fragmentation Analysis"}
          </Button>

          {result?.analysis && (
            <div className="space-y-2 mt-3">
              <div className="grid grid-cols-2 gap-2">
                <MiniMetric label="Fragmentation" value={formatPct(result.analysis.fragmentation_score)} />
                <MiniMetric label="Specialization Benefit" value={formatPct(result.analysis.specialization_benefit)} />
                <MiniMetric label="Net Economic Value" value={`$${(result.analysis.net_economic_value || 0).toFixed(4)}`} />
                <MiniMetric label="Coordination Overhead" value={`$${(result.analysis.coordination_overhead || 0).toFixed(4)}`} />
              </div>
              <Badge variant={result.analysis.net_economic_value > 0 ? "default" : "secondary"} className="text-xs">
                Divergence Risk: {result.analysis.divergence_risk}
              </Badge>
              <p className="text-xs text-muted-foreground">{result.advisory}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RecommendationsSection({ ov }: { ov: any }) {
  return (
    <>
      {(ov.top_recommendations || []).length > 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Top Recommendations</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(ov.top_recommendations || []).map((rec: any, i: number) => (
                <div key={rec.id || i} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{rec.recommendation_type}</Badge>
                    <span className="text-muted-foreground">{rec.target_scope}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">EV: ${(rec.expected_value || 0).toFixed(4)}</span>
                    <Badge variant="secondary" className="text-xs">{formatPct(rec.confidence_score)} conf</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6 text-center text-muted-foreground text-sm">No open recommendations.</CardContent>
        </Card>
      )}
    </>
  );
}

// --- Shared components ---

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function formatPct(v: number | undefined): string {
  if (v === undefined || v === null) return "—";
  return `${Math.round(v * 100)}%`;
}
