import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  GitBranch, GitPullRequest, Link2, Loader2, Plus, Trash2, CheckCircle2,
  AlertTriangle, ExternalLink, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface GitConnection {
  id: string;
  repo_owner: string;
  repo_name: string;
  default_branch: string;
  status: string;
  provider: string;
  created_at: string;
}

async function callGitHubProxy(action: string, params: Record<string, any>, token: string) {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error("Not authenticated");

  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-proxy`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, github_token: token, ...params }),
    }
  );
  const data = await resp.json();
  if (!data.success) throw new Error(data.error || "GitHub API error");
  return data.data;
}

export function WorkspaceGit() {
  const { user } = useAuth();
  const { currentOrg, currentWorkspace, userRole } = useOrg();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditor = ["owner", "admin", "editor"].includes(userRole || "");

  const [connectOpen, setConnectOpen] = useState(false);
  const [prOpen, setPrOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ghToken, setGhToken] = useState("");

  // Connect form
  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");

  // Branch form
  const [baseBranch, setBaseBranch] = useState("main");
  const [newBranch, setNewBranch] = useState("");
  const [selectedConn, setSelectedConn] = useState<GitConnection | null>(null);

  // PR form
  const [prTitle, setPrTitle] = useState("");
  const [prHead, setPrHead] = useState("");
  const [prBase, setPrBase] = useState("main");
  const [prBody, setPrBody] = useState("");

  const { data: connections = [], isLoading: loadingConns } = useQuery({
    queryKey: ["git-connections", currentWorkspace?.id],
    enabled: !!currentWorkspace,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("git_connections")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at");
      if (error) throw error;
      return data as GitConnection[];
    },
  });

  const [branches, setBranches] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);

  const testAndConnect = useCallback(async () => {
    if (!ghToken || !repoOwner || !repoName || !currentWorkspace || !currentOrg || !user) return;
    setLoading(true);
    try {
      const repoInfo = await callGitHubProxy("test_connection", {
        owner: repoOwner,
        repo: repoName,
      }, ghToken);

      const { error } = await supabase.from("git_connections").insert({
        workspace_id: currentWorkspace.id,
        organization_id: currentOrg.id,
        repo_owner: repoOwner,
        repo_name: repoName,
        default_branch: repoInfo.default_branch || "main",
        connected_by: user.id,
      });
      if (error) throw error;

      toast({ title: "Repositório conectado!", description: `${repoOwner}/${repoName}` });
      queryClient.invalidateQueries({ queryKey: ["git-connections"] });
      setConnectOpen(false);
      setRepoOwner("");
      setRepoName("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao conectar", description: e.message });
    } finally {
      setLoading(false);
    }
  }, [ghToken, repoOwner, repoName, currentWorkspace, currentOrg, user, toast, queryClient]);

  const loadBranches = useCallback(async (conn: GitConnection) => {
    if (!ghToken) {
      toast({ variant: "destructive", title: "Informe o GitHub Token" });
      return;
    }
    try {
      const data = await callGitHubProxy("list_branches", {
        owner: conn.repo_owner, repo: conn.repo_name,
      }, ghToken);
      setBranches(data);
      setSelectedConn(conn);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  }, [ghToken, toast]);

  const loadPRs = useCallback(async (conn: GitConnection) => {
    if (!ghToken) {
      toast({ variant: "destructive", title: "Informe o GitHub Token" });
      return;
    }
    try {
      const data = await callGitHubProxy("list_prs", {
        owner: conn.repo_owner, repo: conn.repo_name,
      }, ghToken);
      setPrs(data);
      setSelectedConn(conn);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  }, [ghToken, toast]);

  const createBranch = useCallback(async () => {
    if (!selectedConn || !ghToken || !newBranch) return;
    setLoading(true);
    try {
      await callGitHubProxy("create_branch", {
        owner: selectedConn.repo_owner,
        repo: selectedConn.repo_name,
        base_branch: baseBranch,
        new_branch: newBranch,
      }, ghToken);
      toast({ title: "Branch criada!", description: newBranch });
      setBranchOpen(false);
      setNewBranch("");
      loadBranches(selectedConn);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setLoading(false);
    }
  }, [selectedConn, ghToken, newBranch, baseBranch, toast, loadBranches]);

  const createPR = useCallback(async () => {
    if (!selectedConn || !ghToken || !prTitle || !prHead) return;
    setLoading(true);
    try {
      const data = await callGitHubProxy("create_pr", {
        owner: selectedConn.repo_owner,
        repo: selectedConn.repo_name,
        title: prTitle,
        head: prHead,
        base: prBase,
        pr_body: prBody,
      }, ghToken);
      toast({ title: "PR criado!", description: `#${data.number}` });
      setPrOpen(false);
      setPrTitle("");
      setPrHead("");
      setPrBody("");
      loadPRs(selectedConn);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setLoading(false);
    }
  }, [selectedConn, ghToken, prTitle, prHead, prBase, prBody, toast, loadPRs]);

  const deleteConnection = useCallback(async (id: string) => {
    const { error } = await supabase.from("git_connections").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Erro ao remover", description: error.message });
      return;
    }
    toast({ title: "Conexão removida" });
    queryClient.invalidateQueries({ queryKey: ["git-connections"] });
  }, [toast, queryClient]);

  return (
    <div className="space-y-4">
      {/* Token Input */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" /> GitHub Token
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Insira um Personal Access Token (PAT) com escopo <code className="text-[10px] bg-muted px-1 rounded">repo</code>. O token é usado apenas na sessão atual e não é armazenado.
          </p>
        </CardHeader>
        <CardContent>
          <Input
            type="password"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={ghToken}
            onChange={(e) => setGhToken(e.target.value)}
            className="font-mono text-xs"
          />
        </CardContent>
      </Card>

      {/* Connections */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" /> Repositórios Conectados
            </CardTitle>
            {isEditor && (
              <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <Plus className="h-3 w-3" /> Conectar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Conectar Repositório GitHub</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Owner (usuário ou organização)</Label>
                      <Input value={repoOwner} onChange={(e) => setRepoOwner(e.target.value)} placeholder="my-org" className="text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Nome do Repositório</Label>
                      <Input value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder="my-repo" className="text-sm" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={testAndConnect} disabled={loading || !ghToken || !repoOwner || !repoName} className="gap-1.5">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Testar & Conectar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingConns ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : connections.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum repositório conectado a este workspace.</p>
          ) : (
            <div className="space-y-2">
              {connections.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-mono">{conn.repo_owner}/{conn.repo_name}</span>
                    <Badge variant="outline" className="text-[9px]">{conn.default_branch}</Badge>
                    <Badge className="text-[9px] bg-green-500/20 text-green-400">{conn.status}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => loadBranches(conn)} title="Ver branches">
                      <GitBranch className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => loadPRs(conn)} title="Ver PRs">
                      <GitPullRequest className="h-3 w-3" />
                    </Button>
                    {userRole === "owner" || userRole === "admin" ? (
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteConnection(conn.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branches Panel */}
      {selectedConn && branches.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                Branches — {selectedConn.repo_owner}/{selectedConn.repo_name}
              </CardTitle>
              {isEditor && (
                <Dialog open={branchOpen} onOpenChange={setBranchOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                      <Plus className="h-3 w-3" /> Nova Branch
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Criar Branch</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Branch Base</Label>
                        <Select value={baseBranch} onValueChange={setBaseBranch}>
                          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {branches.map((b: any) => (
                              <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Nome da Nova Branch</Label>
                        <Input value={newBranch} onChange={(e) => setNewBranch(e.target.value)} placeholder="feat/my-feature" className="text-sm font-mono" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={createBranch} disabled={loading || !newBranch} className="gap-1.5">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                        Criar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {branches.map((b: any) => (
                <div key={b.name} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/30">
                  <span className="font-mono">{b.name}</span>
                  {b.protected && <Badge variant="outline" className="text-[9px]">protegida</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PRs Panel */}
      {selectedConn && prs.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <GitPullRequest className="h-4 w-4 text-primary" />
                Pull Requests — {selectedConn.repo_owner}/{selectedConn.repo_name}
              </CardTitle>
              {isEditor && (
                <Dialog open={prOpen} onOpenChange={setPrOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                      <Plus className="h-3 w-3" /> Novo PR
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Criar Pull Request</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Título</Label>
                        <Input value={prTitle} onChange={(e) => setPrTitle(e.target.value)} placeholder="feat: implement feature X" className="text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Head (branch de origem)</Label>
                          <Input value={prHead} onChange={(e) => setPrHead(e.target.value)} placeholder="feat/my-feature" className="text-sm font-mono" />
                        </div>
                        <div>
                          <Label className="text-xs">Base (destino)</Label>
                          <Input value={prBase} onChange={(e) => setPrBase(e.target.value)} placeholder="main" className="text-sm font-mono" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Descrição</Label>
                        <Textarea value={prBody} onChange={(e) => setPrBody(e.target.value)} placeholder="Descreva as mudanças..." rows={4} className="text-sm" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={createPR} disabled={loading || !prTitle || !prHead} className="gap-1.5">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitPullRequest className="h-4 w-4" />}
                        Criar PR
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {prs.map((pr: any) => (
                <div key={pr.id} className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">#{pr.number}</span>
                      <span className="text-sm truncate">{pr.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span>{pr.head?.ref} → {pr.base?.ref}</span>
                      <span>by {pr.user?.login}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className={`text-[9px] ${pr.state === "open" ? "bg-green-500/20 text-green-400" : "bg-purple-500/20 text-purple-400"}`}>
                      {pr.state}
                    </Badge>
                    <a href={pr.html_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty PRs state */}
      {selectedConn && prs.length === 0 && branches.length === 0 && (
        <Card className="border-border/50">
          <CardContent className="py-8 text-center text-xs text-muted-foreground">
            Selecione um repositório e clique nos ícones para ver branches ou PRs.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
