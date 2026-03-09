/**
 * Sprint 95 — Institutional Memory Surface
 * Block T: Governed Intelligence OS
 *
 * Operator/admin interface for:
 * - Memory overview and statistics
 * - Recurring lessons browser
 * - High-confidence memory
 * - Reusable lessons
 * - Memory detail drawer with lineage
 *
 * Invariants: advisory-first, tenant isolation, auditable
 */

import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageGuidanceShell } from "@/components/guidance";
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
  Brain,
  Database,
  GitBranch,
  CheckCircle2,
  Clock,
  Archive,
  RefreshCw,
  Eye,
  Star,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Zap,
  BookOpen,
  Network,
  Filter,
  ArrowRight,
  Shield,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

interface InstitutionalMemory {
  id: string;
  memory_key: string;
  memory_title: string;
  memory_description: string;
  memory_type: string;
  memory_scope: string;
  confidence_score: number;
  recurrence_count: number;
  reuse_potential: string;
  lifecycle_status: string;
  review_status: string;
  created_at: string;
  updated_at: string;
  uncertainty_notes?: string;
}

interface MemoryStats {
  total: number;
  by_type: Record<string, number>;
  by_lifecycle: Record<string, number>;
  by_reuse: Record<string, number>;
  high_confidence: number;
  recurring: number;
  reusable: number;
}

interface MemoryDetail {
  memory: InstitutionalMemory;
  sources: any[];
  lineage_outgoing: any[];
  lineage_incoming: any[];
  reviews: any[];
}

interface MemoryExplanation {
  summary: string;
  what_it_represents: string;
  contributing_sources: { type: string; contribution: string; notes?: string }[];
  why_durable: string;
  where_relevant: string;
  uncertainties: string;
  confidence: { score: number; interpretation: string };
  recurrence: { count: number; interpretation: string };
  reuse_potential: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────

function useMemoryStats(orgId: string | undefined) {
  return useQuery({
    queryKey: ["institutional-memory-stats", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase.functions.invoke("institutional-memory", {
        body: { action: "stats", organization_id: orgId },
      });
      if (error) throw error;
      return data.stats as MemoryStats;
    },
    enabled: !!orgId,
  });
}

function useMemories(orgId: string | undefined, filters: Record<string, any>) {
  return useQuery({
    queryKey: ["institutional-memories", orgId, filters],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.functions.invoke("institutional-memory", {
        body: { action: "list", organization_id: orgId, filters },
      });
      if (error) throw error;
      return data.memories as InstitutionalMemory[];
    },
    enabled: !!orgId,
  });
}

function useMemoryDetail(orgId: string | undefined, memoryId: string | null) {
  return useQuery({
    queryKey: ["institutional-memory-detail", orgId, memoryId],
    queryFn: async () => {
      if (!orgId || !memoryId) return null;
      const { data, error } = await supabase.functions.invoke("institutional-memory", {
        body: { action: "detail", organization_id: orgId, memory_id: memoryId },
      });
      if (error) throw error;
      return data as MemoryDetail;
    },
    enabled: !!orgId && !!memoryId,
  });
}

