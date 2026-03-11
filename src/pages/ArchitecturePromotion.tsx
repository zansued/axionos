import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import {
  ClipboardCheck,
  FilePlus2,
  CircleCheck,
  CircleX,
  Clock,
  Archive,
  GitBranch,
  ShieldAlert,
  FlaskConical,
} from "lucide-react";

type Dossier = {
  id: string;
  dossier_title: string;
  proposed_direction: string;
  expected_benefit: string;
  risk_posture: string;
  uncertainty_posture: string;
  decision_status: string;
  required_approvals: number;
  approvals_received: number;
  review_notes: string | null;
  linked_hypothesis_ids: string[];
  linked_simulation_ids: string[];
  linked_pattern_ids: string[];
  created_at: string;
  updated_at: string;
};

function invoke(orgId: string, action: string, params: Record<string, any> = {}) {
  return supabase.functions.invoke("architecture-promotion", {
    body: { action, organization_id: orgId, ...params },
  });
}

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "approved":
      return "default";
    case "rejected":
      return "destructive";
    case "deferred":
      return "secondary";
    case "archived":
      return "outline";
    default:
      return "secondary";
  }
}

function StatusIcon({ status }: { status: string }) {
  const cls = "h-4 w-4 text-muted-foreground";
  switch (status) {
    case "approved":
      return <CircleCheck className={cls} />;
    case "rejected":
      return <CircleX className={cls} />;
    case "deferred":
      return <Clock className={cls} />;
    case "archived":
      return <Archive className={cls} />;
    case "needs_more_research":
      return <FlaskConical className={cls} />;
    default:
      return <GitBranch className={cls} />;
  }
}

