import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  ShieldAlert, MapIcon, Swords, ShieldCheck, Sparkles, BookOpen,
  Clock, AlertTriangle, CheckCircle2, XCircle, ArrowRight, Target,
  Bot, FileCode, Boxes, Network, Server, Lock, Flame, Activity,
  Shield, Zap, Eye, TrendingUp, BarChart3, FileWarning,
} from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_KPIS = {
  activeSurfaces: 14,
  redTeamSims: 8,
  blueTeamAlerts: 23,
  purpleLearnings: 31,
  canonEntries: 47,
  recoveryReadiness: 82,
};

const THREAT_SURFACES = [
  { name: "Agent Execution", risk: 72, incidents: 5, color: "hsl(var(--destructive))" },
  { name: "Contract Validation", risk: 45, incidents: 3, color: "hsl(var(--warning))" },
  { name: "Runtime Pipeline", risk: 61, incidents: 4, color: "hsl(var(--axion-orange))" },
  { name: "Retrieval Context", risk: 38, incidents: 2, color: "hsl(var(--warning))" },
  { name: "Tenant Boundaries", risk: 15, incidents: 0, color: "hsl(var(--success))" },
  { name: "Deploy Surfaces", risk: 52, incidents: 3, color: "hsl(var(--axion-orange))" },
  { name: "Auth & Permissions", risk: 28, incidents: 1, color: "hsl(var(--success))" },
  { name: "Data Storage", risk: 33, incidents: 1, color: "hsl(var(--warning))" },
];

const WAR_TIMELINE = [
  { time: "12:34", event: "Red Team simulation started", type: "red", icon: Swords, detail: "Contract input pressure — agent boundary" },
  { time: "12:36", event: "Fragility detected", type: "warning", icon: AlertTriangle, detail: "Validation bypass partial success on retrieval layer" },
  { time: "12:37", event: "Breach attempt blocked", type: "blue", icon: ShieldCheck, detail: "Permission boundary probe rejected — tenant isolation intact" },
  { time: "12:38", event: "Containment applied", type: "blue", icon: Lock, detail: "Execution isolated, validation intensity increased" },
  { time: "12:40", event: "Rollback advisory issued", type: "neutral", icon: Clock, detail: "Recovery posture assessed — rollback viability confirmed" },
  { time: "12:42", event: "Learning synthesized", type: "purple", icon: Sparkles, detail: "New secure architecture pattern extracted → Canon candidate" },
  { time: "12:45", event: "Canon entry promoted", type: "canon", icon: BookOpen, detail: "Hardening checklist for retrieval context added to active canon" },
  { time: "12:48", event: "Blue Team alert cleared", type: "success", icon: CheckCircle2, detail: "All containment measures verified — normal posture restored" },
];

const ERROR_SUCCESS_MATRIX = {
  detected: [
    { label: "Contract bypass attempt", severity: "critical", surface: "Agent Execution" },
    { label: "Retrieval context poisoning", severity: "high", surface: "Retrieval Context" },
    { label: "Validation escape pattern", severity: "high", surface: "Runtime Pipeline" },
    { label: "Permission boundary probe", severity: "medium", surface: "Tenant Boundaries" },
    { label: "Insecure artifact signal", severity: "medium", surface: "Deploy Surfaces" },
  ],
  responded: [
    { label: "Execution isolated", action: "isolate_execution" },
    { label: "Validation intensity increased", action: "increase_validation" },
    { label: "Human review recommended", action: "recommend_review" },
    { label: "Governance review opened", action: "governance_review" },
    { label: "Rollback advisory triggered", action: "rollback_advisory" },
  ],
  canonized: [
    { label: "Retrieval hardening checklist", type: "hardening_checklist" },
    { label: "Agent boundary isolation pattern", type: "secure_architecture_pattern" },
    { label: "Contract validation anti-pattern", type: "anti_pattern" },
    { label: "Tenant scope verification rule", type: "validation_rule" },
  ],
};

