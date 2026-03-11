import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, BookOpen, ShieldAlert, CheckSquare, Scale, ClipboardCheck, Loader2 } from "lucide-react";
import {
  usePurpleLearningOverview,
  usePurpleCandidates,
  usePurplePatterns,
  usePurpleAntiPatterns,
  usePurpleChecklists,
  usePurpleRules,
  usePurpleReviews,
  useSynthesizeLearning,
} from "@/hooks/usePurpleLearning";

const SEV: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-primary/20 text-primary border-primary/30",
  active: "bg-primary/20 text-primary border-primary/30",
  candidate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  pending: "bg-muted text-muted-foreground border-border",
};

export default function PurpleLearningDashboard() {
  const [tab, setTab] = useState("learnings");
  const [synthInput, setSynthInput] = useState({ resisted: "", failed: "", fragile: "" });
  const [synthResult, setSynthResult] = useState<any>(null);

  const overview = usePurpleLearningOverview();
  const candidates = usePurpleCandidates();
  const patterns = usePurplePatterns();
  const antiPatterns = usePurpleAntiPatterns();
  const checklists = usePurpleChecklists();
  const rules = usePurpleRules();
  const reviews = usePurpleReviews();
  const synthesize = useSynthesizeLearning();

  const s = overview.data ?? { total_candidates: 0, total_patterns: 0, total_anti_patterns: 0, total_checklists: 0, total_rules: 0, pending_reviews: 0 };

  const handleSynthesize = async () => {
    const result = await synthesize.mutateAsync({
      incident_type: "simulation_finding",
      severity: "medium",
      target_surface: "general",
      what_resisted: synthInput.resisted ? synthInput.resisted.split(",").map(s => s.trim()) : [],
      what_failed: synthInput.failed ? synthInput.failed.split(",").map(s => s.trim()) : [],
      what_was_fragile: synthInput.fragile ? synthInput.fragile.split(",").map(s => s.trim()) : [],
      response_actions: [],
      threat_domain: "general",
    });
    setSynthResult(result);
  };

  const Empty = ({ icon: Icon, text }: { icon: any; text: string }) => (
    <div className="text-center py-8"><Icon className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">{text}</p></div>
  );

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-accent-foreground" />Purple Learning & Security Canon
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Converting red/blue evidence into reusable security intelligence</p>
          </div>
          <Badge variant="outline" className="bg-accent/10 text-accent-foreground border-accent/30">Reviewed Only</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { l: "Candidates", v: s.total_candidates },
            { l: "Patterns", v: s.total_patterns },
            { l: "Anti-Patterns", v: s.total_anti_patterns },
            { l: "Checklists", v: s.total_checklists },
            { l: "Rules", v: s.total_rules },
            { l: "Pending Reviews", v: s.pending_reviews },
          ].map(m => (
            <Card key={m.l} className="border-border bg-card"><CardContent className="pt-3 pb-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{m.l}</div>
              <div className="text-xl font-bold text-foreground mt-1">{m.v}</div>
            </CardContent></Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-muted">
            <TabsTrigger value="learnings"><Sparkles className="h-3.5 w-3.5 mr-1" />Learnings</TabsTrigger>
            <TabsTrigger value="canon"><BookOpen className="h-3.5 w-3.5 mr-1" />Security Canon</TabsTrigger>
            <TabsTrigger value="anti"><ShieldAlert className="h-3.5 w-3.5 mr-1" />Anti-Patterns</TabsTrigger>
            <TabsTrigger value="rules"><CheckSquare className="h-3.5 w-3.5 mr-1" />Validation Rules</TabsTrigger>
            <TabsTrigger value="guidance"><Scale className="h-3.5 w-3.5 mr-1" />Dev Guidance</TabsTrigger>
            <TabsTrigger value="reviews"><ClipboardCheck className="h-3.5 w-3.5 mr-1" />Reviews</TabsTrigger>
          </TabsList>

          {/* Purple Learnings */}
          <TabsContent value="learnings" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-sm">Synthesize from Evidence</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-xs text-muted-foreground block mb-1">What Resisted (comma-sep)</label>
                    <Input className="bg-background border-border" value={synthInput.resisted} onChange={e => setSynthInput(p => ({ ...p, resisted: e.target.value }))} placeholder="rls_policy, schema_validation" /></div>
                  <div><label className="text-xs text-muted-foreground block mb-1">What Failed</label>
                    <Input className="bg-background border-border" value={synthInput.failed} onChange={e => setSynthInput(p => ({ ...p, failed: e.target.value }))} placeholder="optional_field_check" /></div>
                  <div><label className="text-xs text-muted-foreground block mb-1">What Was Fragile</label>
                    <Input className="bg-background border-border" value={synthInput.fragile} onChange={e => setSynthInput(p => ({ ...p, fragile: e.target.value }))} placeholder="rate_limiting" /></div>
                </div>
                <Button onClick={handleSynthesize} disabled={synthesize.isPending}>
                  {synthesize.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}Synthesize
                </Button>
                {synthResult && (
                  <div className="space-y-2 pt-2">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Generated Candidates ({synthResult.candidates?.length ?? 0})</div>
                    {synthResult.candidates?.map((c: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-foreground">{c.summary?.slice(0, 80)}</div>
                          <Badge variant="outline" className={SEV[c.pattern_type === "anti_pattern" ? "high" : "active"]}>{c.pattern_type?.replace(/_/g, " ")}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{c.guidance}</div>
                        <div className="text-xs text-primary">Confidence: {c.confidence_score}%</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-sm">Canon Candidates</CardTitle></CardHeader>
              <CardContent>
                {candidates.isLoading ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
                : (candidates.data?.candidates?.length ?? 0) === 0 ? <Empty icon={Sparkles} text="No candidates yet. Synthesize from red/blue evidence to generate." />
                : <div className="space-y-2">{candidates.data.candidates.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div><div className="text-sm font-medium text-foreground">{c.summary?.slice(0, 70)}</div><div className="text-xs text-muted-foreground">{c.domain} · {c.pattern_type?.replace(/_/g, " ")}</div></div>
                    <div className="flex gap-2"><Badge variant="outline">{c.confidence_score}%</Badge><Badge variant="outline" className={SEV[c.status] ?? SEV.pending}>{c.status}</Badge></div>
                  </div>
                ))}</div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Canon */}
          <TabsContent value="canon" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-sm">Security Pattern Entries</CardTitle></CardHeader>
              <CardContent>
                {patterns.isLoading ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
                : (patterns.data?.patterns?.length ?? 0) === 0 ? <Empty icon={BookOpen} text="No security patterns promoted yet." />
                : <div className="space-y-2">{patterns.data.patterns.map((p: any) => (
                  <div key={p.id} className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-foreground">{p.title}</div>
                      <Badge variant="outline" className={SEV[p.status] ?? SEV.pending}>{p.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{p.summary}</div>
                    <div className="flex gap-1 flex-wrap">{(p.agent_types ?? []).map((a: string) => <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>)}</div>
                  </div>
                ))}</div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Anti-Patterns */}
          <TabsContent value="anti" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-sm">Security Anti-Patterns</CardTitle></CardHeader>
              <CardContent>
                {antiPatterns.isLoading ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
                : (antiPatterns.data?.anti_patterns?.length ?? 0) === 0 ? <Empty icon={ShieldAlert} text="No anti-patterns recorded." />
                : <div className="space-y-2">{antiPatterns.data.anti_patterns.map((ap: any) => (
                  <div key={ap.id} className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-foreground">{ap.anti_pattern_name}</div>
                      <Badge variant="outline" className={SEV[ap.severity] ?? SEV.pending}>{ap.severity}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{ap.description}</div>
                    <div className="text-xs text-destructive">⚠ {ap.why_dangerous}</div>
                    <div className="text-xs text-primary">→ {ap.alternative_guidance}</div>
                  </div>
                ))}</div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Validation Rules */}
          <TabsContent value="rules" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-sm">Security Validation Rules</CardTitle></CardHeader>
              <CardContent>
                {rules.isLoading ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
                : (rules.data?.rules?.length ?? 0) === 0 ? <Empty icon={CheckSquare} text="No validation rules defined yet." />
                : <div className="space-y-2">{rules.data.rules.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div><div className="text-sm font-medium text-foreground">{r.rule_name}</div><div className="text-xs text-muted-foreground">{r.condition_description}</div></div>
                    <div className="flex gap-2"><Badge variant="outline">{r.target_agent_type}</Badge><Badge variant="outline" className={SEV[r.status] ?? SEV.pending}>{r.status}</Badge></div>
                  </div>
                ))}</div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dev Guidance (Checklists) */}
          <TabsContent value="guidance" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-sm">Secure Development Checklists</CardTitle></CardHeader>
              <CardContent>
                {checklists.isLoading ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
                : (checklists.data?.checklists?.length ?? 0) === 0 ? <Empty icon={Scale} text="No checklists defined yet." />
                : <div className="space-y-2">{checklists.data.checklists.map((cl: any) => (
                  <div key={cl.id} className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-foreground">{cl.checklist_name}</div>
                      <Badge variant="outline">{cl.target_agent_type}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{cl.domain} · Skip severity: {cl.severity_if_skipped}</div>
                  </div>
                ))}</div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews */}
          <TabsContent value="reviews" className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle className="text-sm">Purple Learning Reviews</CardTitle></CardHeader>
              <CardContent>
                {reviews.isLoading ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
                : (reviews.data?.reviews?.length ?? 0) === 0 ? <Empty icon={ClipboardCheck} text="No reviews pending. Candidates will appear here for steward approval." />
                : <div className="space-y-2">{reviews.data.reviews.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div><div className="text-sm font-medium text-foreground">{r.review_type?.replace(/_/g, " ")}</div><div className="text-xs text-muted-foreground">{r.review_notes || "Awaiting review"}</div></div>
                    <Badge variant="outline" className={SEV[r.decision] ?? SEV.pending}>{r.decision}</Badge>
                  </div>
                ))}</div>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
