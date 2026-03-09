/**
 * Block W — Shared UI Components
 * Consistent posture badges, severity badges, cross-sprint navigation,
 * admin forms, causal modifier cards, and historical views across Sprints 107–110.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, Plus, ArrowRight, Info, Activity, Zap } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// ─── Consistent Badge Components ───

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-muted text-muted-foreground border-border",
  elevated: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  acceptable: "bg-green-500/20 text-green-400 border-green-500/30",
  unacceptable: "bg-destructive/20 text-destructive border-destructive/30",
};

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge variant="outline" className={SEVERITY_STYLES[severity] || SEVERITY_STYLES.low}>
      {severity}
    </Badge>
  );
}

const POSTURE_STYLES: Record<string, string> = {
  balanced: "bg-primary/20 text-primary border-primary/30",
  short_biased: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  long_unsupported: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  mission_eroding: "bg-destructive/20 text-destructive border-destructive/30",
  conflicted: "bg-destructive/20 text-destructive border-destructive/30",
  net_positive: "bg-green-500/20 text-green-400 border-green-500/30",
  net_sacrifice: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  hidden_sacrifice: "bg-destructive/20 text-destructive border-destructive/30",
  mission_aligned: "bg-green-500/20 text-green-400 border-green-500/30",
  healthy_adaptation: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  mild_drift: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  significant_drift: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  active_erosion: "bg-destructive/20 text-destructive border-destructive/30",
  normative_compromise: "bg-destructive/30 text-destructive border-destructive/40",
  resilient: "bg-green-500/20 text-green-400 border-green-500/30",
  strained_but_viable: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  degraded: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  fragile: "bg-destructive/20 text-destructive border-destructive/30",
  stable: "bg-green-500/20 text-green-400 border-green-500/30",
  strained: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  fragmented: "bg-destructive/20 text-destructive border-destructive/30",
  collapsed: "bg-destructive/30 text-destructive border-destructive/40",
  adaptive_recovery: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export function PostureBadge({ posture }: { posture: string }) {
  return (
    <Badge variant="outline" className={POSTURE_STYLES[posture] || "bg-muted text-muted-foreground"}>
      {posture.replace(/_/g, " ")}
    </Badge>
  );
}

// ─── Cross-Sprint Navigation ───

interface CrossLinkProps { label: string; route: string; context?: string; }

export function CrossSprintLink({ label, route, context }: CrossLinkProps) {
  const navigate = useNavigate();
  return (
    <Button variant="ghost" size="sm" className="gap-1 text-xs h-auto py-1 px-2 text-muted-foreground hover:text-foreground" onClick={() => navigate(route)}>
      <ArrowRight className="h-3 w-3" />{label}
      {context && <span className="text-muted-foreground/60">({context})</span>}
    </Button>
  );
}

export function CrossSprintSignalCard({ title, signals, relatedRoute, relatedLabel }: {
  title: string;
  signals: { label: string; value: string | number; severity?: string }[];
  relatedRoute?: string;
  relatedLabel?: string;
}) {
  const navigate = useNavigate();
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-muted-foreground" />{title}</CardTitle>
          {relatedRoute && relatedLabel && (
            <Button variant="ghost" size="sm" className="text-xs h-auto py-1 px-2 gap-1" onClick={() => navigate(relatedRoute)}>
              <ExternalLink className="h-3 w-3" /> {relatedLabel}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {signals.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{s.label}</span>
              {s.severity ? <SeverityBadge severity={s.severity} /> : (
                <span className="font-mono font-medium">{typeof s.value === "number" ? `${Math.round(s.value * 100)}%` : s.value}</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Causal Modifier Transparency Card ───

interface CausalModifierDisplay {
  source_sprint: string;
  source_signal: string;
  target_score: string;
  modifier_value: number;
  rationale: string;
}

export function CausalModifierCard({ modifiers, title }: { modifiers: CausalModifierDisplay[]; title?: string }) {
  if (!modifiers || modifiers.length === 0) return (
    <Card className="border-border/50">
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground text-center">No causal cross-sprint modifiers active. Run evaluations in upstream sprints to generate signals.</p>
      </CardContent>
    </Card>
  );

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-primary" />
          {title || "Causal Cross-Sprint Modifiers"}
        </CardTitle>
        <CardDescription className="text-xs">These scores were adjusted based on upstream sprint signals. Modifiers are bounded (max ±15% per signal, ±25% total).</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {modifiers.map((m, i) => (
            <div key={i} className="border border-border/30 rounded-md p-2 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">{m.source_sprint}</Badge>
                  <span className="text-xs text-muted-foreground">→</span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">{m.target_score.replace(/_/g, " ")}</Badge>
                </div>
                <span className={`font-mono text-xs font-medium ${m.modifier_value > 0 ? "text-destructive" : "text-green-400"}`}>
                  {m.modifier_value > 0 ? "+" : ""}{(m.modifier_value * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">{m.source_signal}</p>
              <p className="text-[10px] text-muted-foreground/70 italic">{m.rationale}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Score Display ───

export function ScoreBar({ label, value, dangerous }: { label: string; value: number; dangerous?: boolean }) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-mono font-medium ${dangerous && pct > 40 ? "text-destructive" : ""}`}>{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

// ─── Generic Admin Create/Edit Dialog ───

interface FieldDef {
  name: string; label: string; type: "text" | "textarea" | "select";
  options?: { value: string; label: string }[]; required?: boolean; placeholder?: string;
}

export function AdminCreateDialog({ title, fields, onSubmit, trigger }: {
  title: string; fields: FieldDef[];
  onSubmit: (values: Record<string, string>) => Promise<void>;
  trigger?: React.ReactNode;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    try { await onSubmit(values); setValues({}); setOpen(false); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (<Button variant="outline" size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> {title}</Button>)}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1">
              <Label className="text-xs">{f.label}{f.required && " *"}</Label>
              {f.type === "textarea" ? (
                <Textarea placeholder={f.placeholder} value={values[f.name] || ""} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} className="min-h-[80px]" />
              ) : f.type === "select" ? (
                <Select value={values[f.name] || ""} onValueChange={(val) => setValues((v) => ({ ...v, [f.name]: val }))}>
                  <SelectTrigger><SelectValue placeholder={f.placeholder || "Select…"} /></SelectTrigger>
                  <SelectContent>{f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input placeholder={f.placeholder} value={values[f.name] || ""} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
          <Button size="sm" onClick={handleSubmit} disabled={saving}>{saving ? "Saving…" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Scoring Transparency Card ───

export function ScoringTransparencyCard({ scores }: {
  scores: { label: string; value: number; method: "heuristic" | "structural" }[];
}) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><Info className="h-3.5 w-3.5 text-muted-foreground" />Scoring Transparency</CardTitle>
        <CardDescription className="text-xs">How each score is derived</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {scores.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{s.label}</span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">{s.method}</Badge>
              </div>
              <span className="font-mono">{Math.round(s.value * 100)}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
