import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserJourney } from "@/hooks/useUserJourney";
import { AppLayout } from "@/components/AppLayout";
import {
  Lightbulb, Search, Layers, Code2, ShieldCheck, Rocket, CheckCircle2,
  ArrowRight, AlertTriangle, Clock, Eye, ExternalLink, RefreshCw, FileText, Package,
} from "lucide-react";
import { motion } from "framer-motion";

const STAGE_META: Record<string, { icon: any; color: string; label: string }> = {
  idea: { icon: Lightbulb, color: "text-yellow-400", label: "Idea" },
  discovery: { icon: Search, color: "text-blue-400", label: "Discovery" },
  architecture: { icon: Layers, color: "text-purple-400", label: "Architecture" },
  engineering: { icon: Code2, color: "text-emerald-400", label: "Engineering" },
  validation: { icon: ShieldCheck, color: "text-orange-400", label: "Validation" },
  deploy: { icon: Rocket, color: "text-pink-400", label: "Deploy" },
  delivered: { icon: CheckCircle2, color: "text-green-400", label: "Delivered" },
};

const STAGES_ORDER = ["idea", "discovery", "architecture", "engineering", "validation", "deploy", "delivered"];

function StageTimeline({ currentStage }: { currentStage: string }) {
  const currentIdx = STAGES_ORDER.indexOf(currentStage);
  return (
    <div className="flex items-center gap-1 w-full">
      {STAGES_ORDER.map((stage, idx) => {
        const meta = STAGE_META[stage];
        const Icon = meta.icon;
        const isActive = idx === currentIdx;
        const isDone = idx < currentIdx;
        return (
          <div key={stage} className="flex items-center gap-1 flex-1">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all ${
              isActive ? `bg-primary/15 ${meta.color} ring-1 ring-primary/30` :
              isDone ? "bg-muted text-muted-foreground" :
              "text-muted-foreground/50"
            }`}>
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{meta.label}</span>
            </div>
            {idx < STAGES_ORDER.length - 1 && (
              <ArrowRight className={`h-3 w-3 shrink-0 ${isDone ? "text-muted-foreground" : "text-muted-foreground/30"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function InitiativeJourneyCard({ instance, onExplain }: { instance: any; onExplain: (id: string) => void }) {
  const meta = STAGE_META[instance.current_visible_stage] || STAGE_META.idea;
  const Icon = meta.icon;
  const progress = Math.round(Number(instance.journey_progress_score || 0) * 100);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-border/50 hover:border-border transition-colors">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${meta.color}`} />
              <div>
                <p className="font-medium text-sm truncate max-w-[200px]">
                  {instance.initiative_id?.slice(0, 8) || "Initiative"}
                </p>
                <p className="text-xs text-muted-foreground">{meta.label}</p>
              </div>
            </div>
            <Badge variant={instance.approval_required ? "destructive" : "secondary"} className="text-[10px]">
              {instance.approval_required ? "Approval needed" : instance.current_visible_stage}
            </Badge>
          </div>

          <StageTimeline currentStage={instance.current_visible_stage} />

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          {instance.next_action_label && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-primary/5 border border-primary/10">
              <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs text-primary font-medium">{instance.next_action_label}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span><FileText className="h-3 w-3 inline mr-0.5" />{instance.visible_artifact_count} outputs</span>
              <span><Eye className="h-3 w-3 inline mr-0.5" />Clarity {Math.round(Number(instance.clarity_score || 0) * 100)}%</span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => onExplain(instance.initiative_id)}>
              Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function UserJourneyDashboard() {
  const { overview, syncJourneyInstances } = useUserJourney();
  const [syncing, setSyncing] = useState(false);

  const data = overview.data;
  const instances = data?.instances || [];
  const stageDistribution = data?.stage_distribution || {};
  const avgProgress = data?.average_progress || 0;

  const pendingApprovals = instances.filter((i: any) => i.approval_required);
  const activeInstances = instances.filter((i: any) => i.current_visible_stage !== 'delivered');
  const deliveredInstances = instances.filter((i: any) => i.current_visible_stage === 'delivered');

  const handleSync = async () => {
    setSyncing(true);
    try { await syncJourneyInstances(); overview.refetch(); } finally { setSyncing(false); }
  };

  const handleExplain = (id: string) => {
    // Future: open detail panel
    console.log("Explain initiative:", id);
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
              <Rocket className="h-7 w-7 text-primary" />
              Journey
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">From idea to deployed software — your initiatives at a glance</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Journey"}
          </Button>
        </div>

        {/* Contextual Guidance */}
        <PageIntroCard guidance={getGuidanceForPage("journey")!} compact />

        {/* Overview Stats */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{instances.length}</p>
            <p className="text-xs text-muted-foreground">Total Initiatives</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{activeInstances.length}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{deliveredInstances.length}</p>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-400">{pendingApprovals.length}</p>
            <p className="text-xs text-muted-foreground">Pending Approvals</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{Math.round(avgProgress * 100)}%</p>
            <p className="text-xs text-muted-foreground">Avg Progress</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="active">
          <TabsList className="grid w-full grid-cols-5 h-9">
            <TabsTrigger value="active" className="text-xs gap-1"><Code2 className="h-3 w-3" /> Active</TabsTrigger>
            <TabsTrigger value="approvals" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" /> Approvals</TabsTrigger>
            <TabsTrigger value="delivered" className="text-xs gap-1"><CheckCircle2 className="h-3 w-3" /> Delivered</TabsTrigger>
            <TabsTrigger value="blockers" className="text-xs gap-1"><Clock className="h-3 w-3" /> Blockers</TabsTrigger>
            <TabsTrigger value="delivery" className="text-xs gap-1"><Package className="h-3 w-3" /> Delivery</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {activeInstances.length === 0 && (
                <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No active initiatives. Create one to start your journey!</p>
                </CardContent></Card>
              )}
              {activeInstances.map((inst: any) => (
                <InitiativeJourneyCard key={inst.id} instance={inst} onExplain={handleExplain} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="approvals" className="mt-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {pendingApprovals.length === 0 && (
                <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No pending approvals. All clear!</p>
                </CardContent></Card>
              )}
              {pendingApprovals.map((inst: any) => (
                <InitiativeJourneyCard key={inst.id} instance={inst} onExplain={handleExplain} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="delivered" className="mt-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {deliveredInstances.length === 0 && (
                <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">
                  <Rocket className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No delivered initiatives yet. Keep building!</p>
                </CardContent></Card>
              )}
              {deliveredInstances.map((inst: any) => (
                <InitiativeJourneyCard key={inst.id} instance={inst} onExplain={handleExplain} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="blockers" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {instances.filter((i: any) => Number(i.journey_friction_score || 0) > 0.2).length === 0 && (
                  <Card><CardContent className="p-8 text-center text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>No significant blockers detected.</p>
                  </CardContent></Card>
                )}
                {instances
                  .filter((i: any) => Number(i.journey_friction_score || 0) > 0.2)
                  .map((inst: any) => (
                    <Card key={inst.id} className="border-yellow-500/20">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-400" />
                          <span className="text-sm">{inst.initiative_id?.slice(0, 8)} — {STAGE_META[inst.current_visible_stage]?.label}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">Friction: {Math.round(Number(inst.journey_friction_score) * 100)}%</Badge>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="delivery" className="mt-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {instances.filter((i: any) => ['deploy', 'delivered'].includes(i.current_visible_stage)).length === 0 && (
                <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No initiatives in deploy or delivered state yet.</p>
                </CardContent></Card>
              )}
              {instances
                .filter((i: any) => ['deploy', 'delivered'].includes(i.current_visible_stage))
                .map((inst: any) => (
                  <Card key={inst.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        {inst.current_visible_stage === 'delivered'
                          ? <CheckCircle2 className="h-5 w-5 text-green-400" />
                          : <Rocket className="h-5 w-5 text-pink-400" />
                        }
                        <span className="font-medium text-sm">{inst.initiative_id?.slice(0, 8)}</span>
                        <Badge variant="secondary" className="text-[10px] ml-auto">
                          {STAGE_META[inst.current_visible_stage]?.label}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Deploy visibility: {Math.round(Number(inst.deployment_visibility_score || 0) * 100)}%
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
