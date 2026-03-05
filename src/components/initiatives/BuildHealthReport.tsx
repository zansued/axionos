import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, XCircle, AlertTriangle, Wrench, ShieldCheck,
  Package, FileCode, Globe, FileJson,
} from "lucide-react";

interface HealthCheck {
  id: string;
  category: string;
  label: string;
  status: "pass" | "fail" | "warn" | "fixed";
  detail?: string;
}

interface HealthSummary {
  total: number;
  pass: number;
  fixed: number;
  warn: number;
  fail: number;
  score: number;
}

interface BuildHealthReportProps {
  report: {
    checks: HealthCheck[];
    summary: HealthSummary;
    issues: string[];
  };
}

const STATUS_CONFIG = {
  pass: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "OK" },
  fixed: { icon: Wrench, color: "text-blue-500", bg: "bg-blue-500/10", label: "Corrigido" },
  warn: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Aviso" },
  fail: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Falha" },
};

const CATEGORY_ICON: Record<string, typeof Package> = {
  "package.json": Package,
  "vite.config.ts": FileCode,
  "vercel.json": Globe,
  tsconfig: FileJson,
  general: ShieldCheck,
};

export function BuildHealthReport({ report }: BuildHealthReportProps) {
  const { checks, summary } = report;
  const scoreColor = summary.score >= 90 ? "text-green-500" : summary.score >= 70 ? "text-yellow-500" : "text-destructive";

  // Group by category
  const grouped = checks.reduce<Record<string, HealthCheck[]>>((acc, c) => {
    (acc[c.category] ??= []).push(c);
    return acc;
  }, {});

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-display flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Relatório de Saúde do Build
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${scoreColor}`}>{summary.score}%</span>
            <Badge variant={summary.fail > 0 ? "destructive" : "default"} className="text-[10px]">
              {summary.fail > 0 ? "Bloqueado" : summary.warn > 0 ? "Avisos" : "Saudável"}
            </Badge>
          </div>
        </div>
        <Progress value={summary.score} className="h-1.5 mt-2" />
        <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" />{summary.pass} ok</span>
          <span className="flex items-center gap-1"><Wrench className="h-3 w-3 text-blue-500" />{summary.fixed} corrigidos</span>
          <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-yellow-500" />{summary.warn} avisos</span>
          <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-destructive" />{summary.fail} falhas</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(grouped).map(([cat, items]) => {
          const CatIcon = CATEGORY_ICON[cat] || ShieldCheck;
          return (
            <div key={cat}>
              <p className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                <CatIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {cat}
              </p>
              <div className="space-y-1 ml-5">
                {items.map((check) => {
                  const cfg = STATUS_CONFIG[check.status];
                  const Icon = cfg.icon;
                  return (
                    <div key={check.id} className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${cfg.bg}`}>
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${cfg.color}`} />
                      <span className="flex-1">{check.label}</span>
                      {check.detail && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{check.detail}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
