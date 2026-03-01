import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError } from "@/lib/error-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Lightbulb, FileText, Cpu, BookOpen, Hammer, CheckCircle2, ArrowRight, Circle, Clock, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PIPELINE_STEPS = [
  { key: "idea", label: "Ideia", icon: Lightbulb, color: "text-warning", bg: "bg-warning/10" },
  { key: "planning", label: "PRD", icon: FileText, color: "text-info", bg: "bg-info/10" },
  { key: "architecting", label: "Arquitetura", icon: Cpu, color: "text-accent", bg: "bg-accent/10" },
  { key: "ready", label: "Pronto", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  { key: "in_progress", label: "Execução", icon: Hammer, color: "text-primary", bg: "bg-primary/10" },
  { key: "validating", label: "Validação", icon: BookOpen, color: "text-info", bg: "bg-info/10" },
  { key: "completed", label: "Concluído", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
];

function getStepIndex(status: string) {
  const idx = PIPELINE_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

export default function Initiatives() {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data: initiatives = [], isLoading } = useQuery({
    queryKey: ["initiatives", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("initiatives")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  const createMutation = useMutation({
    mutationFn: async ({ title, description }: { title: string; description: string }) => {
      if (!currentOrg || !user) throw new Error("Sem organização");
      const { data, error } = await supabase
        .from("initiatives")
        .insert({
          title,
          description: description || null,
          organization_id: currentOrg.id,
          user_id: user.id,
          status: "idea",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
      setNewTitle("");
      setNewDesc("");
      setCreateOpen(false);
      toast({ title: "Iniciativa criada!" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Erro", description: getUserFriendlyError(e) }),
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Iniciativas</h1>
            <p className="text-muted-foreground mt-1">Da ideia ao software — pipeline completo governado</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Iniciativa</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Nova Iniciativa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>O que você quer construir?</Label>
                  <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: SaaS de gestão de clínicas" autoFocus />
                </div>
                <div className="space-y-2">
                  <Label>Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descreva o contexto, público-alvo e objetivos..." className="min-h-[80px] text-sm" />
                </div>
                <Button className="w-full" onClick={() => newTitle.trim() && createMutation.mutate({ title: newTitle.trim(), description: newDesc.trim() })} disabled={!newTitle.trim() || createMutation.isPending}>
                  Criar Iniciativa
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-40" /></Card>)}
          </div>
        ) : initiatives.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Lightbulb className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Nenhuma iniciativa ainda.</p>
              <p className="text-muted-foreground text-sm mt-1">Descreva sua ideia e o sistema fará o resto.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {initiatives.map((init: any) => {
                const stepIdx = getStepIndex(init.status);
                const step = PIPELINE_STEPS[stepIdx];
                const Icon = step.icon;
                return (
                  <motion.div key={init.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border-border/50 hover:border-primary/30 transition-all cursor-pointer group">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base font-display leading-tight">{init.title}</CardTitle>
                          <Badge className={`text-[10px] shrink-0 ${step.bg} ${step.color}`}>
                            <Icon className="h-3 w-3 mr-1" />
                            {step.label}
                          </Badge>
                        </div>
                        {init.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{init.description}</p>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0">
                        {/* Pipeline progress bar */}
                        <div className="flex gap-0.5 mb-3">
                          {PIPELINE_STEPS.map((_, i) => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= stepIdx ? "bg-primary" : "bg-muted/40"}`} />
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{new Date(init.created_at).toLocaleDateString("pt-BR")}</span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Squad
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
