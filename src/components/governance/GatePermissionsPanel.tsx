import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Save, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { toast } from "sonner";

const GATE_STAGES = [
  { stage: "discovered", label: "Compreensão" },
  { stage: "architected", label: "Arquitetura" },
  { stage: "architecture_simulated", label: "Simulação" },
  { stage: "architecture_validated", label: "Validação Preventiva" },
  { stage: "bootstrapped", label: "Bootstrap Intelligence" },
  { stage: "scaffolded", label: "Scaffold" },
  { stage: "squad_formed", label: "Squad" },
  { stage: "planned", label: "Planning" },
  { stage: "validating", label: "Validação de Build" },
  { stage: "ready_to_publish", label: "Publicação" },
  { stage: "published", label: "Conclusão" },
];

const ACTION_TYPES = ["approve", "reject", "run"] as const;

const ROLES = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
];

const roleColors: Record<string, string> = {
  owner: "bg-yellow-500/20 text-yellow-400",
  admin: "bg-red-500/20 text-red-400",
  editor: "bg-blue-500/20 text-blue-400",
  viewer: "bg-muted text-muted-foreground",
};

type PermissionMap = Record<string, Record<string, string>>;

export function GatePermissionsPanel() {
  const { currentOrg } = useOrg();
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [saved, setSaved] = useState<PermissionMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    loadPermissions();
  }, [currentOrg]);

  const loadPermissions = async () => {
    if (!currentOrg) return;
    setLoading(true);
    const { data } = await supabase
      .from("pipeline_gate_permissions")
      .select("*")
      .eq("organization_id", currentOrg.id);

    const map: PermissionMap = {};
    for (const row of data || []) {
      const key = `${row.stage}__${row.action_type}`;
      if (!map[row.stage]) map[row.stage] = {};
      map[row.stage][row.action_type] = row.min_role;
    }
    setPermissions(map);
    setSaved(JSON.parse(JSON.stringify(map)));
    setLoading(false);
  };

  const setRole = (stage: string, action: string, role: string) => {
    setPermissions((prev) => ({
      ...prev,
      [stage]: { ...(prev[stage] || {}), [action]: role },
    }));
  };

  const getRole = (stage: string, action: string): string => {
    return permissions[stage]?.[action] || "editor";
  };

  const hasChanges = JSON.stringify(permissions) !== JSON.stringify(saved);

  const handleSave = async () => {
    if (!currentOrg) return;
    setSaving(true);
    try {
      // Delete existing and re-insert
      await supabase
        .from("pipeline_gate_permissions")
        .delete()
        .eq("organization_id", currentOrg.id);

      const rows: any[] = [];
      for (const stage of Object.keys(permissions)) {
        for (const action of Object.keys(permissions[stage])) {
          rows.push({
            organization_id: currentOrg.id,
            stage,
            action_type: action,
            min_role: permissions[stage][action],
          });
        }
      }

      if (rows.length > 0) {
        const { error } = await supabase
          .from("pipeline_gate_permissions")
          .insert(rows);
        if (error) throw error;
      }

      setSaved(JSON.parse(JSON.stringify(permissions)));
      toast.success("Permissões de gates salvas!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar permissões");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Permissões por Gate do Pipeline
        </CardTitle>
        <CardDescription>
          Configure qual role mínimo é necessário para aprovar, rejeitar ou executar cada estágio.
          Se não configurado, o padrão é <Badge variant="outline" className="ml-1">editor</Badge>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="pb-3 pr-4 text-left font-medium text-muted-foreground">Estágio</th>
                {ACTION_TYPES.map((a) => (
                  <th key={a} className="pb-3 px-2 text-center font-medium text-muted-foreground capitalize">
                    {a === "approve" ? "Aprovar" : a === "reject" ? "Rejeitar" : "Executar"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GATE_STAGES.map(({ stage, label }) => (
                <tr key={stage} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                  <td className="py-2.5 pr-4 font-medium">{label}</td>
                  {ACTION_TYPES.map((action) => (
                    <td key={action} className="py-2.5 px-2">
                      <Select
                        value={getRole(stage, action)}
                        onValueChange={(v) => setRole(stage, action, v)}
                      >
                        <SelectTrigger className="h-8 w-28 text-xs mx-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              <Badge className={`${roleColors[r.value]} text-xs`}>{r.label}</Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving || !hasChanges} size="sm">
            <Save className="mr-1 h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Permissões"}
          </Button>
          {hasChanges && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPermissions(JSON.parse(JSON.stringify(saved)))}
            >
              <RotateCcw className="mr-1 h-4 w-4" /> Desfazer
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
