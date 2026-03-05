import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useSLAConfigs } from "@/hooks/useStageSLA";
import { MACRO_STAGES } from "@/components/initiatives/pipeline-config";

const CONFIGURABLE_STAGES = [
  { key: "draft", label: "Rascunho" },
  { key: "discovered", label: "Descoberto (aguardando aprovação)" },
  { key: "squad_formed", label: "Squad Formado (aguardando aprovação)" },
  { key: "planned", label: "Planejado (aguardando aprovação)" },
  { key: "in_progress", label: "Em Execução" },
  { key: "validating", label: "Validação" },
  { key: "ready_to_publish", label: "Pronto para Publicar" },
];

export function SLAConfigPanel() {
  const { configs, isLoading, upsertConfig, getMaxHours, isAlertEnabled, defaultSLAs } = useSLAConfigs();
  const [localValues, setLocalValues] = useState<Record<string, { hours: number; enabled: boolean }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const getValue = (stage: string) => {
    if (localValues[stage]) return localValues[stage];
    return { hours: getMaxHours(stage), enabled: isAlertEnabled(stage) };
  };

  const handleSave = async (stage: string) => {
    const val = getValue(stage);
    setSaving(stage);
    try {
      await upsertConfig({ stage, max_hours: val.hours, alert_enabled: val.enabled });
      setLocalValues((prev) => { const n = { ...prev }; delete n[stage]; return n; });
      toast.success(`SLA do estágio atualizado`);
    } catch {
      toast.error("Erro ao salvar SLA");
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          SLA por Estágio
        </CardTitle>
        <CardDescription>
          Configure o tempo máximo (em horas) que uma iniciativa pode ficar em cada estágio antes de gerar um alerta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {CONFIGURABLE_STAGES.map(({ key, label }) => {
          const val = getValue(key);
          const hasChanges = !!localValues[key];
          return (
            <div key={key} className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/10 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{label}</p>
                <p className="text-xs text-muted-foreground">Padrão: {defaultSLAs[key] ?? 48}h</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={720}
                  value={val.hours}
                  onChange={(e) => setLocalValues((prev) => ({ ...prev, [key]: { ...val, hours: parseInt(e.target.value) || 1 } }))}
                  className="w-20 h-8 text-sm"
                />
                <span className="text-xs text-muted-foreground">h</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={val.enabled}
                  onCheckedChange={(checked) => setLocalValues((prev) => ({ ...prev, [key]: { ...val, enabled: checked } }))}
                />
                <span className="text-xs text-muted-foreground w-6">{val.enabled ? "On" : "Off"}</span>
              </div>
              {hasChanges && (
                <Button size="sm" variant="outline" onClick={() => handleSave(key)} disabled={saving === key} className="h-8">
                  <Save className="h-3 w-3 mr-1" />
                  {saving === key ? "..." : "Salvar"}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
