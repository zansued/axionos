/**
 * Sprint 96 — Doctrine & Playbook Synthesis
 * Block T: Governed Intelligence OS
 *
 * Workspace Governance surface for:
 * - Doctrine/playbook overview and statistics
 * - Playbook browser by type, strength, lifecycle
 * - Detail drawer with memory lineage, explainability, reviews
 * - Synthesis trigger (from institutional memories)
 *
 * Invariants: advisory-first, tenant isolation, auditable
 */

import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BookOpen,
  Shield,
  Network,
  Star,
  TrendingUp,
  CheckCircle2,
  Lightbulb,
  AlertTriangle,
  RefreshCw,
  Eye,
  Archive,
  Zap,
  Target,
  GitBranch,
  Brain,
  Filter,
  ArrowRight,
  Scale,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

interface Doctrine {
  id: string;
  doctrine_key: string;
  doctrine_title: string;
  doctrine_description: string;
  doctrine_type: string;
  doctrine_scope: string;
  target_role: string;
  target_surface: string;
  recommendation_strength: string;
  confidence_score: number;
  contributing_memory_count: number;
  applicability_summary: string;
  exceptions_caveats?: string;
  lifecycle_status: string;
  review_status: string;
  created_at: string;
  updated_at: string;
}

interface DoctrineStats {
  total: number;
  active: number;
  high_confidence: number;
  canonical: number;
  pending_review: number;
  by_type: Record<string, number>;
  by_lifecycle: Record<string, number>;
  by_strength: Record<string, number>;
}

interface DoctrineDetail {
  doctrine: Doctrine;
  memory_links: any[];
  applicability_rules: any[];
  reviews: any[];
}

interface DoctrineExplanation {
  summary: string;
  why_exists: string;
  supporting_memories: { title: string; type: string; confidence: number; recurrence: number; weight: number }[];
  where_applies: string;
  strength: string;
  confidence: { score: number; interpretation: string };
  caveats: string;
  scope: string;
  target_role: string;
  target_surface: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────

function useDoctrineStats(orgId: string | undefined) {
  return useQuery({
    queryKey: ["doctrine-stats", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase.functions.invoke("doctrine-synthesis", {
        body: { action: "stats", organization_id: orgId },
      });
      if (error) throw error;
      return data.stats as DoctrineStats;
    },
    enabled: !!orgId,
  });
}

function useDoctrines(orgId: string | undefined, filters: Record<string, any>) {
  return useQuery({
    queryKey: ["doctrines", orgId, filters],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.functions.invoke("doctrine-synthesis", {
        body: { action: "list", organization_id: orgId, filters },
      });
      if (error) throw error;
      return data.doctrines as Doctrine[];
    },
    enabled: !!orgId,
  });
}

function useDoctrineDetail(orgId: string | undefined, doctrineId: string | null) {
  return useQuery({
    queryKey: ["doctrine-detail", orgId, doctrineId],
    queryFn: async () => {
      if (!orgId || !doctrineId) return null;
      const { data, error } = await supabase.functions.invoke("doctrine-synthesis", {
        body: { action: "detail", organization_id: orgId, doctrine_id: doctrineId },
      });
      if (error) throw error;
      return data as DoctrineDetail;
    },
    enabled: !!orgId && !!doctrineId,
  });
}