function DossierRow({ dossier, onOpen }: { dossier: Dossier; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left flex items-start justify-between gap-3 p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-accent/10 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon status={dossier.decision_status} />
          <div className="text-sm font-medium truncate">{dossier.dossier_title}</div>
        </div>
        <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
          {dossier.proposed_direction}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant={statusBadgeVariant(dossier.decision_status)} className="text-[11px]">
            {dossier.decision_status}
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            approvals {dossier.approvals_received}/{dossier.required_approvals}
          </Badge>
        </div>
      </div>
      <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

export default function ArchitecturePromotion() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    direction: "",
    benefit: "",
    risk: "",
    uncertainty: "",
    requiredApprovals: 1,
  });

  const overview = useQuery({
    queryKey: ["architecture-promotion-overview", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke(orgId!, "overview");
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 30000,
  });

  const list = useQuery({
    queryKey: ["architecture-promotion-list", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await invoke(orgId!, "list_dossiers");
      if (error) throw error;
      return data as any;
    },
  });

  const detail = useQuery({
    queryKey: ["architecture-promotion-detail", orgId, selectedId],
    enabled: !!orgId && !!selectedId,
    queryFn: async () => {
      const { data, error } = await invoke(orgId!, "dossier_detail", { dossier_id: selectedId });
      if (error) throw error;
      return data as any;
    },
  });

  const createDossier = useMutation({
    mutationFn: async () => {
      const payload = {
        dossier_title: draft.title,
        proposed_direction: draft.direction,
        expected_benefit: draft.benefit,
        risk_posture: draft.risk,
        uncertainty_posture: draft.uncertainty,
        required_approvals: Number(draft.requiredApprovals) || 1,
        linked_hypothesis_ids: [],
        linked_simulation_ids: [],
        linked_pattern_ids: [],
      };
      const { data, error } = await invoke(orgId!, "create_dossier", payload);
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      setCreateOpen(false);
      setDraft({ title: "", direction: "", benefit: "", risk: "", uncertainty: "", requiredApprovals: 1 });
      await qc.invalidateQueries({ queryKey: ["architecture-promotion-overview", orgId] });
      await qc.invalidateQueries({ queryKey: ["architecture-promotion-list", orgId] });
    },
  });

  const setStatus = useMutation({
    mutationFn: async (input: { action: string; dossier_id: string; rationale: string }) => {
      const { data, error } = await invoke(orgId!, input.action, {
        dossier_id: input.dossier_id,
        rationale: input.rationale,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["architecture-promotion-overview", orgId] });
      await qc.invalidateQueries({ queryKey: ["architecture-promotion-list", orgId] });
      await qc.invalidateQueries({ queryKey: ["architecture-promotion-detail", orgId, selectedId] });
    },
  });

  const dossiers: Dossier[] = list.data?.dossiers || [];
  const d = detail.data?.dossier as Dossier | undefined;

  const byStatus = useMemo(() => {
    const map: Record<string, Dossier[]> = {
      review_queue: [],
      approved: [],
      rejected: [],
      deferred: [],
      needs_more_research: [],
      archived: [],
      all: [],
    };

    for (const item of dossiers) {
      map.all.push(item);
      if (item.decision_status === "submitted_for_review") map.review_queue.push(item);
      else if (map[item.decision_status]) map[item.decision_status].push(item);
    }

    return map;
  }, [dossiers]);

  const kpis = [
    { label: "Total", value: overview.data?.total ?? 0 },
    { label: "Review Backlog", value: overview.data?.review_backlog ?? 0 },
    { label: "Approved", value: overview.data?.approved ?? 0 },
    { label: "Rejected", value: overview.data?.rejected ?? 0 },
    { label: "Deferred", value: overview.data?.deferred ?? 0 },
    { label: "Needs Research", value: overview.data?.needs_more_research ?? 0 },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
          <main className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <ClipboardCheck className="h-6 w-6 text-primary" />
                  Architecture Promotion Dossiers
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Human-governed promotion workflow — advisory-only, auditable, and rollback-aware
                </p>
              </div>

              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="shrink-0">
                    <FilePlus2 className="h-4 w-4 mr-2" />
                    New dossier
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Create promotion dossier</DialogTitle>
                  </DialogHeader>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={draft.title}
                        onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))}
                        placeholder="e.g. Adopt bounded rollout sandbox gates"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="direction">Proposed direction</Label>
                      <Textarea
                        id="direction"
                        value={draft.direction}
                        onChange={(e) => setDraft((s) => ({ ...s, direction: e.target.value }))}
                        placeholder="Describe the architectural direction in abstract terms."
                        rows={4}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="benefit">Expected benefit</Label>
                      <Textarea
                        id="benefit"
                        value={draft.benefit}
                        onChange={(e) => setDraft((s) => ({ ...s, benefit: e.target.value }))}
                        placeholder="What benefit is expected, and why?"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="risk">Risk posture</Label>
                        <Input
                          id="risk"
                          value={draft.risk}
                          onChange={(e) => setDraft((s) => ({ ...s, risk: e.target.value }))}
                          placeholder="low / medium / high + notes"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="uncertainty">Uncertainty posture</Label>
                        <Input
                          id="uncertainty"
                          value={draft.uncertainty}
                          onChange={(e) => setDraft((s) => ({ ...s, uncertainty: e.target.value }))}
                          placeholder="known unknowns, assumptions"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="approvals">Required approvals</Label>
                      <Input
                        id="approvals"
                        type="number"
                        min={1}
                        value={draft.requiredApprovals}
                        onChange={(e) => setDraft((s) => ({ ...s, requiredApprovals: Number(e.target.value) }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Dossiers never apply changes automatically; approvals are tracked for governance visibility.
                      </p>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setCreateOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => createDossier.mutate()}
                        disabled={!orgId || createDossier.isPending || !draft.title || !draft.direction}
                      >
                        Create
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {kpis.map((k) => (
                <Card key={k.label}>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{k.value}</div>
                    <div className="text-xs text-muted-foreground">{k.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Tabs defaultValue="review_queue" className="space-y-4">
              <TabsList>
                <TabsTrigger value="review_queue">Review queue</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
                <TabsTrigger value="deferred">Deferred</TabsTrigger>
                <TabsTrigger value="needs_more_research">Needs research</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>

              {(
                [
                  "review_queue",
                  "approved",
                  "rejected",
                  "deferred",
                  "needs_more_research",
                  "archived",
                  "all",
                ] as const
              ).map((tab) => {
                const items = byStatus[tab];
                return (
                  <TabsContent key={tab} value={tab}>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">{items.length} dossiers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[480px]">
                          {list.isLoading ? (
                            <div className="flex justify-center py-10">
                              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            </div>
                          ) : items.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nothing here yet.</p>
                          ) : (
                            <div className="space-y-3">
                              {items.map((x) => (
                                <DossierRow
                                  key={x.id}
                                  dossier={x}
                                  onOpen={() => {
                                    setSelectedId(x.id);
                                    setDrawerOpen(true);
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>

            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetContent className="w-full sm:max-w-2xl overflow-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    {d?.dossier_title || "Dossier detail"}
                  </SheetTitle>
                </SheetHeader>

                {detail.isLoading && (
                  <div className="flex justify-center mt-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                )}

                {detail.data && d && (
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={statusBadgeVariant(d.decision_status)} className="text-xs">
                        {d.decision_status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        approvals {d.approvals_received}/{d.required_approvals}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        advisory-only
                      </Badge>
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Proposed direction</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{d.proposed_direction}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Expected benefit</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{d.expected_benefit}</p>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs font-medium text-muted-foreground">Risk posture</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm whitespace-pre-wrap">{d.risk_posture}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs font-medium text-muted-foreground">Uncertainty posture</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm whitespace-pre-wrap">{d.uncertainty_posture}</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Research lineage</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(detail.data.lineage?.length ?? 0) === 0 ? (
                          <p className="text-sm text-muted-foreground">No lineage entries recorded.</p>
                        ) : (
                          <div className="space-y-2">
                            {detail.data.lineage.map((l: any) => (
                              <div key={l.id} className="p-2 rounded-md border border-border/50">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-sm font-medium">{l.source_ref_type}</div>
                                  <Badge variant="outline" className="text-[11px]">
                                    conf {Number(l.confidence_contribution).toFixed(2)}
                                  </Badge>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                                  {l.evidence_summary}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-muted-foreground">Governance actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => setStatus.mutate({ action: "approve_dossier", dossier_id: d.id, rationale: "Approved by human governance" })}
                            disabled={setStatus.isPending || d.decision_status === "approved"}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setStatus.mutate({ action: "reject_dossier", dossier_id: d.id, rationale: "Rejected by human governance" })}
                            disabled={setStatus.isPending || d.decision_status === "rejected"}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setStatus.mutate({ action: "defer_dossier", dossier_id: d.id, rationale: "Deferred for later review" })}
                            disabled={setStatus.isPending || d.decision_status === "deferred"}
                          >
                            Defer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStatus.mutate({ action: "needs_more_research", dossier_id: d.id, rationale: "More evidence required" })}
                            disabled={setStatus.isPending || d.decision_status === "needs_more_research"}
                          >
                            Needs more research
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStatus.mutate({ action: "archive_dossier", dossier_id: d.id, rationale: "Archived" })}
                            disabled={setStatus.isPending || d.decision_status === "archived"}
                          >
                            Archive
                          </Button>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          Approving a dossier only records a decision; it does not apply any architecture change.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
