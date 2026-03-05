import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useOrg } from "@/contexts/OrgContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Users, FolderOpen, Plus, Shield } from "lucide-react";
import { toast } from "sonner";
import { SLAConfigPanel } from "@/components/governance/SLAConfigPanel";

const roleColors: Record<string, string> = {
  owner: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  admin: "bg-red-500/20 text-red-400 border-red-500/30",
  editor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  reviewer: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  viewer: "bg-muted text-muted-foreground border-border",
};

export default function OrgSettings() {
  const { currentOrg, workspaces, members, userRole, createWorkspace, organizations, setCurrentOrg, loading } = useOrg();
  const [newWsName, setNewWsName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return;
    setCreating(true);
    try {
      const slug = newWsName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      await createWorkspace(newWsName, slug);
      toast.success("Workspace criado!");
      setNewWsName("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar workspace");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!currentOrg) return null;

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organização</h1>
          <p className="text-muted-foreground text-sm">Gerencie sua organização, workspaces e membros.</p>
        </div>

        {organizations.length > 1 && (
          <Select value={currentOrg.id} onValueChange={(id) => {
            const org = organizations.find(o => o.id === id);
            if (org) setCurrentOrg(org);
          }}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {organizations.map(org => (
                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Org info */}
          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-primary" />
                {currentOrg.name}
              </CardTitle>
              <CardDescription>Slug: {currentOrg.slug}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Seu papel:</span>
                <Badge className={roleColors[userRole || "viewer"]}>{userRole || "viewer"}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Members */}
          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                Membros ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                  <span className="text-sm font-mono truncate">{m.user_id.slice(0, 8)}...</span>
                  <Badge className={roleColors[m.role]}>{m.role}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Workspaces */}
        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FolderOpen className="h-5 w-5 text-primary" />
              Workspaces ({workspaces.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {workspaces.map((ws) => (
                <div key={ws.id} className="rounded-lg border border-border/50 bg-muted/20 p-4">
                  <h3 className="font-medium">{ws.name}</h3>
                  <p className="text-xs text-muted-foreground">/{ws.slug}</p>
                  {ws.description && <p className="mt-1 text-xs text-muted-foreground">{ws.description}</p>}
                </div>
              ))}
            </div>

            {(userRole === "owner" || userRole === "admin" || userRole === "editor") && (
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do workspace"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="max-w-xs"
                />
                <Button onClick={handleCreateWorkspace} disabled={creating || !newWsName.trim()} size="sm">
                  <Plus className="mr-1 h-4 w-4" /> Criar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SLA Config */}
        {(userRole === "owner" || userRole === "admin") && <SLAConfigPanel />}
      </div>
    </AppLayout>
  );
}
