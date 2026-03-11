import { useState, useMemo } from "react";

import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Route, Zap, Shield, Crown, AlertTriangle, ArrowRight,
  DollarSign, Server, Brain, Code, FileText, Users,
  CheckCircle2, XCircle, Clock,
} from "lucide-react";

// ── Canonical Matrix Data (mirrors ai-routing-matrix.ts) ──

type RoutingTier = "economy" | "balanced" | "high_confidence" | "premium";

interface MatrixRow {
  taskClass: string;
  description: string;
  examples: string[];
  defaultProvider: string;
  defaultModel: string;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  premiumModel: string | null;
  tier: RoutingTier;
  complexity: string;
  structureStrictness: string;
  costSensitivity: string;
  reliabilityRequirement: string;
  notes: string;
}

const MATRIX: MatrixRow[] = [
  { taskClass: "simple_transform", description: "Rewrite, shorten, clean text", examples: ["rewrite","paraphrase"], defaultProvider: "DeepSeek", defaultModel: "deepseek-chat", fallbackProvider: "OpenAI", fallbackModel: "gpt-5-mini", premiumModel: null, tier: "economy", complexity: "low", structureStrictness: "low", costSensitivity: "high", reliabilityRequirement: "low", notes: "Economy-first, low-risk" },
  { taskClass: "extraction", description: "Pull fields, classify inputs", examples: ["extract entities","classify"], defaultProvider: "DeepSeek", defaultModel: "deepseek-chat", fallbackProvider: "OpenAI", fallbackModel: "gpt-5-mini", premiumModel: null, tier: "economy", complexity: "low", structureStrictness: "medium", costSensitivity: "high", reliabilityRequirement: "medium", notes: "OpenAI if structure fails" },
  { taskClass: "summarization", description: "Summarize docs, logs, evidence", examples: ["summarize","condense"], defaultProvider: "DeepSeek", defaultModel: "deepseek-chat", fallbackProvider: "OpenAI", fallbackModel: "gpt-5-mini", premiumModel: null, tier: "economy", complexity: "low", structureStrictness: "low", costSensitivity: "high", reliabilityRequirement: "low", notes: "Output-heavy, cost-sensitive" },
  { taskClass: "drafting", description: "First-pass stories, reports, proposals", examples: ["draft PRD","write report"], defaultProvider: "DeepSeek", defaultModel: "deepseek-chat", fallbackProvider: "OpenAI", fallbackModel: "gpt-5-mini", premiumModel: null, tier: "balanced", complexity: "medium", structureStrictness: "medium", costSensitivity: "medium", reliabilityRequirement: "medium", notes: "DeepSeek first draft" },
  { taskClass: "workspace_analysis", description: "Adoption, post-deploy review", examples: ["adoption analysis","workspace review"], defaultProvider: "DeepSeek", defaultModel: "deepseek-chat", fallbackProvider: "OpenAI", fallbackModel: "gpt-5-mini", premiumModel: null, tier: "balanced", complexity: "medium", structureStrictness: "medium", costSensitivity: "medium", reliabilityRequirement: "medium", notes: "DeepSeek first" },
  { taskClass: "code_generation", description: "First-pass code, scaffolding", examples: ["generate code","scaffold"], defaultProvider: "DeepSeek", defaultModel: "deepseek-chat", fallbackProvider: "OpenAI", fallbackModel: "gpt-5-mini", premiumModel: null, tier: "balanced", complexity: "medium", structureStrictness: "medium", costSensitivity: "medium", reliabilityRequirement: "medium", notes: "Reasoner for harder cases" },
  { taskClass: "heavy_reasoning_cost_sensitive", description: "Deep analysis on budget", examples: ["complex analysis"], defaultProvider: "DeepSeek", defaultModel: "deepseek-reasoner", fallbackProvider: "OpenAI", fallbackModel: "gpt-5-mini", premiumModel: null, tier: "balanced", complexity: "high", structureStrictness: "medium", costSensitivity: "high", reliabilityRequirement: "medium", notes: "Reasoner for depth" },
  { taskClass: "code_refactor", description: "Refactor, cleanup, arch-aware changes", examples: ["refactor","cleanup code"], defaultProvider: "OpenAI", defaultModel: "gpt-5-mini", fallbackProvider: "DeepSeek", fallbackModel: "deepseek-reasoner", premiumModel: "gpt-5.4", tier: "high_confidence", complexity: "high", structureStrictness: "high", costSensitivity: "low", reliabilityRequirement: "high", notes: "Escalate for safety" },
  { taskClass: "strict_structured_output", description: "Schema-bound JSON outputs", examples: ["JSON schema","validated output"], defaultProvider: "OpenAI", defaultModel: "gpt-5-mini", fallbackProvider: null, fallbackModel: null, premiumModel: "gpt-5.4", tier: "high_confidence", complexity: "medium", structureStrictness: "high", costSensitivity: "low", reliabilityRequirement: "critical", notes: "Structure > cost" },
  { taskClass: "user_facing_response", description: "Final end-user responses", examples: ["customer response","user message"], defaultProvider: "OpenAI", defaultModel: "gpt-5-mini", fallbackProvider: "DeepSeek", fallbackModel: "deepseek-chat", premiumModel: "gpt-5.4", tier: "high_confidence", complexity: "medium", structureStrictness: "medium", costSensitivity: "low", reliabilityRequirement: "high", notes: "Clarity & confidence" },
  { taskClass: "governance_recommendation", description: "Approve/reject/defer, risk summary", examples: ["governance review","risk assessment"], defaultProvider: "OpenAI", defaultModel: "gpt-5-mini", fallbackProvider: null, fallbackModel: null, premiumModel: "gpt-5.4", tier: "high_confidence", complexity: "high", structureStrictness: "high", costSensitivity: "low", reliabilityRequirement: "critical", notes: "Reliability-first" },
  { taskClass: "architecture_reasoning", description: "Architecture trade-offs, system evolution", examples: ["arch review","structural analysis"], defaultProvider: "OpenAI", defaultModel: "gpt-5-mini", fallbackProvider: null, fallbackModel: null, premiumModel: "gpt-5.4", tier: "high_confidence", complexity: "high", structureStrictness: "high", costSensitivity: "low", reliabilityRequirement: "critical", notes: "No cheap fallback" },
  { taskClass: "premium_strategy", description: "Rare executive synthesis", examples: ["executive synthesis","strategic review"], defaultProvider: "OpenAI", defaultModel: "gpt-5.4", fallbackProvider: "OpenAI", fallbackModel: "gpt-5-mini", premiumModel: null, tier: "premium", complexity: "critical", structureStrictness: "high", costSensitivity: "low", reliabilityRequirement: "critical", notes: "Explicit premium path" },
];