function useMemoryExplanation(orgId: string | undefined, memoryId: string | null) {
  return useQuery({
    queryKey: ["institutional-memory-explain", orgId, memoryId],
    queryFn: async () => {
      if (!orgId || !memoryId) return null;
      const { data, error } = await supabase.functions.invoke("institutional-memory", {
        body: { action: "explain", organization_id: orgId, memory_id: memoryId },
      });
      if (error) throw error;
      return data.explanation as MemoryExplanation;
    },
    enabled: !!orgId && !!memoryId,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const MEMORY_TYPE_ICONS: Record<string, typeof Brain> = {
  operational_lesson: Zap,
  governance_lesson: Shield,
  routing_lesson: Network,
  capability_lesson: Star,
  delivery_lesson: TrendingUp,
  benchmark_lesson: CheckCircle2,
  adoption_lesson: Lightbulb,
  failure_pattern: AlertTriangle,
  recovery_memory: RefreshCw,
  guidance_pattern: BookOpen,
  coordination_lesson: GitBranch,
};

const MEMORY_TYPE_LABELS: Record<string, string> = {
  operational_lesson: "Operational",
  governance_lesson: "Governance",
  routing_lesson: "Routing",
  capability_lesson: "Capability",
  delivery_lesson: "Delivery",
  benchmark_lesson: "Benchmark",
  adoption_lesson: "Adoption",
  failure_pattern: "Failure Pattern",
  recovery_memory: "Recovery",
  guidance_pattern: "Guidance",
  coordination_lesson: "Coordination",
};

const LIFECYCLE_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  candidate: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  active: "bg-green-500/20 text-green-700 dark:text-green-400",
  watch: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  deprecated: "bg-red-500/20 text-red-700 dark:text-red-400",
  archived: "bg-muted text-muted-foreground",
};

const REUSE_COLORS: Record<string, string> = {
  unknown: "bg-muted text-muted-foreground",
  low: "bg-slate-500/20 text-slate-700 dark:text-slate-400",
  medium: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  high: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  canonical: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
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

function MemoryCard({ memory, onSelect }: { memory: InstitutionalMemory; onSelect: () => void }) {
  const Icon = MEMORY_TYPE_ICONS[memory.memory_type] || Brain;

  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={onSelect}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-muted rounded-lg shrink-0">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-sm truncate">{memory.memory_title}</h4>
              <Badge variant="outline" className={LIFECYCLE_COLORS[memory.lifecycle_status]}>
                {memory.lifecycle_status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{memory.memory_description || "No description"}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {(memory.confidence_score * 100).toFixed(0)}%
              </span>
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                {memory.recurrence_count}x
              </span>
              <Badge variant="outline" className={`${REUSE_COLORS[memory.reuse_potential]} text-xs`}>
                {memory.reuse_potential}
              </Badge>
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

function MemoryDetailDrawer({
  open,
  onOpenChange,
  memoryId,
  orgId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memoryId: string | null;
  orgId: string | undefined;
}) {
  const { data: detail, isLoading: detailLoading } = useMemoryDetail(orgId, memoryId);
  const { data: explanation, isLoading: explainLoading } = useMemoryExplanation(orgId, memoryId);
  const queryClient = useQueryClient();

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("institutional-memory", {
        body: { action: "archive", organization_id: orgId, memory_id: memoryId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Memory archived");
      queryClient.invalidateQueries({ queryKey: ["institutional-memories"] });
      queryClient.invalidateQueries({ queryKey: ["institutional-memory-stats"] });
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to archive memory"),
  });

  const markReusableMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("institutional-memory", {
        body: { action: "mark_reusable", organization_id: orgId, memory_id: memoryId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Memory marked as canonical/reusable");
      queryClient.invalidateQueries({ queryKey: ["institutional-memories"] });
      queryClient.invalidateQueries({ queryKey: ["institutional-memory-stats"] });
    },
    onError: () => toast.error("Failed to mark memory as reusable"),
  });

  const memory = detail?.memory;
  const Icon = memory ? MEMORY_TYPE_ICONS[memory.memory_type] || Brain : Brain;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {detailLoading || !memory ? (
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
                  <SheetTitle>{memory.memory_title}</SheetTitle>
                  <SheetDescription>{MEMORY_TYPE_LABELS[memory.memory_type] || memory.memory_type}</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="mt-6 pr-4 h-[calc(100vh-180px)]">
              <div className="space-y-6">
                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={LIFECYCLE_COLORS[memory.lifecycle_status]}>{memory.lifecycle_status}</Badge>
                  <Badge variant="outline">{memory.memory_scope}</Badge>
                  <Badge className={REUSE_COLORS[memory.reuse_potential]}>Reuse: {memory.reuse_potential}</Badge>
                </div>

                {/* Confidence & Recurrence */}
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Confidence</span>
                        <span className="font-medium">{(memory.confidence_score * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={memory.confidence_score * 100} className="h-2" />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Recurrence</span>
                      <span className="font-medium">{memory.recurrence_count} observations</span>
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
                        <p className="text-muted-foreground text-xs uppercase mb-1">What it represents</p>
                        <p>{explanation.what_it_represents}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-muted-foreground text-xs uppercase mb-1">Why durable</p>
                        <p>{explanation.why_durable}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-muted-foreground text-xs uppercase mb-1">Where relevant</p>
                        <p>{explanation.where_relevant}</p>
                      </div>
                      {explanation.uncertainties && explanation.uncertainties !== "No explicit uncertainties documented." && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-muted-foreground text-xs uppercase mb-1">Uncertainties</p>
                            <p className="text-amber-600 dark:text-amber-400">{explanation.uncertainties}</p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ) : null}

                {/* Sources */}
                {detail?.sources && detail.sources.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Contributing Sources ({detail.sources.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {detail.sources.map((source: any) => (
                          <div key={source.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                            <span className="font-medium">{source.source_type.replace(/_/g, " ")}</span>
                            <span className="text-muted-foreground">{(source.contribution_weight * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Lineage */}
                {((detail?.lineage_outgoing && detail.lineage_outgoing.length > 0) ||
                  (detail?.lineage_incoming && detail.lineage_incoming.length > 0)) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <GitBranch className="h-4 w-4" />
                        Memory Lineage
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {detail.lineage_incoming?.map((link: any) => (
                        <div key={link.id} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-xs">
                            {link.relationship_type}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{link.from_memory?.memory_title || "Unknown"}</span>
                        </div>
                      ))}
                      {detail.lineage_outgoing?.map((link: any) => (
                        <div key={link.id} className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">derives</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{link.to_memory?.memory_title || "Unknown"}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Reviews */}
                {detail?.reviews && detail.reviews.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Review History ({detail.reviews.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {detail.reviews.slice(0, 3).map((review: any) => (
                          <div key={review.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                            <div>
                              <Badge variant="outline" className="text-xs mr-2">
                                {review.review_type}
                              </Badge>
                              <span className="text-muted-foreground">{review.review_status}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  {memory.reuse_potential !== "canonical" && memory.lifecycle_status === "active" && (
                    <Button onClick={() => markReusableMutation.mutate()} disabled={markReusableMutation.isPending} className="flex-1">
                      <Star className="h-4 w-4 mr-2" />
                      Mark Canonical
                    </Button>
                  )}
                  {memory.lifecycle_status !== "archived" && (
                    <Button variant="outline" onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending}>
                      <Archive className="h-4 w-4 mr-2" />
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

export default function IntelligenceMemory() {
  const { currentOrg } = useOrg();
  const orgId = currentOrg?.id;

  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({ limit: 50 });

  const { data: stats, isLoading: statsLoading } = useMemoryStats(orgId);
  const { data: memories, isLoading: memoriesLoading } = useMemories(orgId, filters);

  const handleSelectMemory = (memoryId: string) => {
    setSelectedMemoryId(memoryId);
    setDrawerOpen(true);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <PageGuidanceShell pageKey="intelligence-memory" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Institutional Memory
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Consolidated platform experience and lessons learned
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            Sprint 95 • Block T
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Total Memories"
            value={statsLoading ? "..." : stats?.total || 0}
            icon={Database}
          />
          <StatsCard
            title="High Confidence"
            value={statsLoading ? "..." : stats?.high_confidence || 0}
            icon={TrendingUp}
            subtitle="≥80% confidence"
          />
          <StatsCard
            title="Recurring"
            value={statsLoading ? "..." : stats?.recurring || 0}
            icon={RefreshCw}
            subtitle="≥3 observations"
          />
          <StatsCard
            title="Reusable"
            value={statsLoading ? "..." : stats?.reusable || 0}
            icon={Star}
            subtitle="high/canonical"
          />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="all" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <TabsList>
              <TabsTrigger value="all">All Memories</TabsTrigger>
              <TabsTrigger value="recurring">Recurring</TabsTrigger>
              <TabsTrigger value="reusable">Reusable</TabsTrigger>
              <TabsTrigger value="review">Pending Review</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Select
                value={filters.memory_type || "all"}
                onValueChange={(v) => setFilters((f) => ({ ...f, memory_type: v === "all" ? undefined : v }))}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(MEMORY_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="all" className="space-y-3">
            {memoriesLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : memories && memories.length > 0 ? (
              memories.map((memory) => (
                <MemoryCard key={memory.id} memory={memory} onSelect={() => handleSelectMemory(memory.id)} />
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Brain className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium">No institutional memories yet</h3>
                  <p className="text-muted-foreground text-sm mt-1 max-w-md">
                    Memories are consolidated from platform operations, governance decisions, routing outcomes, and other system signals.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recurring" className="space-y-3">
            {memoriesLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              memories
                ?.filter((m) => m.recurrence_count >= 3)
                .map((memory) => <MemoryCard key={memory.id} memory={memory} onSelect={() => handleSelectMemory(memory.id)} />)
            )}
          </TabsContent>

          <TabsContent value="reusable" className="space-y-3">
            {memoriesLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              memories
                ?.filter((m) => ["high", "canonical"].includes(m.reuse_potential))
                .map((memory) => <MemoryCard key={memory.id} memory={memory} onSelect={() => handleSelectMemory(memory.id)} />)
            )}
          </TabsContent>

          <TabsContent value="review" className="space-y-3">
            {memoriesLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              memories
                ?.filter((m) => m.review_status === "pending" || m.lifecycle_status === "candidate")
                .map((memory) => <MemoryCard key={memory.id} memory={memory} onSelect={() => handleSelectMemory(memory.id)} />)
            )}
          </TabsContent>
        </Tabs>

        {/* Detail Drawer */}
        <MemoryDetailDrawer open={drawerOpen} onOpenChange={setDrawerOpen} memoryId={selectedMemoryId} orgId={orgId} />
      </div>
    </AppLayout>
  );
}
