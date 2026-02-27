import { useState } from "react";
import { getUserFriendlyError } from "@/lib/error-utils";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, Shield, Bot, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ROLES = [
  { value: "aios_master", label: "AIOS Master", color: "bg-destructive/20 text-destructive" },
  { value: "aios_orchestrator", label: "AIOS Orchestrator", color: "bg-primary/20 text-primary" },
  { value: "analyst", label: "Analyst", color: "bg-info/20 text-info" },
  { value: "pm", label: "Product Manager", color: "bg-accent/20 text-accent" },
  { value: "architect", label: "Architect", color: "bg-warning/20 text-warning" },
  { value: "ux_expert", label: "UX Expert", color: "bg-success/20 text-success" },
  { value: "sm", label: "Scrum Master", color: "bg-muted-foreground/20 text-muted-foreground" },
  { value: "po", label: "Product Owner", color: "bg-primary/20 text-primary" },
  { value: "dev", label: "Developer", color: "bg-accent/20 text-accent" },
  { value: "devops", label: "DevOps", color: "bg-info/20 text-info" },
  { value: "qa", label: "QA", color: "bg-warning/20 text-warning" },
];

function getRoleStyle(role: string) {
  return ROLES.find((r) => r.value === role)?.color ?? "";
}

function getRoleLabel(role: string) {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

export default function Agents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [editAgent, setEditAgent] = useState<any>(null);
  const [form, setForm] = useState({ name: "", role: "dev", description: "", authorities: "" });

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const { error } = await supabase.from("agents").insert({
        user_id: user!.id,
        name: values.name,
        role: values.role as any,
        description: values.description || null,
        exclusive_authorities: values.authorities ? values.authorities.split(",").map((s) => s.trim()) : [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent-count"] });
      queryClient.invalidateQueries({ queryKey: ["active-agents"] });
      toast({ title: "Agente criado!" });
      resetForm();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: getUserFriendlyError(e) }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await supabase.from("agents").update({
        name: values.name,
        role: values.role,
        description: values.description || null,
        exclusive_authorities: values.authorities ? values.authorities.split(",").map((s: string) => s.trim()) : [],
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast({ title: "Agente atualizado!" });
      resetForm();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: getUserFriendlyError(e) }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "active" ? "inactive" : "active";
      const { error } = await supabase.from("agents").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["active-agents"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("agents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent-count"] });
      queryClient.invalidateQueries({ queryKey: ["active-agents"] });
      toast({ title: "Agente removido" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: getUserFriendlyError(e) }),
  });

  const resetForm = () => {
    setForm({ name: "", role: "dev", description: "", authorities: "" });
    setEditAgent(null);
    setOpen(false);
  };

  const openEdit = (agent: any) => {
    setEditAgent(agent);
    setForm({
      name: agent.name,
      role: agent.role,
      description: agent.description || "",
      authorities: (agent.exclusive_authorities || []).join(", "),
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editAgent) {
      updateMutation.mutate({ id: editAgent.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Agentes</h1>
            <p className="text-muted-foreground mt-1">Gerencie os agentes do seu sistema AIOS</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={aiOpen} onOpenChange={setAiOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Sparkles className="h-4 w-4" /> Criar com IA
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display flex items-center gap-2">
                    <Sparkles className="h-5 w-5" /> Gerar Time de Agentes com IA
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Descreva seu projeto</Label>
                    <Textarea
                      value={aiDescription}
                      onChange={(e) => setAiDescription(e.target.value)}
                      placeholder="Ex: Sistema de e-commerce com pagamentos, gestão de estoque e painel admin..."
                      className="min-h-[100px]"
                    />
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={async () => {
                      if (!aiDescription.trim()) return;
                      setAiLoading(true);
                      try {
                        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-agents`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                          },
                          body: JSON.stringify({ projectDescription: aiDescription.trim() }),
                        });
                        if (!resp.ok) {
                          const err = await resp.json().catch(() => ({ error: "Erro" }));
                          throw new Error(err.error);
                        }
                        const data = await resp.json();
                        queryClient.invalidateQueries({ queryKey: ["agents"] });
                        queryClient.invalidateQueries({ queryKey: ["agent-count"] });
                        queryClient.invalidateQueries({ queryKey: ["active-agents"] });
                        toast({ title: `${data.agents.length} agentes criados com sucesso!` });
                        setAiDescription("");
                        setAiOpen(false);
                      } catch (e: any) {
                        toast({ variant: "destructive", title: "Erro ao gerar agentes", description: getUserFriendlyError(e) });
                      } finally {
                        setAiLoading(false);
                      }
                    }}
                    disabled={!aiDescription.trim() || aiLoading}
                  >
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {aiLoading ? "Gerando time..." : "Gerar Agentes"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Novo Agente
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editAgent ? "Editar Agente" : "Novo Agente"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="@agent-name" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="O que este agente faz..." />
                </div>
                <div className="space-y-2">
                  <Label>Autoridades Exclusivas</Label>
                  <Input value={form.authorities} onChange={(e) => setForm({ ...form, authorities: e.target.value })} placeholder="git push, PR creation, ..." />
                  <p className="text-xs text-muted-foreground">Separadas por vírgula</p>
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editAgent ? "Salvar" : "Criar Agente"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/50 animate-pulse">
                <CardContent className="p-6 h-40" />
              </Card>
            ))}
          </div>
        ) : agents.length === 0 ? (
          <Card className="border-dashed border-2 border-border">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-lg font-semibold">Nenhum agente ainda</h3>
              <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro agente para começar</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {agents.map((agent: any, i: number) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="border-border/50 hover:border-primary/30 transition-colors group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${agent.status === "active" ? "bg-success" : "bg-muted-foreground/30"}`} />
                          <CardTitle className="font-display text-base">{agent.name}</CardTitle>
                        </div>
                        <Badge className={`text-xs ${getRoleStyle(agent.role)}`}>
                          {getRoleLabel(agent.role)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {agent.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
                      )}
                      {agent.exclusive_authorities?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {agent.exclusive_authorities.map((auth: string) => (
                            <Badge key={auth} variant="outline" className="text-xs gap-1">
                              <Shield className="h-3 w-3" /> {auth}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={agent.status === "active"}
                            onCheckedChange={() => toggleStatusMutation.mutate({ id: agent.id, status: agent.status })}
                          />
                          <span className="text-xs text-muted-foreground">
                            {agent.status === "active" ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(agent)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(agent.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