const TIER_CONFIG: Record<RoutingTier, { label: string; color: string; icon: typeof Zap; description: string }> = {
  economy: { label: "Economy", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: DollarSign, description: "DeepSeek first — high volume, low cost" },
  balanced: { label: "Balanced", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Server, description: "DeepSeek first, OpenAI fallback" },
  high_confidence: { label: "High Confidence", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Shield, description: "OpenAI GPT-5-mini — reliability first" },
  premium: { label: "Premium", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Crown, description: "OpenAI GPT-5.4 — rare, critical only" },
};

const ESCALATION_TRIGGERS = [
  { from: "DeepSeek", to: "OpenAI GPT-5-mini", triggers: ["Invalid schema/JSON", "Tool-call structure failure", "Low confidence output", "Retry limit exceeded", "Timeout exceeded", "Task reclassified as high-risk"] },
  { from: "OpenAI GPT-5-mini", to: "GPT-5.4", triggers: ["Architecture review flagged critical", "Operator explicit premium request", "Governance flagged high-stakes", "Policy threshold marks premium-critical"] },
];

export default function AIRoutingPolicy() {
  const [activeTab, setActiveTab] = useState("matrix");
  const [filterTier, setFilterTier] = useState<RoutingTier | "all">("all");

  const filtered = useMemo(() =>
    filterTier === "all" ? MATRIX : MATRIX.filter(r => r.tier === filterTier),
    [filterTier]
  );

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { economy: 0, balanced: 0, high_confidence: 0, premium: 0 };
    MATRIX.forEach(r => counts[r.tier]++);
    return counts;
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Routing Policy</h1>
          <p className="text-muted-foreground mt-1">
            Canonical routing matrix governing all AI provider/model decisions in AxionOS.
          </p>
        </div>

        {/* Tier Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(Object.entries(TIER_CONFIG) as [RoutingTier, typeof TIER_CONFIG["economy"]][]).map(([tier, cfg]) => {
            const Icon = cfg.icon;
            return (
              <Card
                key={tier}
                className={`cursor-pointer transition-all ${filterTier === tier ? "ring-2 ring-primary" : ""}`}
                onClick={() => setFilterTier(filterTier === tier ? "all" : tier)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                    <span className="text-2xl font-bold text-foreground">{tierCounts[tier]}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon className="h-4 w-4" />
                    <span>{cfg.description}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="matrix">Routing Matrix</TabsTrigger>
            <TabsTrigger value="escalation">Escalation Policy</TabsTrigger>
            <TabsTrigger value="philosophy">Philosophy</TabsTrigger>
          </TabsList>

          <TabsContent value="matrix" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  Canonical Routing Matrix
                </CardTitle>
                <CardDescription>
                  {filterTier === "all" ? "All task classes" : `Filtered: ${TIER_CONFIG[filterTier].label} tier`}
                  {" · "}{filtered.length} entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task Class</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Default</TableHead>
                        <TableHead>Fallback</TableHead>
                        <TableHead>Premium</TableHead>
                        <TableHead>Structure</TableHead>
                        <TableHead>Reliability</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((row) => {
                        const tierCfg = TIER_CONFIG[row.tier];
                        return (
                          <TableRow key={row.taskClass}>
                            <TableCell>
                              <div>
                                <span className="font-mono text-sm text-foreground">{row.taskClass}</span>
                                <p className="text-xs text-muted-foreground mt-0.5">{row.description}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={tierCfg.color}>{tierCfg.label}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <span className="font-medium text-foreground">{row.defaultProvider}</span>
                                <p className="text-xs text-muted-foreground font-mono">{row.defaultModel}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {row.fallbackProvider ? (
                                <div className="text-sm">
                                  <span className="text-foreground">{row.fallbackProvider}</span>
                                  <p className="text-xs text-muted-foreground font-mono">{row.fallbackModel}</p>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {row.premiumModel ? (
                                <span className="text-xs font-mono text-purple-400">{row.premiumModel}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                row.structureStrictness === "high" ? "border-red-500/30 text-red-400" :
                                row.structureStrictness === "medium" ? "border-yellow-500/30 text-yellow-400" :
                                "border-muted text-muted-foreground"
                              }>
                                {row.structureStrictness}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                row.reliabilityRequirement === "critical" ? "border-red-500/30 text-red-400" :
                                row.reliabilityRequirement === "high" ? "border-amber-500/30 text-amber-400" :
                                row.reliabilityRequirement === "medium" ? "border-blue-500/30 text-blue-400" :
                                "border-muted text-muted-foreground"
                              }>
                                {row.reliabilityRequirement}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px]">{row.notes}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="escalation" className="mt-4">
            <div className="space-y-4">
              {ESCALATION_TRIGGERS.map((esc, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AlertTriangle className="h-5 w-5 text-amber-400" />
                      {esc.from}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      {esc.to}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {esc.triggers.map((t, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          {t}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <XCircle className="h-5 w-5 text-red-400" />
                    Explicit Non-Routes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    Never silently fall back to Gemini
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    Never route governance tasks to economy tier
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    Never use Pollinations unless explicitly enabled
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    Never expose provider choice to end users
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="philosophy" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-400" />
                    DeepSeek = Economy Engine
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Default for high-volume text work: drafting, summarization, tagging, extraction, rewriting, evidence organization, mid-complexity analysis.</p>
                  <p>Cost-optimized at ~$0.27/M tokens. Handles 60-70% of platform AI load.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-amber-400" />
                    GPT-5-mini = Confidence Engine
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Default for strict JSON, tool-calling, user-facing responses, governance, architecture reasoning, operator decision support.</p>
                  <p>Structure reliability and output confidence take priority over cost.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-purple-400" />
                    GPT-5.4 = Premium Escalation
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Reserved for rare high-stakes: executive synthesis, premium architecture review, critical strategic decisions.</p>
                  <p>Explicitly gated. Only used when policy or operator marks a case as premium-critical.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    Gemini = Explicitly Removed
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Gemini is not used as a default route anywhere. When the Lovable Gateway is used as transport (no external keys), explicit OpenAI model names are set.</p>
                  <p>The platform controls its own model selection — it never defers to gateway defaults.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
