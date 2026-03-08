import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Handshake, Users, FileText, Scale, DollarSign, AlertTriangle, FileCheck } from "lucide-react";
import { useMultiPartyPolicyRevenueGovernance } from "@/hooks/useMultiPartyPolicyRevenueGovernance";
import { EmptyState, StatCard } from "@/components/workspace/WorkspaceShared";

export function MultiPartyPolicyRevenueGovernanceDashboard() {
  const { overview, frames, entitlements, valueFlows, conflicts, outcomes } = useMultiPartyPolicyRevenueGovernance();
  const ov = overview.data as Record<string, any> | null;
  const frs = (frames.data as any)?.frames || [];
  const ents = (entitlements.data as any)?.entitlements || [];
  const vfs = (valueFlows.data as any)?.value_flows || [];
  const cons = (conflicts.data as any)?.conflicts || [];
  const outs = (outcomes.data as any)?.outcomes || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Handshake className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Multi-Party Policy & Revenue Governance</h2>
          <p className="text-sm text-muted-foreground">Controlled multi-party interaction — not unrestricted commerce</p>
        </div>
        <Badge variant="outline" className="ml-auto border-amber-500/30 text-amber-400">Policy Bounded</Badge>
      </div>

      {ov && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-6">
          <StatCard label="Roles" value={ov.total_roles ?? 0} />
          <StatCard label="Policy Frames" value={ov.total_frames ?? 0} />
          <StatCard label="Entitlements" value={ov.total_entitlements ?? 0} />
          <StatCard label="Value Flows" value={ov.total_value_flows ?? 0} />
          <StatCard label="Conflicts" value={ov.total_conflicts ?? 0} />
          <StatCard label="Open Conflicts" value={ov.open_conflicts ?? 0} />
        </div>
      )}

      <Tabs defaultValue="frames">
        <TabsList className="grid w-full grid-cols-6 h-9">
          <TabsTrigger value="frames" className="text-xs gap-1"><FileText className="h-3 w-3" /> Frames</TabsTrigger>
          <TabsTrigger value="entitlements" className="text-xs gap-1"><Scale className="h-3 w-3" /> Entitlements</TabsTrigger>
          <TabsTrigger value="value-flows" className="text-xs gap-1"><DollarSign className="h-3 w-3" /> Value Flows</TabsTrigger>
          <TabsTrigger value="conflicts" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" /> Conflicts</TabsTrigger>
          <TabsTrigger value="roles" className="text-xs gap-1"><Users className="h-3 w-3" /> Roles</TabsTrigger>
          <TabsTrigger value="outcomes" className="text-xs gap-1"><FileCheck className="h-3 w-3" /> Outcomes</TabsTrigger>
        </TabsList>

        <TabsContent value="frames" className="mt-4 space-y-3">
          {frs.length === 0 ? (
            <EmptyState icon={FileText} text="No policy frames defined." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {frs.slice(0, 20).map((f: any) => (
                <Card key={f.id} className="border-border/50">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{f.policy_frame_name}</p>
                      <StatusBadge status={f.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{f.party_role_a} ↔ {f.party_role_b} · {f.interaction_type}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <MetricBar label="Alignment" value={f.policy_alignment_score} />
                      <MetricBar label="Fairness" value={f.fairness_score} />
                      <MetricBar label="Enforce" value={f.enforceability_score} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="entitlements" className="mt-4 space-y-3">
          {ents.length === 0 ? (
            <EmptyState icon={Scale} text="No entitlements defined." />
          ) : (
            <div className="space-y-2">
              {ents.slice(0, 20).map((e: any) => (
                <Card key={e.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{e.multi_party_policy_frames?.policy_frame_name} · {e.entitlement_scope}</p>
                      <p className="text-xs text-muted-foreground">Obligation: {e.obligation_level} · Restriction: {e.restriction_level}</p>
                    </div>
                    <MetricPill label="Integrity" value={e.entitlement_integrity_score} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="value-flows" className="mt-4 space-y-3">
          {vfs.length === 0 ? (
            <EmptyState icon={DollarSign} text="No value flow rules." />
          ) : (
            <div className="space-y-2">
              {vfs.slice(0, 20).map((v: any) => (
                <Card key={v.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm">{v.multi_party_policy_frames?.policy_frame_name}</p>
                      <p className="text-xs text-muted-foreground">{v.value_flow_type} · {v.revenue_rule_type}</p>
                    </div>
                    <div className="flex gap-2">
                      <MetricPill label="Bound" value={v.revenue_bound_score} />
                      <MetricPill label="Settle" value={v.settlement_readiness_score} />
                      <MetricPill label="Gov" value={v.value_flow_governance_score} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="conflicts" className="mt-4 space-y-3">
          {cons.length === 0 ? (
            <EmptyState icon={AlertTriangle} text="No policy conflicts detected." />
          ) : (
            <div className="space-y-2">
              {cons.slice(0, 20).map((c: any) => (
                <Card key={c.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{c.conflict_type}</p>
                      <p className="text-xs text-muted-foreground">{c.description || c.multi_party_policy_frames?.policy_frame_name}</p>
                      <p className="text-xs text-muted-foreground">Fairness impact: {c.fairness_impact}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <MetricPill label="Score" value={c.conflict_score} />
                      <StatusBadge status={c.resolution_status} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="roles" className="mt-4 space-y-3">
          <EmptyState icon={Users} text="Party roles are managed via the governance API." />
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
                      <p className="text-sm">{o.outcome_type} · {o.multi_party_policy_frames?.policy_frame_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Accuracy: {((o.governance_outcome_accuracy_score || 0) * 100).toFixed(0)}% · Integrity: {((o.bounded_commercial_integrity_score || 0) * 100).toFixed(0)}%
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    under_review: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    suspended: "bg-red-500/20 text-red-400 border-red-500/30",
    open: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    resolved: "bg-green-500/20 text-green-400 border-green-500/30",
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
