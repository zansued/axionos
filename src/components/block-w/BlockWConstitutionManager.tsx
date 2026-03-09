/**
 * Block W — Constitution Management UI
 * Create, edit, activate, deprecate constitutions across all 4 Block W sprints.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Plus, Edit2, CheckCircle2, Archive, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  active: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  superseded: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  deprecated: "bg-destructive/20 text-destructive border-destructive/30",
};

interface ConstitutionField {
  name: string;
  label: string;
  type: "text" | "textarea" | "json";
  placeholder?: string;
  required?: boolean;
}

interface ConstitutionManagerProps {
  tableName: string;
  sprintLabel: string;
  orgId: string;
  constitutions: any[];
  loading: boolean;
  onRefresh: () => void;
  fields: ConstitutionField[];
  extraDefaults?: Record<string, any>;
}

export function BlockWConstitutionManager({
  tableName,
  sprintLabel,
  orgId,
  constitutions,
  loading,
  onRefresh,
  fields,
  extraDefaults = {},
}: ConstitutionManagerProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setValues({});
  }

  async function handleCreate() {
    if (!values.constitution_name?.trim()) {
      toast.error("Constitution name is required");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        organization_id: orgId,
        constitution_name: values.constitution_name.trim(),
        constitution_code: values.constitution_name.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 40),
        status: "draft",
        ...extraDefaults,
      };

      for (const f of fields) {
        if (f.name === "constitution_name") continue;
        if (f.type === "json") {
          try {
            payload[f.name] = values[f.name] ? JSON.parse(values[f.name]) : {};
          } catch {
            payload[f.name] = {};
          }
        } else {
          payload[f.name] = values[f.name] || "";
        }
      }

      const { error } = await supabase.from(tableName as any).insert(payload as any);
      if (error) throw error;
      toast.success("Constitution created");
      resetForm();
      setCreateOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to create constitution");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!editTarget) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      for (const f of fields) {
        if (f.type === "json") {
          try {
            payload[f.name] = values[f.name] ? JSON.parse(values[f.name]) : editTarget[f.name];
          } catch {
            payload[f.name] = editTarget[f.name];
          }
        } else {
          payload[f.name] = values[f.name] ?? editTarget[f.name] ?? "";
        }
      }
      payload.updated_at = new Date().toISOString();

      const { error } = await supabase.from(tableName as any).update(payload as any).eq("id", editTarget.id);
      if (error) throw error;
      toast.success("Constitution updated");
      resetForm();
      setEditOpen(false);
      setEditTarget(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      // If activating, supersede current active
      if (newStatus === "active") {
        const currentActive = constitutions.find((c: any) => c.status === "active");
        if (currentActive && currentActive.id !== id) {
          await supabase.from(tableName as any).update({ status: "superseded", updated_at: new Date().toISOString() } as any).eq("id", currentActive.id);
        }
      }
      const { error } = await supabase.from(tableName as any).update({ status: newStatus, updated_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
      toast.success(`Constitution ${newStatus}`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to change status");
    }
  }

  function openEdit(constitution: any) {
    setEditTarget(constitution);
    const v: Record<string, string> = {};
    for (const f of fields) {
      if (f.type === "json") {
        v[f.name] = JSON.stringify(constitution[f.name] ?? {}, null, 2);
      } else {
        v[f.name] = constitution[f.name] ?? "";
      }
    }
    setValues(v);
    setEditOpen(true);
  }

  const active = constitutions.find((c: any) => c.status === "active");

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> {sprintLabel} Constitutions
          </CardTitle>
          <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Plus className="h-3.5 w-3.5" /> New Constitution
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create {sprintLabel} Constitution</DialogTitle></DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-3 pr-4">
                  {fields.map((f) => (
                    <div key={f.name} className="space-y-1">
                      <Label className="text-xs">{f.label}{f.required && " *"}</Label>
                      {f.type === "textarea" || f.type === "json" ? (
                        <Textarea
                          placeholder={f.placeholder}
                          value={values[f.name] || ""}
                          onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                          className="min-h-[80px] font-mono text-xs"
                        />
                      ) : (
                        <Input
                          placeholder={f.placeholder}
                          value={values[f.name] || ""}
                          onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <DialogFooter>
                <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
                <Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "Creating…" : "Create as Draft"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {active && (
          <CardDescription className="flex items-center gap-1.5 mt-1">
            <Shield className="h-3 w-3 text-green-500" />
            Active: <span className="font-medium text-foreground">{active.constitution_name}</span>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16" />)}</div>
        ) : constitutions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No constitutions yet. Create one to define governance principles.</p>
        ) : (
          <div className="space-y-2">
            {constitutions.map((c: any) => (
              <div key={c.id} className="border border-border/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.constitution_name}</span>
                    <Badge variant="outline" className={STATUS_STYLES[c.status] || STATUS_STYLES.draft}>
                      {c.status}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEdit(c)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    {c.status === "draft" && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-green-600" onClick={() => handleStatusChange(c.id, "active")}>
                        <CheckCircle2 className="h-3 w-3" />
                      </Button>
                    )}
                    {c.status === "active" && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-yellow-600" onClick={() => handleStatusChange(c.id, "superseded")}>
                        <Archive className="h-3 w-3" />
                      </Button>
                    )}
                    {(c.status === "superseded" || c.status === "draft") && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => handleStatusChange(c.id, "deprecated")}>
                        <Archive className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{c.constitution_code} · Updated {new Date(c.updated_at || c.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { setEditTarget(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Constitution</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-4">
              {fields.map((f) => (
                <div key={f.name} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  {f.type === "textarea" || f.type === "json" ? (
                    <Textarea
                      placeholder={f.placeholder}
                      value={values[f.name] || ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                      className="min-h-[80px] font-mono text-xs"
                    />
                  ) : (
                    <Input
                      value={values[f.name] || ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleEdit} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Field definitions per sprint ──

export const HORIZON_CONSTITUTION_FIELDS: ConstitutionField[] = [
  { name: "constitution_name", label: "Constitution Name", type: "text", required: true, placeholder: "e.g. Strategic Alignment Constitution v1" },
  { name: "horizon_principles", label: "Horizon Principles", type: "textarea", placeholder: "Describe the principles guiding horizon alignment…" },
  { name: "default_horizon_weights", label: "Default Horizon Weights (JSON)", type: "json", placeholder: '{"short_term": 0.25, "medium_term": 0.30, "long_term": 0.25, "mission_continuity": 0.20}' },
];

export const TRADEOFF_CONSTITUTION_FIELDS: ConstitutionField[] = [
  { name: "constitution_name", label: "Constitution Name", type: "text", required: true, placeholder: "e.g. Tradeoff Governance Constitution v1" },
  { name: "tradeoff_principles", label: "Tradeoff Principles", type: "textarea", placeholder: "Principles governing institutional tradeoff arbitration…" },
  { name: "arbitration_defaults", label: "Arbitration Defaults (JSON)", type: "json", placeholder: '{"reversibility_threshold": 0.5, "hidden_sacrifice_sensitivity": "high"}' },
];

export const MISSION_CONSTITUTION_FIELDS: ConstitutionField[] = [
  { name: "constitution_name", label: "Constitution Name", type: "text", required: true, placeholder: "e.g. Mission Integrity Constitution v1" },
  { name: "mission_statement", label: "Mission Statement", type: "textarea", placeholder: "The core mission this constitution protects…" },
  { name: "identity_principles", label: "Identity Principles", type: "textarea", placeholder: "Principles defining institutional identity…" },
  { name: "protected_commitments", label: "Protected Commitments (JSON array)", type: "json", placeholder: '["Public accountability", "Service continuity", "Data sovereignty"]' },
];

export const SIMULATION_CONSTITUTION_FIELDS: ConstitutionField[] = [
  { name: "constitution_name", label: "Constitution Name", type: "text", required: true, placeholder: "e.g. Continuity Simulation Constitution v1" },
  { name: "simulation_principles", label: "Simulation Principles", type: "textarea", placeholder: "Principles guiding continuity simulation…" },
  { name: "default_horizon_settings", label: "Default Horizon Settings (JSON)", type: "json", placeholder: '{"short_term_years": 1, "medium_term_years": 5, "long_term_years": 15}' },
];