function useDoctrineExplanation(orgId: string | undefined, doctrineId: string | null) {
  return useQuery({
    queryKey: ["doctrine-explain", orgId, doctrineId],
    queryFn: async () => {
      if (!orgId || !doctrineId) return null;
      const { data, error } = await supabase.functions.invoke("doctrine-synthesis", {
        body: { action: "explain", organization_id: orgId, doctrine_id: doctrineId },
      });
      if (error) throw error;
      return data.explanation as DoctrineExplanation;
    },
    enabled: !!orgId && !!doctrineId,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, typeof BookOpen> = {
  governance_playbook: Shield,
  routing_playbook: Network,
  capability_governance_playbook: Star,
  benchmark_playbook: CheckCircle2,
  adoption_intervention_playbook: Lightbulb,
  post_deploy_response_playbook: AlertTriangle,
  delivery_quality_playbook: TrendingUp,
  mentor_recommendation_playbook: BookOpen,
};

const TYPE_LABELS: Record<string, string> = {
  governance_playbook: "Governance",
  routing_playbook: "Routing",
  capability_governance_playbook: "Capability Gov.",
  benchmark_playbook: "Benchmark",
  adoption_intervention_playbook: "Adoption",
  post_deploy_response_playbook: "Post-Deploy",
  delivery_quality_playbook: "Delivery Quality",
  mentor_recommendation_playbook: "Mentor Rec.",
};

const LIFECYCLE_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  candidate: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  active: "bg-green-500/20 text-green-700 dark:text-green-400",
  deprecated: "bg-red-500/20 text-red-700 dark:text-red-400",
  archived: "bg-muted text-muted-foreground",
};

const STRENGTH_COLORS: Record<string, string> = {
  weak_suggestion: "bg-slate-500/20 text-slate-700 dark:text-slate-400",
  moderate_recommendation: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  strong_recommendation: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  canonical_doctrine: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
};

const STRENGTH_LABELS: Record<string, string> = {
  weak_suggestion: "Weak",
  moderate_recommendation: "Moderate",
  strong_recommendation: "Strong",
  canonical_doctrine: "Canonical",
};

// ─── Components ───────────────────────────────────────────────────────────

function StatsCard({ title, value, icon: Icon, subtitle }: { title: string; value: number | string; icon: any; subtitle?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DoctrineCard({ doctrine, onSelect }: { doctrine: Doctrine; onSelect: () => void }) {
  const Icon = TYPE_ICONS[doctrine.doctrine_type] || BookOpen;

  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={onSelect}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-muted rounded-lg shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-sm truncate">{doctrine.doctrine_title}</h4>
              <Badge variant="outline" className={LIFECYCLE_COLORS[doctrine.lifecycle_status]}>
                {doctrine.lifecycle_status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doctrine.doctrine_description || "No description"}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <Badge variant="outline" className={`${STRENGTH_COLORS[doctrine.recommendation_strength]} text-xs`}>
                {STRENGTH_LABELS[doctrine.recommendation_strength] || doctrine.recommendation_strength}
              </Badge>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {(doctrine.confidence_score * 100).toFixed(0)}%
              </span>
              <span className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                {doctrine.contributing_memory_count} memories
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DoctrineDetailDrawer({
  open,
  onOpenChange,
  doctrineId,
  orgId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctrineId: string | null;
  orgId: string | undefined;
}) {
  const { data: detail, isLoading: detailLoading } = useDoctrineDetail(orgId, doctrineId);
  const { data: explanation, isLoading: explainLoading } = useDoctrineExplanation(orgId, doctrineId);
  const queryClient = useQueryClient();

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("doctrine-synthesis", {
        body: { action: "archive", organization_id: orgId, doctrine_id: doctrineId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Doctrine archived");
      queryClient.invalidateQueries({ queryKey: ["doctrines"] });
      queryClient.invalidateQueries({ queryKey: ["doctrine-stats"] });
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to archive doctrine"),
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("doctrine-synthesis", {
        body: { action: "mark_active", organization_id: orgId, doctrine_id: doctrineId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Doctrine activated");
      queryClient.invalidateQueries({ queryKey: ["doctrines"] });
      queryClient.invalidateQueries({ queryKey: ["doctrine-stats"] });
    },
    onError: () => toast.error("Failed to activate doctrine"),
  });

  const doctrine = detail?.doctrine;
  const Icon = doctrine ? TYPE_ICONS[doctrine.doctrine_type] || BookOpen : BookOpen;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {detailLoading || !doctrine ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <SheetTitle>{doctrine.doctrine_title}</SheetTitle>
                  <SheetDescription>{TYPE_LABELS[doctrine.doctrine_type] || doctrine.doctrine_type} Playbook</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="mt-6 pr-4 h-[calc(100vh-180px)]">
              <div className="space-y-6">
                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={LIFECYCLE_COLORS[doctrine.lifecycle_status]}>{doctrine.lifecycle_status}</Badge>
                  <Badge className={STRENGTH_COLORS[doctrine.recommendation_strength]}>
                    {STRENGTH_LABELS[doctrine.recommendation_strength]}
                  </Badge>
                  <Badge variant="outline">{doctrine.doctrine_scope}</Badge>
                  <Badge variant="outline">{doctrine.target_role}</Badge>
                </div>

                {/* Confidence & Memories */}
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Confidence</span>
                        <span className="font-medium">{(doctrine.confidence_score * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={doctrine.confidence_score * 100} className="h-2" />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Contributing Memories</span>
                      <span className="font-medium">{doctrine.contributing_memory_count}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Explanation */}
                {explainLoading ? (
                  <Card>
                    <CardContent className="pt-4 flex items-center justify-center">
                      <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                    </CardContent>
                  </Card>
                ) : explanation ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Explanation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs uppercase mb-1">Why this exists</p>
                        <p>{explanation.why_exists}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-muted-foreground text-xs uppercase mb-1">Where it applies</p>
                        <p>{explanation.where_applies}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-muted-foreground text-xs uppercase mb-1">Strength</p>
                        <p>{explanation.strength}</p>
                      </div>
                      {explanation.caveats && explanation.caveats !== "No explicit caveats documented." && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-muted-foreground text-xs uppercase mb-1">Caveats & Exceptions</p>
                            <p className="text-amber-600 dark:text-amber-400">{explanation.caveats}</p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {/* Memory Links */}
                {detail?.memory_links && detail.memory_links.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        Supporting Memories ({detail.memory_links.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {detail.memory_links.map((link: any) => (
                          <div key={link.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                            <div className="min-w-0">
                              <span className="font-medium truncate block">
                                {link.institutional_memories?.memory_title || "Memory"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {link.institutional_memories?.memory_type?.replace(/_/g, " ")}
                              </span>
                            </div>
                            <span className="text-muted-foreground shrink-0 ml-2">
                              {(link.contribution_weight * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Applicability Rules */}
                {detail?.applicability_rules && detail.applicability_rules.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Applicability Rules ({detail.applicability_rules.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {detail.applicability_rules.map((rule: any) => (
                          <div key={rule.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                            <span>{rule.rule_description || rule.rule_key}</span>
                            <Badge variant={rule.enabled ? "default" : "outline"} className="text-xs">
                              {rule.enabled ? "Active" : "Disabled"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Reviews */}
                {detail?.reviews && detail.reviews.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Scale className="h-4 w-4" />
                        Reviews ({detail.reviews.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {detail.reviews.map((review: any) => (
                          <div key={review.id} className="text-sm p-2 bg-muted/50 rounded">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{review.review_action}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {review.review_notes && (
                              <p className="text-xs text-muted-foreground mt-1">{review.review_notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {doctrine.lifecycle_status !== "active" && (
                    <Button size="sm" onClick={() => activateMutation.mutate()} disabled={activateMutation.isPending}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Activate
                    </Button>
                  )}
                  {doctrine.lifecycle_status !== "archived" && (
                    <Button variant="outline" size="sm" onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending}>
                      <Archive className="h-4 w-4 mr-1" />
                      Archive
                    </Button>
                  )}
                </div>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function Playbooks() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const [selectedDoctrineId, setSelectedDoctrineId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data: stats, isLoading: statsLoading } = useDoctrineStats(orgId);

  const filters: Record<string, any> = {};
  if (tab === "active") filters.lifecycle_status = "active";
  if (tab === "canonical") filters.recommendation_strength = "canonical_doctrine";
  if (tab === "pending") filters.lifecycle_status = "candidate";
  if (typeFilter !== "all") filters.doctrine_type = typeFilter;

  const { data: doctrines, isLoading: doctrinesLoading } = useDoctrines(orgId, filters);

  const openDetail = (id: string) => {
    setSelectedDoctrineId(id);
    setDrawerOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Doctrine & Playbooks</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Synthesized institutional guidance from accumulated memory
            </p>
          </div>
        </div>

        

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatsCard title="Total Doctrines" value={stats?.total ?? 0} icon={BookOpen} />
          <StatsCard title="Active Playbooks" value={stats?.active ?? 0} icon={CheckCircle2} />
          <StatsCard title="High Confidence" value={stats?.high_confidence ?? 0} icon={TrendingUp} />
          <StatsCard title="Canonical" value={stats?.canonical ?? 0} icon={Star} />
          <StatsCard title="Pending Review" value={stats?.pending_review ?? 0} icon={Scale} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Tabs value={tab} onValueChange={setTab} className="flex-1">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="canonical">Canonical</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Doctrine List */}
        {doctrinesLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : doctrines && doctrines.length > 0 ? (
          <div className="grid gap-3">
            {doctrines.map((d) => (
              <DoctrineCard key={d.id} doctrine={d} onSelect={() => openDetail(d.id)} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium text-lg">No doctrines yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Doctrines are synthesized from institutional memories. As the system accumulates
                operational experience, recurring patterns will be consolidated into actionable playbooks.
              </p>
            </CardContent>
          </Card>
        )}

        <DoctrineDetailDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          doctrineId={selectedDoctrineId}
          orgId={orgId}
        />
      </div>
    </AppLayout>
  );
}