const CANON_INFLUENCE = [
  { agent: "Architecture Agent", patterns: 12, lastUsed: "2m ago", icon: Boxes, usage: 89 },
  { agent: "Build Agent", patterns: 18, lastUsed: "5m ago", icon: FileCode, usage: 76 },
  { agent: "Validation Agent", patterns: 23, lastUsed: "1m ago", icon: CheckCircle2, usage: 94 },
  { agent: "Coordination Agent", patterns: 8, lastUsed: "12m ago", icon: Network, usage: 62 },
];

const CONTRACT_BOUNDARIES = [
  { contract: "AgentExecutionContract", pressure: 4, blocked: 3, fragile: 1, status: "monitored" },
  { contract: "TenantIsolationContract", pressure: 2, blocked: 2, fragile: 0, status: "secure" },
  { contract: "ValidationPipelineContract", pressure: 6, blocked: 5, fragile: 1, status: "monitored" },
  { contract: "DeployGateContract", pressure: 1, blocked: 1, fragile: 0, status: "secure" },
  { contract: "RetrievalContextContract", pressure: 5, blocked: 3, fragile: 2, status: "at_risk" },
  { contract: "RuntimeActionContract", pressure: 3, blocked: 3, fragile: 0, status: "secure" },
];

const RED_TEAM_SCENARIOS = [
  { name: "Contract Input Pressure", runs: 12, fragility: 34, breaches: 0, status: "completed" },
  { name: "Validation Bypass Attempt", runs: 8, fragility: 52, breaches: 1, status: "completed" },
  { name: "Permission Boundary Probe", runs: 15, fragility: 18, breaches: 0, status: "running" },
  { name: "Unsafe Tool Action Request", runs: 6, fragility: 41, breaches: 0, status: "completed" },
  { name: "Retrieval Context Poisoning", runs: 10, fragility: 67, breaches: 2, status: "review" },
  { name: "Tenant Boundary Scope Check", runs: 9, fragility: 12, breaches: 0, status: "completed" },
];

const BLUE_TEAM_ALERTS = [
  { id: 1, type: "contract_anomaly", severity: "critical", surface: "Agent Execution", status: "contained", time: "2m ago" },
  { id: 2, type: "unsafe_runtime_action", severity: "high", surface: "Runtime Pipeline", status: "investigating", time: "8m ago" },
  { id: 3, type: "suspicious_retrieval_context", severity: "high", surface: "Retrieval Context", status: "resolved", time: "15m ago" },
  { id: 4, type: "repeated_validation_escape", severity: "medium", surface: "Validation", status: "monitoring", time: "22m ago" },
  { id: 5, type: "observability_gap", severity: "low", surface: "Observability", status: "acknowledged", time: "45m ago" },
];

// ─── Utility Components ─────────────────────────────────────────────────────

