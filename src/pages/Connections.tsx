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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { GitBranch, Plus, Trash2, Loader2, CheckCircle2, ExternalLink, Plug, Database, Wifi, WifiOff } from "lucide-react";
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

interface SupabaseConnection {
  id: string;
  label: string;
  supabase_url: string;
  supabase_anon_key: string;
  status: string;
  workspace_id: string;
  created_at: string;
}

export default function Connections() {
  const { currentOrg, workspaces, userRole, loading: orgLoading } = useOrg();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [addGitOpen, setAddGitOpen] = useState(false);
  const [addSupabaseOpen, setAddSupabaseOpen] = useState(false);
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, "ok" | "fail">>({});
  const [gitForm, setGitForm] = useState({
    repo_owner: "",
    repo_name: "",
    default_branch: "main",
    github_token: "",
  });
  const [sbForm, setSbForm] = useState({
    label: "",
    supabase_url: "",
    supabase_anon_key: "",
  });

  const testSupabaseConnection = async (url: string, anonKey: string, connId?: string) => {
    if (connId) setTestingConnectionId(connId);
    try {
      // Validate URL format
      if (!url.match(/^https?:\/\/.+/)) {
        toast.error("URL inválida. Informe uma URL válida (ex: https://xxxxx.supabase.co ou domínio próprio)");
        return false;
      }
      // Try to reach the Supabase REST endpoint
      const resp = await fetch(`${url}/rest/v1/`, {
        method: "GET",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      });
      if (resp.ok || resp.status === 200) {
        toast.success("✅ Conexão válida! Supabase respondeu com sucesso.");
        if (connId) setTestResults(prev => ({ ...prev, [connId]: "ok" }));
        return true;
      } else if (resp.status === 401) {
        toast.error("❌ Anon Key inválida ou expirada.");
        if (connId) setTestResults(prev => ({ ...prev, [connId]: "fail" }));
        return false;
      } else {
        toast.error(`❌ Supabase retornou status ${resp.status}`);
        if (connId) setTestResults(prev => ({ ...prev, [connId]: "fail" }));
        return false;
      }
    } catch (e: any) {
      toast.error(`❌ Não foi possível conectar: ${e.message || "Erro de rede"}`);
      if (connId) setTestResults(prev => ({ ...prev, [connId]: "fail" }));
      return false;
    } finally {
      setTestingConnectionId(null);
    }
  };

  const { data: gitConnections = [], isLoading: gitLoading } = useQuery({
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

  const { data: sbConnections = [], isLoading: sbLoading } = useQuery({
    queryKey: ["supabase-connections-page", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("supabase_connections")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as SupabaseConnection[];
    },
    enabled: !!currentOrg,
  });

  const addGitMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrg || !user) throw new Error("Sem organização");
      const wsId = workspaces[0]?.id;
      if (!wsId) throw new Error("Nenhum workspace disponível");
      const { error } = await supabase.from("git_connections").insert({
        organization_id: currentOrg.id,
        workspace_id: wsId,
        connected_by: user.id,
        repo_owner: gitForm.repo_owner.trim(),
        repo_name: gitForm.repo_name.trim(),
        default_branch: gitForm.default_branch.trim() || "main",
        github_token: gitForm.github_token.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conexão Git adicionada!");
      queryClient.invalidateQueries({ queryKey: ["git-connections-page"] });
      setAddGitOpen(false);
      setGitForm({ repo_owner: "", repo_name: "", default_branch: "main", github_token: "" });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  const addSbMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrg || !user) throw new Error("Sem organização");
      const wsId = workspaces[0]?.id;
      if (!wsId) throw new Error("Nenhum workspace disponível");
      const { error } = await supabase.from("supabase_connections").insert({
        organization_id: currentOrg.id,
        workspace_id: wsId,
        connected_by: user.id,
        label: sbForm.label.trim() || "Supabase",
        supabase_url: sbForm.supabase_url.trim(),
        supabase_anon_key: sbForm.supabase_anon_key.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conexão Supabase adicionada!");
      queryClient.invalidateQueries({ queryKey: ["supabase-connections-page"] });
      setAddSupabaseOpen(false);
      setSbForm({ label: "", supabase_url: "", supabase_anon_key: "" });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  const deleteGitMutation = useMutation({
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

  const deleteSbMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supabase_connections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conexão removida");
      queryClient.invalidateQueries({ queryKey: ["supabase-connections-page"] });
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conexões</h1>
          <p className="text-muted-foreground text-sm">Gerencie suas conexões Git e Supabase.</p>
        </div>

        <Tabs defaultValue="git" className="w-full">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="git" className="gap-1.5">
                <GitBranch className="h-4 w-4" /> Git
              </TabsTrigger>
              <TabsTrigger value="supabase" className="gap-1.5">
                <Database className="h-4 w-4" /> Supabase
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Git Tab */}
          <TabsContent value="git" className="mt-4 space-y-4">
            <div className="flex justify-end">
              {canManage && (
                <Button onClick={() => setAddGitOpen(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Nova Conexão Git
                </Button>
              )}
            </div>
            {gitLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : gitConnections.length === 0 ? (
              <Card className="border-dashed border-2 border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Plug className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <h3 className="font-semibold text-lg">Nenhuma conexão Git</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Adicione uma conexão Git para habilitar deploy automático.
                  </p>
                  {canManage && (
                    <Button onClick={() => setAddGitOpen(true)} variant="outline" className="mt-4 gap-1.5">
                      <Plus className="h-4 w-4" /> Adicionar
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {gitConnections.map((conn) => (
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
                            onClick={() => deleteGitMutation.mutate(conn.id)}
                            disabled={deleteGitMutation.isPending}
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
          </TabsContent>

          {/* Supabase Tab */}
          <TabsContent value="supabase" className="mt-4 space-y-4">
            <div className="flex justify-end">
              {canManage && (
                <Button onClick={() => setAddSupabaseOpen(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Nova Conexão Supabase
                </Button>
              )}
            </div>
            {sbLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sbConnections.length === 0 ? (
              <Card className="border-dashed border-2 border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Database className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <h3 className="font-semibold text-lg">Nenhuma conexão Supabase</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Conecte um projeto Supabase externo para usar como backend dos sistemas gerados.
                  </p>
                  {canManage && (
                    <Button onClick={() => setAddSupabaseOpen(true)} variant="outline" className="mt-4 gap-1.5">
                      <Plus className="h-4 w-4" /> Adicionar
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sbConnections.map((conn) => (
                  <Card key={conn.id} className="border-border/50 bg-card/80 backdrop-blur">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Database className="h-5 w-5 text-primary shrink-0" />
                          <div>
                            <CardTitle className="text-sm font-semibold">
                              {conn.label || "Supabase"}
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5 truncate max-w-[180px]">
                              {conn.supabase_url}
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
                        <span>Anon Key: ••••••••</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => testSupabaseConnection(conn.supabase_url, conn.supabase_anon_key, conn.id)}
                          disabled={testingConnectionId === conn.id}
                        >
                          {testingConnectionId === conn.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Wifi className="h-3 w-3" />
                          )}
                          Testar
                        </Button>
                        {testResults[conn.id] === "ok" && (
                          <Badge className="bg-green-500/15 text-green-400 border-green-500/30 gap-1 text-[10px]">
                            <CheckCircle2 className="h-3 w-3" /> OK
                          </Badge>
                        )}
                        {testResults[conn.id] === "fail" && (
                          <Badge variant="destructive" className="gap-1 text-[10px]">
                            <WifiOff className="h-3 w-3" /> Fail
                          </Badge>
                        )}
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto text-destructive hover:text-destructive h-7 px-2"
                            onClick={() => deleteSbMutation.mutate(conn.id)}
                            disabled={deleteSbMutation.isPending}
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Git Connection Dialog */}
      <Dialog open={addGitOpen} onOpenChange={setAddGitOpen}>
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
                  value={gitForm.repo_owner}
                  onChange={(e) => setGitForm((f) => ({ ...f, repo_owner: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Repositório</Label>
                <Input
                  placeholder="meu-repo"
                  value={gitForm.repo_name}
                  onChange={(e) => setGitForm((f) => ({ ...f, repo_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Branch padrão</Label>
              <Input
                placeholder="main"
                value={gitForm.default_branch}
                onChange={(e) => setGitForm((f) => ({ ...f, default_branch: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">GitHub Token (PAT)</Label>
              <Input
                type="password"
                placeholder="ghp_..."
                value={gitForm.github_token}
                onChange={(e) => setGitForm((f) => ({ ...f, github_token: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground">
                Personal Access Token com permissão de escrita no repositório.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddGitOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => addGitMutation.mutate()}
              disabled={!gitForm.repo_owner.trim() || !gitForm.repo_name.trim() || addGitMutation.isPending}
            >
              {addGitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Supabase Connection Dialog */}
      <Dialog open={addSupabaseOpen} onOpenChange={setAddSupabaseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Nova Conexão Supabase
            </DialogTitle>
            <DialogDescription>
              Conecte um projeto Supabase externo para usar como backend.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome / Label</Label>
              <Input
                placeholder="Meu Projeto Supabase"
                value={sbForm.label}
                onChange={(e) => setSbForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Supabase URL</Label>
              <Input
                placeholder="https://xxxxx.supabase.co"
                value={sbForm.supabase_url}
                onChange={(e) => setSbForm((f) => ({ ...f, supabase_url: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground">
                Encontre em Settings → API no dashboard do Supabase.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Anon / Public Key</Label>
              <Input
                type="password"
                placeholder="eyJhbGciOiJI..."
                value={sbForm.supabase_anon_key}
                onChange={(e) => setSbForm((f) => ({ ...f, supabase_anon_key: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground">
                Chave pública (anon key) do projeto Supabase.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="secondary"
              onClick={() => testSupabaseConnection(sbForm.supabase_url.trim(), sbForm.supabase_anon_key.trim())}
              disabled={!sbForm.supabase_url.trim() || !sbForm.supabase_anon_key.trim() || testingConnectionId !== null}
              className="gap-1.5"
            >
              {testingConnectionId !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
              Testar Conexão
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAddSupabaseOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => addSbMutation.mutate()}
                disabled={!sbForm.supabase_url.trim() || !sbForm.supabase_anon_key.trim() || addSbMutation.isPending}
              >
                {addSbMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
