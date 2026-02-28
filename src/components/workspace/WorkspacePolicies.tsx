import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Shield, Lock, GitPullRequest, Database, UserCheck, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PoliciesProps {
  workspace: any;
  userRole: string | null;
}

interface WorkspacePolicies {
  allow_agent_commands: boolean;
  allow_agent_pr: boolean;
  allow_agent_db_write: boolean;
  require_human_approval: boolean;
  auto_validate: boolean;
  max_tokens_per_execution: number;
  approval_threshold: "any" | "owner" | "admin";
}

const DEFAULT_POLICIES: WorkspacePolicies = {
  allow_agent_commands: false,
  allow_agent_pr: false,
  allow_agent_db_write: false,
  require_human_approval: true,
  auto_validate: true,
  max_tokens_per_execution: 50000,
  approval_threshold: "admin",
};

export function WorkspacePoliciesPanel({ workspace, userRole }: PoliciesProps) {
  const { toast } = useToast();
  const [policies, setPolicies] = useState<WorkspacePolicies>(DEFAULT_POLICIES);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const isAdmin = userRole === "owner" || userRole === "admin";

  useEffect(() => {
    if (workspace?.settings && typeof workspace.settings === "object") {
      const saved = (workspace.settings as Record<string, unknown>).policies;
      if (saved && typeof saved === "object") {
        setPolicies({ ...DEFAULT_POLICIES, ...(saved as Partial<WorkspacePolicies>) });
      }
    }
  }, [workspace]);

  const updatePolicy = useCallback(<K extends keyof WorkspacePolicies>(key: K, value: WorkspacePolicies[K]) => {
    setPolicies((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const savePolicies = useCallback(async () => {
    if (!workspace) return;
    setSaving(true);
    try {
      const currentSettings = typeof workspace.settings === "object" && workspace.settings ? workspace.settings : {};
      const newSettings = JSON.parse(JSON.stringify({ ...(currentSettings as object), policies }));
      const { error } = await supabase
        .from("workspaces")
        .update({ settings: newSettings })
        .eq("id", workspace.id);
      if (error) throw error;
      toast({ title: "Políticas salvas com sucesso" });
      setDirty(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: e.message });
    } finally {
      setSaving(false);
    }
  }, [workspace, policies, toast]);

  const policyItems = [
    {
      key: "allow_agent_commands" as const,
      icon: Lock,
      label: "Agentes podem rodar comandos",
      desc: "Permitir que agentes executem comandos no ambiente (shell, scripts)",
      dangerous: true,
    },
    {
      key: "allow_agent_pr" as const,
      icon: GitPullRequest,
      label: "Agentes podem abrir PRs",
      desc: "Permitir criação automática de Pull Requests no repositório",
      dangerous: false,
    },
    {
      key: "allow_agent_db_write" as const,
      icon: Database,
      label: "Agentes podem escrever no banco",
      desc: "Permitir operações de escrita (INSERT/UPDATE/DELETE) no banco de dados",
      dangerous: true,
    },
    {
      key: "require_human_approval" as const,
      icon: UserCheck,
      label: "Requer aprovação humana",
      desc: "Toda execução requer revisão e aprovação antes de prosseguir",
      dangerous: false,
      inverted: true,
    },
    {
      key: "auto_validate" as const,
      icon: Shield,
      label: "Validação automática",
      desc: "Executar validações automaticamente após cada produção de artefato",
      dangerous: false,
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Políticas de Execução
            </CardTitle>
            {!isAdmin && (
              <Badge variant="outline" className="text-[10px]">Somente leitura (requer admin)</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Controle o que os agentes podem fazer neste workspace. Políticas rigorosas = SaaS enterprise-grade.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {policyItems.map((item) => {
            const Icon = item.icon;
            const value = policies[item.key] as boolean;
            const isDangerous = item.dangerous && value;

            return (
              <div key={item.key} className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <Icon className={`h-4 w-4 mt-0.5 ${isDangerous ? "text-destructive" : "text-muted-foreground"}`} />
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      {item.label}
                      {isDangerous && <Badge variant="destructive" className="text-[9px]">RISCO</Badge>}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={value}
                  onCheckedChange={(v) => updatePolicy(item.key, v)}
                  disabled={!isAdmin}
                />
              </div>
            );
          })}

          {/* Approval Threshold */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <UserCheck className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Quem pode aprovar</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Nível mínimo de permissão para aprovar artefatos</p>
              </div>
            </div>
            <Select
              value={policies.approval_threshold}
              onValueChange={(v) => updatePolicy("approval_threshold", v as "any" | "owner" | "admin")}
              disabled={!isAdmin}
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Qualquer membro</SelectItem>
                <SelectItem value="admin">Admin+</SelectItem>
                <SelectItem value="owner">Apenas Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Max Tokens */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Shield className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Limite de tokens por execução</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Máximo de tokens que um agente pode consumir por subtask</p>
              </div>
            </div>
            <Select
              value={String(policies.max_tokens_per_execution)}
              onValueChange={(v) => updatePolicy("max_tokens_per_execution", Number(v))}
              disabled={!isAdmin}
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10000">10.000</SelectItem>
                <SelectItem value="25000">25.000</SelectItem>
                <SelectItem value="50000">50.000</SelectItem>
                <SelectItem value="100000">100.000</SelectItem>
                <SelectItem value="500000">500.000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Save */}
          {isAdmin && dirty && (
            <div className="flex justify-end pt-2 border-t border-border/30">
              <Button onClick={savePolicies} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Políticas
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Summary */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Resumo de Risco</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <RiskItem
              label="Execução de comandos"
              enabled={policies.allow_agent_commands}
              risk="critical"
            />
            <RiskItem
              label="Escrita no banco"
              enabled={policies.allow_agent_db_write}
              risk="high"
            />
            <RiskItem
              label="Abertura de PRs"
              enabled={policies.allow_agent_pr}
              risk="medium"
            />
            <RiskItem
              label="Aprovação humana"
              enabled={policies.require_human_approval}
              risk="safe"
              inverted
            />
            <RiskItem
              label="Validação automática"
              enabled={policies.auto_validate}
              risk="safe"
              inverted
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RiskItem({ label, enabled, risk, inverted }: {
  label: string; enabled: boolean; risk: string; inverted?: boolean;
}) {
  const isRisky = inverted ? !enabled : enabled;
  const colors = {
    critical: "bg-red-500/20 text-red-400",
    high: "bg-orange-500/20 text-orange-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    safe: "bg-green-500/20 text-green-400",
  };

  return (
    <div className="flex items-center justify-between text-xs">
      <span>{label}</span>
      <Badge className={`text-[10px] ${isRisky ? (risk === "safe" ? colors.safe : colors[risk as keyof typeof colors]) : colors.safe}`}>
        {isRisky && risk !== "safe" ? `⚠ ${risk.toUpperCase()}` : "✓ SEGURO"}
      </Badge>
    </div>
  );
}
