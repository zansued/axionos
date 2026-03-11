import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldAlert, MapIcon, Target, Flame, Network, FileWarning } from "lucide-react";
import { useSecurityIntelligence } from "@/hooks/useSecurityIntelligence";

export default function SecurityIntelligenceDashboard() {
  const { overview, canonicalSurfaces, threatClassification, exposureScores, loading } = useSecurityIntelligence();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5 font-['Space_Grotesk']">
              <ShieldAlert className="h-6 w-6 text-primary" />
              Security Intelligence
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Security surface mapping, threat domain classification, and exposure analysis — advisory only
            </p>
          </div>

          {/* Top Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            <TopMetric value={overview.totalSurfaces} label="Surfaces Mapped" />
            <TopMetric value={overview.totalThreats} label="Threat Domains" />
            <TopMetric value={overview.criticalExposures} label="Critical Exposures" warn={overview.criticalExposures > 0} />
            <TopMetric value={overview.pendingReviews} label="Pending Reviews" warn={overview.pendingReviews > 0} />
            <TopMetric value={canonicalSurfaces.length} label="Canonical Surfaces" accent />
            <TopMetric value={threatClassification.length} label="Classified Threats" accent />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="surfaces" className="space-y-4">
            <TabsList className="bg-muted/20 border border-border/20 flex-wrap h-auto gap-0.5 p-1">
              <TabsTrigger value="surfaces" className="text-xs gap-1.5"><MapIcon className="h-3.5 w-3.5" />Surface Map</TabsTrigger>
              <TabsTrigger value="threats" className="text-xs gap-1.5"><Target className="h-3.5 w-3.5" />Threat Domains</TabsTrigger>
              <TabsTrigger value="exposure" className="text-xs gap-1.5"><Flame className="h-3.5 w-3.5" />Exposure Heatmap</TabsTrigger>
              <TabsTrigger value="boundaries" className="text-xs gap-1.5"><Network className="h-3.5 w-3.5" />Boundary Explorer</TabsTrigger>
              <TabsTrigger value="contracts" className="text-xs gap-1.5"><FileWarning className="h-3.5 w-3.5" />Contract Risk</TabsTrigger>
            </TabsList>

            {/* Surface Map */}
            <TabsContent value="surfaces">
              <SurfaceMapTab surfaces={overview.surfaces} canonicalSurfaces={canonicalSurfaces} loading={loading} />
            </TabsContent>

            {/* Threat Domains */}
            <TabsContent value="threats">
              <ThreatDomainsTab threats={threatClassification} dbThreats={overview.threats} />
            </TabsContent>

            {/* Exposure Heatmap */}
            <TabsContent value="exposure">
              <ExposureHeatmapTab exposures={exposureScores} dbExposures={overview.exposures} />
            </TabsContent>

            {/* Boundary Explorer */}
            <TabsContent value="boundaries">
              <BoundaryExplorerTab
                tenantBoundaries={overview.tenantBoundaries}
                runtimeBoundaries={overview.runtimeBoundaries}
              />
            </TabsContent>

            {/* Contract Risk */}
            <TabsContent value="contracts">
              <ContractRiskTab contracts={overview.contracts} reviews={overview.reviews} />
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

/* ─── Surface Map Tab ─────────────────────────────────────────────────────── */

function SurfaceMapTab({ surfaces, canonicalSurfaces, loading }: { surfaces: any[]; canonicalSurfaces: any[]; loading: boolean }) {
  const allSurfaces = surfaces.length > 0 ? surfaces : canonicalSurfaces;
  const layers = new globalThis.Map<string, any[]>();
  allSurfaces.forEach((s: any) => {
    const l = s.owning_layer || "unknown";
    layers.set(l, [...(layers.get(l) || []), s]);
  });

  return (
    <Card className="border-border/40 bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><MapIcon className="h-4 w-4 text-primary" />Security Surface Map</CardTitle>
        <CardDescription>All mapped security surfaces organized by owning layer</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading surfaces...</p>
        ) : allSurfaces.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No surfaces mapped yet.</p>
        ) : (
          <ScrollArea className="h-[480px]">
            <div className="space-y-5">
              {[...layers.entries()].map(([layer, items]) => (
                <div key={layer} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">{layer}</h3>
                    <span className="text-[10px] text-muted-foreground">({items.length})</span>
                  </div>
                  <div className="ml-4 border-l border-border/30 pl-4 space-y-1.5">
                    {items.map((s: any, i: number) => (
                      <div key={s.id || i} className="p-3 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/15 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{s.surface_name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{s.surface_type} · {s.threat_domain}</p>
                          </div>
                          <ExposureBadge score={s.exposure_score} />
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/60">
                          <span>Blast: {Math.round((s.blast_radius_estimate || 0) * 100)}%</span>
                          <span>Tenant: {Math.round((s.tenant_sensitivity || 0) * 100)}%</span>
                          <span>Rollback: {Math.round((s.rollback_sensitivity || 0) * 100)}%</span>
                          {s.related_agent_type && <span>Agent: {s.related_agent_type}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Threat Domains Tab ──────────────────────────────────────────────────── */

function ThreatDomainsTab({ threats, dbThreats }: { threats: any[]; dbThreats: any[] }) {
  const allThreats = dbThreats.length > 0 ? dbThreats : threats;

  const SEVERITY_COLORS: Record<string, string> = {
    critical: "bg-destructive/20 text-destructive border-destructive/30",
    high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <Card className="border-border/40 bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Threat Domains</CardTitle>
        <CardDescription>Classified threat domains with severity, likelihood, and impact scores</CardDescription>
      </CardHeader>
      <CardContent>
        {allThreats.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No threat domains classified.</p>
        ) : (
          <ScrollArea className="h-[480px]">
            <div className="space-y-2">
              {allThreats.map((t: any, i: number) => (
                <div key={t.id || i} className="p-4 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/15 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{t.threat_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${SEVERITY_COLORS[t.severity] || SEVERITY_COLORS.medium}`}>
                      {t.severity}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground/60">
                    <span>Likelihood: {Math.round((t.likelihood_score || 0) * 100)}%</span>
                    <span>Impact: {Math.round((t.impact_score || 0) * 100)}%</span>
                    <span>Composite: {Math.round((t.composite_risk || t.likelihood_score * t.impact_score || 0) * 100)}%</span>
                    <Badge variant="outline" className={`text-[9px] ${t.mitigation_posture === "mitigated" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : t.mitigation_posture === "partially_mitigated" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-destructive/20 text-destructive border-destructive/30"}`}>
                      {t.mitigation_posture}
                    </Badge>
                  </div>
                  {(t.affected_layers?.length > 0 || t.affected_agent_types?.length > 0) && (
                    <div className="flex items-center gap-1.5 mt-2">
                      {t.affected_layers?.map((l: string) => <Badge key={l} variant="outline" className="text-[9px]">{l}</Badge>)}
                      {t.affected_agent_types?.map((a: string) => <Badge key={a} variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">{a}</Badge>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Exposure Heatmap Tab ────────────────────────────────────────────────── */

function ExposureHeatmapTab({ exposures, dbExposures }: { exposures: any[]; dbExposures: any[] }) {
  const allExposures = dbExposures.length > 0 ? dbExposures : exposures;
  const sorted = [...allExposures].sort((a: any, b: any) => (b.composite_risk || 0) - (a.composite_risk || 0));

  return (
    <Card className="border-border/40 bg-card/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Flame className="h-4 w-4 text-primary" />Exposure Heatmap</CardTitle>
        <CardDescription>Composite risk scores ranked by severity — highest risk first</CardDescription>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No exposure data computed yet.</p>
        ) : (
          <ScrollArea className="h-[480px]">
            <div className="space-y-2">
              {sorted.map((e: any, i: number) => {
                const risk = e.composite_risk || 0;
                const barWidth = Math.max(5, Math.round(risk * 100));
                const barColor = risk >= 0.75 ? "bg-destructive" : risk >= 0.5 ? "bg-amber-500" : risk >= 0.25 ? "bg-yellow-500" : "bg-emerald-500";
                return (
                  <div key={e.surface_id || e.id || i} className="p-3 rounded-lg border border-border/30 bg-muted/10">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium truncate flex-1">{e.surface_name || `Surface ${i + 1}`}</p>
                      <RiskClassBadge riskClass={e.risk_class || (risk >= 0.75 ? "critical" : risk >= 0.5 ? "high" : risk >= 0.25 ? "moderate" : "low")} />
                    </div>
                    <div className="w-full bg-muted/30 rounded-full h-2">
                      <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${barWidth}%` }} />
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-[10px] text-muted-foreground/60">
                      <span>Risk: {Math.round(risk * 100)}%</span>
                      {e.blast_radius_weighted !== undefined && <span>Blast: {Math.round(e.blast_radius_weighted * 100)}%</span>}
                      {e.tenant_impact !== undefined && <span>Tenant: {Math.round(e.tenant_impact * 100)}%</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Boundary Explorer Tab ───────────────────────────────────────────────── */

function BoundaryExplorerTab({ tenantBoundaries, runtimeBoundaries }: { tenantBoundaries: any[]; runtimeBoundaries: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tenant Boundaries</CardTitle>
          <CardDescription className="text-xs">Tenant isolation surfaces and RLS coverage</CardDescription>
        </CardHeader>
        <CardContent>
          {tenantBoundaries.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No tenant boundaries mapped yet.</p>
          ) : (
            <ScrollArea className="h-[360px]">
              <div className="space-y-1.5">
                {tenantBoundaries.map((b: any) => (
                  <div key={b.id} className="p-3 rounded border border-border/20 bg-muted/10">
                    <p className="text-xs font-medium">{b.boundary_name}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/60">
                      <span>Isolation: {Math.round(b.isolation_strength * 100)}%</span>
                      <span>RLS: {Math.round(b.rls_coverage * 100)}%</span>
                      <span>Cross-tenant risk: {Math.round(b.cross_tenant_risk * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Runtime Boundaries</CardTitle>
          <CardDescription className="text-xs">Runtime security boundaries and gate requirements</CardDescription>
        </CardHeader>
        <CardContent>
          {runtimeBoundaries.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No runtime boundaries mapped yet.</p>
          ) : (
            <ScrollArea className="h-[360px]">
              <div className="space-y-1.5">
                {runtimeBoundaries.map((b: any) => (
                  <div key={b.id} className="p-3 rounded border border-border/20 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">{b.boundary_name}</p>
                      <Badge variant="outline" className={`text-[9px] ${b.risk_level === "high" ? "bg-destructive/20 text-destructive border-destructive/30" : b.risk_level === "medium" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-muted text-muted-foreground"}`}>
                        {b.risk_level}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/60">
                      <span>{b.boundary_layer}</span>
                      {b.agent_type && <span>{b.agent_type}</span>}
                      {b.rollback_available && <Badge variant="outline" className="text-[9px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">rollback</Badge>}
                      {b.governance_gate_required && <Badge variant="outline" className="text-[9px] bg-primary/20 text-primary border-primary/30">gate required</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Contract Risk Tab ───────────────────────────────────────────────────── */

function ContractRiskTab({ contracts, reviews }: { contracts: any[]; reviews: any[] }) {
  return (
    <div className="space-y-4">
      <Card className="border-border/40 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileWarning className="h-4 w-4 text-primary" />Contract Risk Profiles</CardTitle>
          <CardDescription>Agent contract risk across permission, governance, tenant, and deployment dimensions</CardDescription>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No contract risk profiles computed yet.</p>
          ) : (
            <ScrollArea className="h-[380px]">
              <div className="space-y-2">
                {contracts.map((c: any) => (
                  <div key={c.id} className="p-4 rounded-lg border border-border/30 bg-muted/10 hover:bg-muted/15 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{c.contract_type}</p>
                          <Badge variant="outline" className="text-[10px]">{c.agent_type}</Badge>
                        </div>
                      </div>
                      <ExposureBadge score={c.risk_score} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
                      <MiniMetric label="Permission" value={Math.round(c.permission_sensitivity * 100)} />
                      <MiniMetric label="Governance" value={Math.round(c.governance_boundary_score * 100)} />
                      <MiniMetric label="Tenant" value={Math.round(c.tenant_boundary_score * 100)} />
                      <MiniMetric label="Validation" value={Math.round(c.validation_bypass_risk * 100)} />
                      <MiniMetric label="Deploy" value={Math.round(c.deployment_risk * 100)} />
                    </div>
                    {c.threat_domains?.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        {c.threat_domains.map((t: string) => <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Reviews */}
      {reviews.length > 0 && (
        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Surface Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {reviews.slice(0, 10).map((r: any) => (
                <div key={r.id} className="p-2 rounded border border-border/20 bg-muted/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[9px] ${r.verdict === "approved" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : r.verdict === "rejected" ? "bg-destructive/20 text-destructive border-destructive/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"}`}>
                      {r.verdict}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{r.review_notes || "—"}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground/50">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Shared Components ───────────────────────────────────────────────────── */

function TopMetric({ value, label, accent, warn }: { value: number; label: string; accent?: boolean; warn?: boolean }) {
  const color = warn ? "text-amber-400" : accent ? "text-primary" : "text-foreground";
  return (
    <Card className="border-border/30 bg-card/40 hover:bg-card/60 transition-colors">
      <CardContent className="pt-3.5 pb-2.5 text-center">
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5 truncate">{label}</p>
      </CardContent>
    </Card>
  );
}

function ExposureBadge({ score }: { score: number }) {
  const pct = Math.round((score || 0) * 100);
  const cls = pct >= 75 ? "bg-destructive/20 text-destructive border-destructive/30" :
    pct >= 50 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
    pct >= 25 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  return <Badge variant="outline" className={`text-[10px] shrink-0 ${cls}`}>{pct}%</Badge>;
}

function RiskClassBadge({ riskClass }: { riskClass: string }) {
  const cls: Record<string, string> = {
    critical: "bg-destructive/20 text-destructive border-destructive/30",
    high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    moderate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };
  return <Badge variant="outline" className={`text-[10px] ${cls[riskClass] || cls.low}`}>{riskClass}</Badge>;
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "text-destructive" : value >= 40 ? "text-amber-400" : "text-emerald-400";
  return (
    <div className="text-center p-1.5 rounded border border-border/20 bg-muted/5">
      <p className={`text-xs font-bold ${color}`}>{value}%</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}
