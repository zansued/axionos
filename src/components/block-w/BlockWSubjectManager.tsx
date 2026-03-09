/**
 * Block W — Subject Edit/Deactivate Manager
 * Inline editing and active/inactive toggle for Block W subjects.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit2, Layers, Power } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SubjectField {
  name: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: { value: string; label: string }[];
}

interface SubjectManagerProps {
  tableName: string;
  label: string;
  subjects: any[];
  loading: boolean;
  onRefresh: () => void;
  fields: SubjectField[];
}

export function BlockWSubjectManager({
  tableName,
  label,
  subjects,
  loading,
  onRefresh,
  fields,
}: SubjectManagerProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function openEdit(subject: any) {
    setEditTarget(subject);
    const v: Record<string, string> = {};
    for (const f of fields) {
      v[f.name] = subject[f.name] ?? "";
    }
    setValues(v);
    setEditOpen(true);
  }

  async function handleEdit() {
    if (!editTarget) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      for (const f of fields) {
        payload[f.name] = values[f.name] ?? editTarget[f.name] ?? "";
      }
      const { error } = await supabase.from(tableName as any).update(payload as any).eq("id", editTarget.id);
      if (error) throw error;
      toast.success("Subject updated");
      setEditOpen(false);
      setEditTarget(null);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(subject: any) {
    try {
      const { error } = await supabase.from(tableName as any).update({ active: !subject.active } as any).eq("id", subject.id);
      if (error) throw error;
      toast.success(subject.active ? "Subject deactivated" : "Subject activated");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle");
    }
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>
        ) : subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No subjects found.</p>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1.5">
              {subjects.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded-md border border-border/30 hover:bg-muted/20">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`text-sm font-medium truncate ${!s.active ? "text-muted-foreground line-through" : ""}`}>{s.title || s.scenario_name || "Untitled"}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{s.subject_type || s.scenario_type || "—"}</Badge>
                    {s.domain && <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{s.domain}</Badge>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(s)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Switch
                      checked={s.active !== false}
                      onCheckedChange={() => toggleActive(s)}
                      className="scale-75"
                    />
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit {label.replace("Manage ", "")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.name} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea value={values[f.name] || ""} onChange={(e) => setValues(v => ({ ...v, [f.name]: e.target.value }))} className="min-h-[60px]" />
                ) : f.type === "select" ? (
                  <Select value={values[f.name] || ""} onValueChange={(val) => setValues(v => ({ ...v, [f.name]: val }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{f.options?.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={values[f.name] || ""} onChange={(e) => setValues(v => ({ ...v, [f.name]: e.target.value }))} />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" size="sm">Cancel</Button></DialogClose>
            <Button size="sm" onClick={handleEdit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