function KpiCard({ value, label, icon: Icon, warn, accent }: {
  value: number | string; label: string; icon: React.ElementType; warn?: boolean; accent?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className={`border ${warn ? "border-destructive/40 bg-destructive/5" : accent ? "border-primary/30 bg-primary/5" : "border-border/30 bg-card/60"} backdrop-blur-sm`}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`p-2 rounded-lg ${warn ? "bg-destructive/20" : accent ? "bg-primary/20" : "bg-muted/40"}`}>
            <Icon className={`h-5 w-5 ${warn ? "text-destructive" : accent ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div>
            <div className={`text-2xl font-bold font-['Space_Grotesk'] ${warn ? "text-destructive" : ""}`}>{value}</div>
            <div className="text-[11px] text-muted-foreground">{label}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: "bg-destructive/20 text-destructive border-destructive/30",
    high: "bg-axion-orange/20 text-axion-orange border-axion-orange/30",
    medium: "bg-warning/20 text-warning border-warning/30",
    low: "bg-muted/30 text-muted-foreground border-border/30",
  };
  return <Badge variant="outline" className={`text-[10px] ${styles[severity] || styles.low}`}>{severity}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    secure: "bg-success/20 text-success border-success/30",
    monitored: "bg-warning/20 text-warning border-warning/30",
    at_risk: "bg-destructive/20 text-destructive border-destructive/30",
    completed: "bg-success/20 text-success border-success/30",
    running: "bg-primary/20 text-primary border-primary/30",
    review: "bg-axion-purple/20 text-axion-purple border-axion-purple/30",
    contained: "bg-primary/20 text-primary border-primary/30",
    investigating: "bg-warning/20 text-warning border-warning/30",
    resolved: "bg-success/20 text-success border-success/30",
    monitoring: "bg-muted/30 text-muted-foreground border-border/30",
    acknowledged: "bg-muted/30 text-muted-foreground border-border/30",
  };
  return <Badge variant="outline" className={`text-[10px] ${styles[status] || ""}`}>{status}</Badge>;
}

// ─── Heatmap ────────────────────────────────────────────────────────────────

function ThreatHeatmap() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {THREAT_SURFACES.map((s, i) => (
        <motion.div key={s.name} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}>
          <Card className="border border-border/20 bg-card/40 backdrop-blur-sm overflow-hidden relative">
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{ background: `radial-gradient(circle at 50% 100%, ${s.color}, transparent 70%)` }}
            />
            <CardContent className="p-4 relative z-10">
              <div className="text-xs text-muted-foreground mb-1">{s.name}</div>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold font-['Space_Grotesk']" style={{ color: s.color }}>{s.risk}</div>
                <div className="text-[10px] text-muted-foreground">{s.incidents} incidents</div>
              </div>
              <Progress value={s.risk} className="h-1.5 mt-2" />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ─── War Timeline ───────────────────────────────────────────────────────────

function WarTimeline() {
  const typeColors: Record<string, string> = {
    red: "border-destructive/60 bg-destructive/10",
    warning: "border-warning/60 bg-warning/10",
    blue: "border-primary/60 bg-primary/10",
    purple: "border-axion-purple/60 bg-axion-purple/10",
    canon: "border-axion-cyan/60 bg-axion-cyan/10",
    success: "border-success/60 bg-success/10",
    neutral: "border-border/40 bg-muted/20",
  };
  const dotColors: Record<string, string> = {
    red: "bg-destructive", warning: "bg-warning", blue: "bg-primary",
    purple: "bg-axion-purple", canon: "bg-axion-cyan", success: "bg-success", neutral: "bg-muted-foreground",
  };

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[22px] top-0 bottom-0 w-px bg-gradient-to-b from-destructive/40 via-primary/40 to-success/40" />

      <div className="space-y-1">
        {WAR_TIMELINE.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`relative flex items-start gap-4 p-3 rounded-lg border ${typeColors[item.type]} ml-0`}
          >
            {/* Dot on timeline */}
            <div className="flex flex-col items-center min-w-[44px]">
              <div className={`w-3 h-3 rounded-full ${dotColors[item.type]} ring-2 ring-background z-10`} />
              <span className="text-[10px] text-muted-foreground mt-1 font-mono">{item.time}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="text-sm font-medium truncate">{item.event}</span>
              </div>
              <span className="text-xs text-muted-foreground">{item.detail}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Error / Success / Correction Matrix ────────────────────────────────────

function ResilienceMatrix() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Failures Detected */}
      <Card className="border border-destructive/20 bg-destructive/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            Failures Detected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ERROR_SUCCESS_MATRIX.detected.map((d, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded bg-background/40 border border-border/10">
              <div>
                <div className="text-xs font-medium">{d.label}</div>
                <div className="text-[10px] text-muted-foreground">{d.surface}</div>
              </div>
              <SeverityBadge severity={d.severity} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Responses Applied */}
      <Card className="border border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Responses Applied
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ERROR_SUCCESS_MATRIX.responded.map((r, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded bg-background/40 border border-border/10">
              <div className="text-xs font-medium">{r.label}</div>
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">{r.action.replace(/_/g, " ")}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Corrections Canonized */}
      <Card className="border border-axion-purple/20 bg-axion-purple/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-axion-purple" />
            Corrections Canonized
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ERROR_SUCCESS_MATRIX.canonized.map((c, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded bg-background/40 border border-border/10">
              <div className="text-xs font-medium">{c.label}</div>
              <Badge variant="outline" className="text-[10px] bg-axion-purple/10 text-axion-purple border-axion-purple/20">{c.type.replace(/_/g, " ")}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Canon Influence Panel ──────────────────────────────────────────────────

function CanonInfluencePanel() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {CANON_INFLUENCE.map((agent, i) => (
        <motion.div key={agent.agent} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
          <Card className="border border-border/20 bg-card/40 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <agent.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="text-sm font-medium">{agent.agent}</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Patterns used</span>
                  <span className="font-bold">{agent.patterns}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Canon usage</span>
                  <span className="font-bold text-primary">{agent.usage}%</span>
                </div>
                <Progress value={agent.usage} className="h-1.5" />
                <div className="text-[10px] text-muted-foreground text-right">Last used {agent.lastUsed}</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Contract Boundary Viewer ───────────────────────────────────────────────

function ContractBoundaryViewer() {
  return (
    <div className="space-y-2">
      {CONTRACT_BOUNDARIES.map((c, i) => (
        <motion.div key={c.contract} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
          <Card className="border border-border/20 bg-card/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileWarning className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium font-mono">{c.contract}</span>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-warning">{c.pressure}</div>
                  <div className="text-[10px] text-muted-foreground">Pressure events</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-success">{c.blocked}</div>
                  <div className="text-[10px] text-muted-foreground">Blocked</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-destructive">{c.fragile}</div>
                  <div className="text-[10px] text-muted-foreground">Fragile</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Red Team Tab ───────────────────────────────────────────────────────────

function RedTeamTab() {
  return (
    <div className="space-y-3">
      {RED_TEAM_SCENARIOS.map((s, i) => (
        <Card key={s.name} className="border border-border/20 bg-card/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">{s.name}</span>
              </div>
              <StatusBadge status={s.status} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold">{s.runs}</div>
                <div className="text-[10px] text-muted-foreground">Runs</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-warning">{s.fragility}</div>
                <div className="text-[10px] text-muted-foreground">Fragility</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${s.breaches > 0 ? "text-destructive" : "text-success"}`}>{s.breaches}</div>
                <div className="text-[10px] text-muted-foreground">Breaches</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Blue Team Tab ──────────────────────────────────────────────────────────

function BlueTeamTab() {
  return (
    <div className="space-y-2">
      {BLUE_TEAM_ALERTS.map((a) => (
        <Card key={a.id} className="border border-border/20 bg-card/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <div>
                <div className="text-sm font-medium">{a.type.replace(/_/g, " ")}</div>
                <div className="text-[10px] text-muted-foreground">{a.surface} · {a.time}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SeverityBadge severity={a.severity} />
              <StatusBadge status={a.status} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Purple Learnings Tab ───────────────────────────────────────────────────

function PurpleLearningsTab() {
  const learnings = [
    { pattern: "Retrieval context must validate provenance before injection", type: "secure_architecture_pattern", confidence: 92, source: "Red Team Run #7" },
    { pattern: "Agent boundary contracts must reject cascaded tool calls", type: "validation_rule", confidence: 88, source: "Incident #12" },
    { pattern: "Deploy gates should verify artifact integrity hash", type: "hardening_checklist", confidence: 95, source: "Red Team Run #3" },
    { pattern: "Avoid shared mutable state across tenant-scoped agents", type: "anti_pattern", confidence: 91, source: "Blue Team Alert #19" },
    { pattern: "Runtime action requests must carry scope attestation", type: "contract_safety_guideline", confidence: 87, source: "Purple Review #5" },
  ];

  return (
    <div className="space-y-3">
      <Card className="border border-axion-purple/20 bg-axion-purple/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-axion-purple" />
            How security learnings improve future builds
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>After Sprint 146, all future software generation uses: security patterns, hardening checklists, anti-patterns, validation rules, and contract guidance from the Security Canon.</p>
          <p className="text-axion-purple font-medium">The system doesn't just react to risk — it builds safer software from the start.</p>
        </CardContent>
      </Card>

      {learnings.map((l, i) => (
        <Card key={i} className="border border-border/20 bg-card/40">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-sm font-medium mb-1">{l.pattern}</div>
                <div className="text-[10px] text-muted-foreground">Source: {l.source}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline" className="text-[10px] bg-axion-purple/10 text-axion-purple border-axion-purple/20">
                  {l.type.replace(/_/g, " ")}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{l.confidence}% confidence</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Security Canon Tab ─────────────────────────────────────────────────────

function SecurityCanonTab() {
  return (
    <div className="space-y-4">
      <CanonInfluencePanel />
      <Card className="border border-border/20 bg-card/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Canon Coverage Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Architecture Patterns", count: 12, total: 15 },
              { label: "Implementation Patterns", count: 18, total: 22 },
              { label: "Validation Rules", count: 23, total: 25 },
              { label: "Anti-Patterns", count: 8, total: 10 },
            ].map((c) => (
              <div key={c.label} className="text-center">
                <div className="text-lg font-bold font-['Space_Grotesk']">{c.count}<span className="text-muted-foreground text-sm">/{c.total}</span></div>
                <div className="text-[10px] text-muted-foreground">{c.label}</div>
                <Progress value={(c.count / c.total) * 100} className="h-1 mt-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function SecurityWarRoom() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <ScrollArea className="h-[calc(100vh-1rem)]">
          <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
            {/* ═══ Header ═══ */}
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-destructive/20 via-primary/20 to-axion-purple/20 border border-destructive/20">
                  <ShieldAlert className="h-7 w-7 text-destructive" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-['Space_Grotesk'] tracking-tight">
                    Security War Room
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Governed adversarial resilience, detection, response, and canonized learning
                  </p>
                </div>
              </div>
            </motion.div>

            {/* ═══ KPIs ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard value={MOCK_KPIS.activeSurfaces} label="Active Threat Surfaces" icon={Target} />
              <KpiCard value={MOCK_KPIS.redTeamSims} label="Red Team Simulations" icon={Swords} warn />
              <KpiCard value={MOCK_KPIS.blueTeamAlerts} label="Blue Team Alerts" icon={ShieldCheck} warn={MOCK_KPIS.blueTeamAlerts > 10} />
              <KpiCard value={MOCK_KPIS.purpleLearnings} label="Purple Learnings" icon={Sparkles} accent />
              <KpiCard value={MOCK_KPIS.canonEntries} label="Security Canon Entries" icon={BookOpen} accent />
              <KpiCard value={`${MOCK_KPIS.recoveryReadiness}%`} label="Recovery Readiness" icon={Activity} accent />
            </div>

            {/* ═══ Tabs ═══ */}
            <Tabs defaultValue="surface-map" className="space-y-4">
              <TabsList className="bg-muted/20 border border-border/20 flex-wrap h-auto gap-0.5 p-1">
                <TabsTrigger value="surface-map" className="text-xs gap-1.5"><MapIcon className="h-3.5 w-3.5" />Surface Map</TabsTrigger>
                <TabsTrigger value="red-team" className="text-xs gap-1.5"><Swords className="h-3.5 w-3.5" />Red Team</TabsTrigger>
                <TabsTrigger value="blue-team" className="text-xs gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Blue Team</TabsTrigger>
                <TabsTrigger value="purple" className="text-xs gap-1.5"><Sparkles className="h-3.5 w-3.5" />Purple Learnings</TabsTrigger>
                <TabsTrigger value="canon" className="text-xs gap-1.5"><BookOpen className="h-3.5 w-3.5" />Security Canon</TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs gap-1.5"><Clock className="h-3.5 w-3.5" />War Timeline</TabsTrigger>
                <TabsTrigger value="contracts" className="text-xs gap-1.5"><FileWarning className="h-3.5 w-3.5" />Contracts & Boundaries</TabsTrigger>
              </TabsList>

              {/* Surface Map */}
              <TabsContent value="surface-map" className="space-y-4">
                <ThreatHeatmap />
                <ResilienceMatrix />
              </TabsContent>

              {/* Red Team */}
              <TabsContent value="red-team">
                <RedTeamTab />
              </TabsContent>

              {/* Blue Team */}
              <TabsContent value="blue-team">
                <BlueTeamTab />
              </TabsContent>

              {/* Purple Learnings */}
              <TabsContent value="purple">
                <PurpleLearningsTab />
              </TabsContent>

              {/* Security Canon */}
              <TabsContent value="canon">
                <SecurityCanonTab />
              </TabsContent>

              {/* War Timeline */}
              <TabsContent value="timeline">
                <WarTimeline />
              </TabsContent>

              {/* Contracts & Boundaries */}
              <TabsContent value="contracts">
                <ContractBoundaryViewer />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
