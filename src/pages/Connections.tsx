import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { GitBranch, Plus, Trash2, Loader2, CheckCircle2, ExternalLink, Plug } from "lucide-react";
import { toast } from "sonner";

interface GitConnection {
  id: string;
  repo_owner: string;
  repo_name: string;
  default_branch: string;
  github_token: string | null;
  status: string;
  provider: string;
  workspace_id: string;
  created_at: string;
}

export default function Connections() {
  const { currentOrg, workspaces, userRole, loading: orgLoading } = useOrg();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    repo_owner: "",
    repo_name: "",
    default_branch: "main",
    github_token: "",
  });

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["git-connections-page", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("git_connections")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as GitConnection[];
    },
    enabled: !!currentOrg,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrg || !user) throw new Error("Sem organização");
      const wsId = workspaces[0]?.id;
      if (!wsId) throw new Error("Nenhum workspace disponível");

      const { error } = await supabase.from("git_connections").insert({
        organization_id: currentOrg.id,
        workspace_id: wsId,
        connected_by: user.id,
        repo_owner: form.repo_owner.trim(),
        repo_name: form.repo_name.trim(),
        default_branch: form.default_branch.trim() || "main",
        github_token: form.github_token.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conexão adicionada!");
      queryClient.invalidateQueries({ queryKey: ["git-connections-page"] });
      setAddOpen(false);
      setForm({ repo_owner: "", repo_name: "", default_branch: "main", github_token: "" });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("git_connections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conexão removida");
      queryClient.invalidateQueries({ queryKey: ["git-connections-page"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover"),
  });

  const canManage = userRole === "owner" || userRole === "admin" || userRole === "editor";

  if (orgLoading) {
    return (
      <AppLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Conexões</h1>
            <p className="text-muted-foreground text-sm">Gerencie suas conexões Git para deploy automático.</p>
          </div>
          {canManage && (
            <Button onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Nova Conexão
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : connections.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Plug className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <h3 className="font-semibold text-lg">Nenhuma conexão configurada</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Adicione uma conexão Git para habilitar deploy automático e publicação de código nos seus repositórios.
              </p>
              {canManage && (
                <Button onClick={() => setAddOpen(true)} variant="outline" className="mt-4 gap-1.5">
                  <Plus className="h-4 w-4" /> Adicionar Conexão
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connections.map((conn) => (
              <Card key={conn.id} className="border-border/50 bg-card/80 backdrop-blur">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <CardTitle className="text-sm font-semibold">
                          {conn.repo_owner}/{conn.repo_name}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          Branch: {conn.default_branch}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={conn.status === "active"
                        ? "bg-green-500/15 text-green-400 border-green-500/30"
                        : "bg-muted text-muted-foreground"}
                    >
                      {conn.status === "active" ? (
                        <><CheckCircle2 className="h-3 w-3 mr-1" /> Ativo</>
                      ) : conn.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Token: {conn.github_token ? "••••••••" : "Não configurado"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://github.com/${conn.repo_owner}/${conn.repo_name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Ver no GitHub
                    </a>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-destructive hover:text-destructive h-7 px-2"
                        onClick={() => deleteMutation.mutate(conn.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Connection Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              Nova Conexão Git
            </DialogTitle>
            <DialogDescription>
              Configure o repositório GitHub para deploy automático.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Owner / Org</Label>
                <Input
                  placeholder="minha-org"
                  value={form.repo_owner}
                  onChange={(e) => setForm((f) => ({ ...f, repo_owner: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Repositório</Label>
                <Input
                  placeholder="meu-repo"
                  value={form.repo_name}
                  onChange={(e) => setForm((f) => ({ ...f, repo_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Branch padrão</Label>
              <Input
                placeholder="main"
                value={form.default_branch}
                onChange={(e) => setForm((f) => ({ ...f, default_branch: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">GitHub Token (PAT)</Label>
              <Input
                type="password"
                placeholder="ghp_..."
                value={form.github_token}
                onChange={(e) => setForm((f) => ({ ...f, github_token: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground">
                Personal Access Token com permissão de escrita no repositório.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!form.repo_owner.trim() || !form.repo_name.trim() || addMutation.isPending}
            >
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
