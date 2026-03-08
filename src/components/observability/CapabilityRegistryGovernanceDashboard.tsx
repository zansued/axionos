import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PackageCheck, Layers, Eye, ShieldCheck, GitBranch, FileCheck, ClipboardList } from "lucide-react";
import { useCapabilityRegistryGovernance } from "@/hooks/useCapabilityRegistryGovernance";
import { EmptyState, StatCard } from "@/components/workspace/WorkspaceShared";

export function CapabilityRegistryGovernanceDashboard() {
  const { overview, entries, versions, visibility, policyBindings, compatibility, reviewQueue, outcomes } = useCapabilityRegistryGovernance();
  const ov = overview.data as Record<string, any> | null;
  const caps = (entries.data as any)?.entries || [];
  const vers = (versions.data as any)?.versions || [];
  const visRules = (visibility.data as any)?.visibility_rules || [];
  const polBinds = (policyBindings.data as any)?.policy_bindings || [];
  const compatRules = (compatibility.data as any)?.compatibility_rules || [];
  const queue = (reviewQueue.data as any)?.review_queue || [];
  const outs = (outcomes.data as any)?.outcomes || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PackageCheck className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Capability Registry Governance</h2>
          <p className="text-sm text-muted-foreground">Governed registry lifecycle — registry presence ≠ broad availability</p>
        </div>
        <Badge variant="outline" className="ml-auto border-emerald-500/30 text-emerald-400">Registry Bounded</Badge>
      </div>

      {ov && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
          <StatCard label="Entries" value={ov.total_entries ?? 0} />
          <StatCard label="Versions" value={ov.total_versions ?? 0} />
          <StatCard label="Visibility Rules" value={ov.total_visibility_rules ?? 0} />
          <StatCard label="Policy Bindings" value={ov.total_policy_bindings ?? 0} />
          <StatCard label="Compat Rules" value={ov.total_compatibility_rules ?? 0} />
          <StatCard label="Outcomes" value={ov.total_outcomes ?? 0} />
        </div>
      )}

      <Tabs defaultValue="catalog">
        <TabsList className="grid w-full grid-cols-7 h-9">
          <TabsTrigger value="catalog" className="text-xs gap-1"><Layers className="h-3 w-3" /> Catalog</TabsTrigger>
          <TabsTrigger value="versions" className="text-xs gap-1"><GitBranch className="h-3 w-3" /> Versions</TabsTrigger>
          <TabsTrigger value="visibility" className="text-xs gap-1"><Eye className="h-3 w-3" /> Visibility</TabsTrigger>
          <TabsTrigger value="policies" className="text-xs gap-1"><ShieldCheck className="h-3 w-3" /> Policies</TabsTrigger>
          <TabsTrigger value="compat" className="text-xs gap-1"><GitBranch className="h-3 w-3" /> Compat</TabsTrigger>
          <TabsTrigger value="review" className="text-xs gap-1"><ClipboardList className="h-3 w-3" /> Review</TabsTrigger>
          <TabsTrigger value="outcomes" className="text-xs gap-1"><FileCheck className="h-3 w-3" /> Outcomes</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-4 space-y-3">
          {caps.length === 0 ? (
            <EmptyState icon={Layers} text="No capabilities registered." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {caps.slice(0, 20).map((c: any) => (
                <Card key={c.id} className="border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{c.capability_name}</p>
                      <LifecycleBadge state={c.lifecycle_state} />
                    </div>
                    <p className="text-xs text-muted-foreground">{c.capability_domain} · {c.capability_type} · {c.exposure_class}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <MetricBar label="Governance" value={c.governance_score} />
                      <MetricBar label="Health" value={c.registry_health_score} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="versions" className="mt-4 space-y-3">
          {vers.length === 0 ? (
            <EmptyState icon={GitBranch} text="No versions recorded." />
          ) : (
            <div className="space-y-2">
              {vers.slice(0, 20).map((v: any) => (
                <Card key={v.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{v.capability_registry_entries?.capability_name} · {v.version_label}</p>
                      <div className="flex gap-3 mt-1">
                        <MetricPill label="Validity" value={v.version_validity_score} />
                        <MetricPill label="Compat" value={v.compatibility_score} />
                        <MetricPill label="Deprec" value={v.deprecation_pressure_score} />
                      </div>
                    </div>
                    <StatusBadge status={v.version_status} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="visibility" className="mt-4 space-y-3">
          {visRules.length === 0 ? (
            <EmptyState icon={Eye} text="No visibility rules defined." />
          ) : (
            <div className="space-y-2">
              {visRules.slice(0, 20).map((r: any) => (
                <Card key={r.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{r.capability_registry_entries?.capability_name}</p>
                      <p className="text-xs text-muted-foreground">Level: {r.visibility_level} · Trust: {r.trust_tier_filter} · Scope: {r.scope_filter}</p>
                    </div>
                    <MetricPill label="Disc" value={r.discoverability_score} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="policies" className="mt-4 space-y-3">
          {polBinds.length === 0 ? (
            <EmptyState icon={ShieldCheck} text="No policy bindings." />
          ) : (
            <div className="space-y-2">
              {polBinds.slice(0, 20).map((b: any) => (
                <Card key={b.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{b.capability_registry_entries?.capability_name} → {b.policy_set_name}</p>
                      <p className="text-xs text-muted-foreground">Restriction: {b.restriction_inherited} · Status: {b.binding_status}</p>
                    </div>
                    <MetricPill label="Bind" value={b.policy_binding_score} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="compat" className="mt-4 space-y-3">
          {compatRules.length === 0 ? (
            <EmptyState icon={GitBranch} text="No compatibility rules." />
          ) : (
            <div className="space-y-2">
              {compatRules.slice(0, 20).map((r: any) => (
                <Card key={r.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{r.capability_registry_entries?.capability_name} ↔ {r.target_capability_name}</p>
                      <p className="text-xs text-muted-foreground">{r.compatibility_type} · Seq: {r.sequencing_constraint}</p>
                    </div>
                    <div className="flex gap-2">
                      <MetricPill label="Compat" value={r.compatibility_score} />
                      <MetricPill label="DepSens" value={r.dependency_sensitivity_score} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="review" className="mt-4 space-y-3">
          {queue.length === 0 ? (
            <EmptyState icon={ClipboardList} text="No pending reviews." />
          ) : (
            <div className="space-y-2">
              {queue.map((e: any) => (
                <Card key={e.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{e.capability_name}</p>
                      <p className="text-xs text-muted-foreground">{e.capability_domain} · {e.lifecycle_state}</p>
                    </div>
                    <StatusBadge status={e.registry_status} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="outcomes" className="mt-4 space-y-3">
          {outs.length === 0 ? (
            <EmptyState icon={FileCheck} text="No outcomes recorded." />
          ) : (
            <div className="space-y-2">
              {outs.map((o: any) => (
                <Card key={o.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{o.outcome_type} · {o.capability_registry_entries?.capability_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Accuracy: {((o.registry_outcome_accuracy_score || 0) * 100).toFixed(0)}% · Integrity: {((o.bounded_registry_integrity_score || 0) * 100).toFixed(0)}%
                      </p>
                    </div>
                    <StatusBadge status={o.outcome_status} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LifecycleBadge({ state }: { state: string }) {
  const styles: Record<string, string> = {
    proposed: "bg-muted text-muted-foreground",
    registered: "bg-green-500/20 text-green-400 border-green-500/30",
    pilot_only: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    restricted: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    deprecated: "bg-red-500/20 text-red-400 border-red-500/30",
    hidden: "bg-muted text-muted-foreground",
    future_candidate: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    archived: "bg-muted text-muted-foreground",
  };
  return <Badge className={`text-[10px] ${styles[state] || "bg-muted text-muted-foreground"}`}>{state}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    proposed: "bg-muted text-muted-foreground",
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    under_review: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    draft: "bg-muted text-muted-foreground",
    valid: "bg-green-500/20 text-green-400 border-green-500/30",
    deprecated: "bg-red-500/20 text-red-400 border-red-500/30",
    restricted: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    pending: "bg-muted text-muted-foreground",
    helpful: "bg-green-500/20 text-green-400 border-green-500/30",
    harmful: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return <Badge className={`text-[10px] ${styles[status] || "bg-muted text-muted-foreground"}`}>{status}</Badge>;
}

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-[10px] font-mono">{((value || 0) * 100).toFixed(0)}%</span>
      </div>
      <Progress value={(value || 0) * 100} className="h-1.5" />
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-muted-foreground text-[10px]">{label}</p>
      <p className="font-mono text-xs">{((value || 0) * 100).toFixed(0)}%</p>
    </div>
  );
}
