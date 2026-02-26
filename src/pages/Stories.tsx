import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Edit, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  todo: { label: "A Fazer", color: "bg-muted-foreground/20 text-muted-foreground" },
  in_progress: { label: "Em Progresso", color: "bg-info/20 text-info" },
  done: { label: "Concluído", color: "bg-success/20 text-success" },
  blocked: { label: "Bloqueado", color: "bg-destructive/20 text-destructive" },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "bg-muted-foreground/20 text-muted-foreground" },
  medium: { label: "Média", color: "bg-info/20 text-info" },
  high: { label: "Alta", color: "bg-warning/20 text-warning" },
  critical: { label: "Crítica", color: "bg-destructive/20 text-destructive" },
};

export default function Stories() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editStory, setEditStory] = useState<any>(null);
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", status: "todo", priority: "medium", assigned_agent_id: "" });

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select("*, agents(name, role)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agents").select("id, name, role").eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const { data: phases = [] } = useQuery({
    queryKey: ["story-phases", expandedStory],
    queryFn: async () => {
      if (!expandedStory) return [];
      const { data, error } = await supabase
        .from("story_phases")
        .select("*, story_subtasks(*)")
        .eq("story_id", expandedStory)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!expandedStory,
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const { error } = await supabase.from("stories").insert({
        user_id: user!.id,
        title: values.title,
        description: values.description || null,
        status: values.status as any,
        priority: values.priority as any,
        assigned_agent_id: values.assigned_agent_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["story-count"] });
      queryClient.invalidateQueries({ queryKey: ["in-progress-stories"] });
      toast({ title: "Story criada!" });
      resetForm();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await supabase.from("stories").update({
        title: values.title,
        description: values.description || null,
        status: values.status,
        priority: values.priority,
        assigned_agent_id: values.assigned_agent_id || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast({ title: "Story atualizada!" });
      resetForm();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["story-count"] });
      queryClient.invalidateQueries({ queryKey: ["in-progress-stories"] });
      toast({ title: "Story removida" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: e.message }),
  });

  const addPhaseMutation = useMutation({
    mutationFn: async ({ storyId, name }: { storyId: string; name: string }) => {
      const nextOrder = phases.length;
      const { error } = await supabase.from("story_phases").insert({
        story_id: storyId,
        name,
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["story-phases"] }),
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: e.message }),
  });

  const resetForm = () => {
    setForm({ title: "", description: "", status: "todo", priority: "medium", assigned_agent_id: "" });
    setEditStory(null);
    setOpen(false);
  };

  const openEdit = (story: any) => {
    setEditStory(story);
    setForm({
      title: story.title,
      description: story.description || "",
      status: story.status,
      priority: story.priority,
      assigned_agent_id: story.assigned_agent_id || "",
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editStory) {
      updateMutation.mutate({ id: editStory.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const getPhaseProgress = () => {
    if (!phases.length) return 0;
    const completed = phases.filter((p: any) => p.status === "completed").length;
    return Math.round((completed / phases.length) * 100);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Stories</h1>
            <p className="text-muted-foreground mt-1">Gerencie stories e épicos do sistema</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Story</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">{editStory ? "Editar Story" : "Nova Story"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Nome da story" />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva a story..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_MAP).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Agente Responsável</Label>
                  <Select value={form.assigned_agent_id} onValueChange={(v) => setForm({ ...form, assigned_agent_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um agente..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {agents.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>@{a.name} ({a.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editStory ? "Salvar" : "Criar Story"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/50 animate-pulse">
                <CardContent className="p-6 h-24" />
              </Card>
            ))}
          </div>
        ) : stories.length === 0 ? (
          <Card className="border-dashed border-2 border-border">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-lg font-semibold">Nenhuma story ainda</h3>
              <p className="text-sm text-muted-foreground mt-1">Crie sua primeira story para começar</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {stories.map((story: any, i: number) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Collapsible open={expandedStory === story.id} onOpenChange={(isOpen) => setExpandedStory(isOpen ? story.id : null)}>
                    <Card className="border-border/50 hover:border-primary/20 transition-colors">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <CollapsibleTrigger className="shrink-0">
                            {expandedStory === story.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </CollapsibleTrigger>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="font-display text-base">{story.title}</CardTitle>
                              <Badge className={`text-xs ${STATUS_MAP[story.status]?.color}`}>
                                {STATUS_MAP[story.status]?.label}
                              </Badge>
                              <Badge className={`text-xs ${PRIORITY_MAP[story.priority]?.color}`}>
                                {PRIORITY_MAP[story.priority]?.label}
                              </Badge>
                              {story.agents && (
                                <Badge variant="outline" className="text-xs">@{story.agents.name}</Badge>
                              )}
                            </div>
                            {story.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{story.description}</p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(story)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(story.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4">
                          {phases.length > 0 && expandedStory === story.id && (
                            <>
                              <div className="flex items-center gap-3">
                                <Progress value={getPhaseProgress()} className="flex-1" />
                                <span className="text-xs text-muted-foreground font-mono">{getPhaseProgress()}%</span>
                              </div>
                              <div className="space-y-2">
                                {phases.map((phase: any) => (
                                  <div key={phase.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                                    <div className={`h-2 w-2 rounded-full ${
                                      phase.status === "completed" ? "bg-success" :
                                      phase.status === "in_progress" ? "bg-info" : "bg-muted-foreground/30"
                                    }`} />
                                    <span className="text-sm flex-1">{phase.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {phase.story_subtasks?.length ?? 0} subtasks
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                          <AddPhaseInline storyId={story.id} onAdd={(name: string) => addPhaseMutation.mutate({ storyId: story.id, name })} />
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function AddPhaseInline({ storyId, onAdd }: { storyId: string; onAdd: (name: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const handleAdd = () => {
    if (name.trim()) {
      onAdd(name.trim());
      setName("");
      setAdding(false);
    }
  };

  if (!adding) {
    return (
      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setAdding(true)}>
        <Plus className="h-3 w-3 mr-1" /> Adicionar fase
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome da fase"
        className="h-8 text-sm"
        autoFocus
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
      />
      <Button size="sm" className="h-8" onClick={handleAdd}>Adicionar</Button>
      <Button size="sm" variant="ghost" className="h-8" onClick={() => setAdding(false)}>Cancelar</Button>
    </div>
  );
}
