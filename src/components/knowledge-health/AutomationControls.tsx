import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield } from "lucide-react";

const TRIGGER_TYPES = [
  "stale_knowledge", "confidence_decay", "runtime_mismatch",
  "superseded_signal", "negative_feedback_accumulation",
  "low_recent_usage", "lineage_weakening", "distillation_stale",
];

const RENEWAL_MODES = ["light_revalidation", "source_refresh", "redistillation", "competitive_revalidation"];

export function AutomationControls() {
  const [config, setConfig] = useState({
    scanFrequency: "daily",
    maxPerRun: "10",
    autoTriggers: new Set(["stale_knowledge", "low_recent_usage", "distillation_stale"]),
    alertOnlyTriggers: new Set(["superseded_signal", "negative_feedback_accumulation"]),
    autoModes: new Set(["light_revalidation"]),
    requiresHumanReview: new Set(["redistillation", "competitive_revalidation"]),
  });

  const toggleAutoTrigger = (t: string) => {
    setConfig(prev => {
      const next = new Set(prev.autoTriggers);
      const alertNext = new Set(prev.alertOnlyTriggers);
      if (next.has(t)) { next.delete(t); alertNext.add(t); }
      else { next.add(t); alertNext.delete(t); }
      return { ...prev, autoTriggers: next, alertOnlyTriggers: alertNext };
    });
  };

  const toggleAutoMode = (m: string) => {
    setConfig(prev => {
      const next = new Set(prev.autoModes);
      const hr = new Set(prev.requiresHumanReview);
      if (next.has(m)) { next.delete(m); hr.add(m); }
      else { next.add(m); hr.delete(m); }
      return { ...prev, autoModes: next, requiresHumanReview: hr };
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Renewal Automation Settings</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Configure how the renewal engine operates. All settings are bounded and auditable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scan Frequency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Scan Frequency</Label>
              <Select value={config.scanFrequency} onValueChange={v => setConfig(p => ({ ...p, scanFrequency: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="manual">Manual Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Max Items per Run</Label>
              <Select value={config.maxPerRun} onValueChange={v => setConfig(p => ({ ...p, maxPerRun: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Trigger Auto-Eligibility */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold">Trigger Auto-Eligibility</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TRIGGER_TYPES.map(t => (
                <div key={t} className="flex items-center justify-between rounded-lg border border-border/20 px-3 py-2">
                  <span className="text-xs capitalize">{t.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px]">
                      {config.autoTriggers.has(t) ? "auto" : "alert only"}
                    </Badge>
                    <Switch
                      checked={config.autoTriggers.has(t)}
                      onCheckedChange={() => toggleAutoTrigger(t)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mode Auto-Eligibility */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold">Renewal Mode Governance</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {RENEWAL_MODES.map(m => (
                <div key={m} className="flex items-center justify-between rounded-lg border border-border/20 px-3 py-2">
                  <span className="text-xs capitalize">{m.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px]">
                      {config.autoModes.has(m) ? "auto-eligible" : "human review"}
                    </Badge>
                    <Switch
                      checked={config.autoModes.has(m)}
                      onCheckedChange={() => toggleAutoMode(m)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
