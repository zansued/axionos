import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { PageGuidanceShell } from "@/components/guidance";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Activity, AlertTriangle, Info, Bug, Search,
  Filter, RefreshCw, Clock, User, Database, ChevronDown,
  ChevronRight, Zap, FileText, Download, FileCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useI18n } from "@/contexts/I18nContext";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SEVERITY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  info: { icon: Info, color: "text-info", bg: "bg-info/10 border-info/20", label: "Info" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10 border-warning/20", label: "Warning" },
  error: { icon: Bug, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", label: "Erro" },
  success: { icon: Zap, color: "text-success", bg: "bg-success/10 border-success/20", label: "Sucesso" },
};

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  agents: { icon: User, label: "Agentes", color: "text-primary" },
  stories: { icon: FileText, label: "Stories", color: "text-accent-foreground" },
  system: { icon: Database, label: "Sistema", color: "text-muted-foreground" },
  auth: { icon: Shield, label: "Auth", color: "text-warning" },
};

const ACTION_LABELS: Record<string, string> = {
  created: "Criou",
  updated: "Atualizou",
  deleted: "Removeu",
  login: "Login",
  logout: "Logout",
};

export default function AuditLogs() {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const { t } = useI18n();

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["audit-logs", severityFilter, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (severityFilter !== "all") query = query.eq("severity", severityFilter);
      if (categoryFilter !== "all") query = query.eq("category", categoryFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Governance evidence: initiative jobs (approvals/rejections)
  const { data: governanceJobs = [] } = useQuery({
    queryKey: ["governance-jobs", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("initiative_jobs")
        .select("*, initiatives(title)")
        .in("stage", ["approve", "reject", "discovery", "planning", "architecture", "squad", "execution", "validation", "publish"])
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  // Artifact reviews for compliance
  const { data: reviews = [] } = useQuery({
    queryKey: ["compliance-reviews", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg) return [];
      const { data, error } = await supabase
        .from("artifact_reviews")
        .select("*, agent_outputs(summary, type, initiative_id, initiatives(title))")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  const filteredLogs = logs.filter((log: any) =>
    !search || log.message?.toLowerCase().includes(search.toLowerCase()) ||
    log.action?.toLowerCase().includes(search.toLowerCase()) ||
    log.entity_type?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalToday = logs.filter((l: any) => {
    const d = new Date(l.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const errorCount = logs.filter((l: any) => l.severity === "error").length;
  const warningCount = logs.filter((l: any) => l.severity === "warning").length;
  const approvalCount = governanceJobs.filter((j: any) => j.stage === "approve").length;

  const stats = [
    { label: "Total Hoje", value: totalToday, icon: Activity, color: "text-primary" },
    { label: "Erros", value: errorCount, icon: Bug, color: "text-destructive" },
    { label: "Aprovações", value: approvalCount, icon: FileCheck, color: "text-success" },
    { label: "Total", value: logs.length, icon: Database, color: "text-muted-foreground" },
  ];

  const handleExportAuditCSV = () => {
    const rows = filteredLogs.map((l: any) => ({
      timestamp: format(new Date(l.created_at), "yyyy-MM-dd HH:mm:ss"),
      action: l.action,
      category: l.category,
      severity: l.severity,
      message: l.message,
      entity_type: l.entity_type || "",
      entity_id: l.entity_id || "",
    }));
    exportToCSV(rows, "audit-trail");
  };

  const handleExportAuditPDF = () => {
    const rows = filteredLogs.map((l: any) => ({
      timestamp: format(new Date(l.created_at), "dd/MM/yyyy HH:mm"),
      action: l.action,
      severity: l.severity,
      message: l.message?.substring(0, 80) || "",
    }));
    exportToPDF("Trilha de Auditoria — Evidências de Governança", rows, "audit-trail");
  };

  const handleExportGovernanceCSV = () => {
    const rows = governanceJobs.map((j: any) => ({
      timestamp: format(new Date(j.created_at), "yyyy-MM-dd HH:mm:ss"),
      initiative: (j as any).initiatives?.title || j.initiative_id,
      stage: j.stage,
      status: j.status,
      duration_ms: j.duration_ms || "",
      cost_usd: j.cost_usd || "",
      model: j.model || "",
      error: j.error || "",
    }));
    exportToCSV(rows, "governance-evidence");
  };

  const handleExportGovernancePDF = () => {
    const rows = governanceJobs.map((j: any) => ({
      data: format(new Date(j.created_at), "dd/MM/yyyy HH:mm"),
      iniciativa: (j as any).initiatives?.title || j.initiative_id?.slice(0, 8),
      estágio: j.stage,
      status: j.status,
      custo: j.cost_usd ? `$${Number(j.cost_usd).toFixed(4)}` : "—",
    }));
    exportToPDF("Relatório de Governança — Evidências de Pipeline", rows, "governance-evidence");
  };

  const handleExportReviewsCSV = () => {
    const rows = reviews.map((r: any) => ({
      timestamp: format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss"),
      action: r.action,
      initiative: (r as any).agent_outputs?.initiatives?.title || "",
      artifact_type: (r as any).agent_outputs?.type || "",
      previous_status: r.previous_status || "",
      new_status: r.new_status || "",
      comment: r.comment || "",
      reviewer_id: r.reviewer_id,
    }));
    exportToCSV(rows, "review-evidence");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {guidance && <PageIntroCard guidance={guidance} whyNow={whyNowText} compact />}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Auditoria & Compliance
            </h1>
            <p className="text-muted-foreground mt-1">Trilha de auditoria, evidências de governança e exportação para compliance</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted/50 ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="audit" className="space-y-4">
          <TabsList>
            <TabsTrigger value="audit" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Audit Trail</TabsTrigger>
            <TabsTrigger value="governance" className="gap-1.5"><FileCheck className="h-3.5 w-3.5" /> Governança</TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Reviews</TabsTrigger>
          </TabsList>

          {/* ===== AUDIT TRAIL TAB ===== */}
          <TabsContent value="audit" className="space-y-4">
            {/* Filters */}
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar logs..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Severidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Erro</SelectItem>
                      <SelectItem value="success">Sucesso</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px]">
                      <Database className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="agents">Agentes</SelectItem>
                      <SelectItem value="stories">Stories</SelectItem>
                      <SelectItem value="system">Sistema</SelectItem>
                      <SelectItem value="auth">Auth</SelectItem>
                    </SelectContent>
                  </Select>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Download className="h-3.5 w-3.5" />
                        {t("common.export")}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={handleExportAuditCSV}>{t("common.exportCSV")}</DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExportAuditPDF}>{t("common.exportPDF")}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>

            {/* Log Timeline */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="border-border/50 animate-pulse">
                    <CardContent className="p-4 h-16" />
                  </Card>
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <Card className="border-dashed border-2 border-border">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="font-display text-lg font-semibold">Nenhum log encontrado</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {search ? "Tente ajustar seus filtros" : "Logs aparecerão aqui conforme ações são realizadas"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timeline — {filteredLogs.length} eventos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="divide-y divide-border/30">
                      <AnimatePresence>
                        {filteredLogs.map((log: any, i: number) => {
                          const severity = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;
                          const category = CATEGORY_CONFIG[log.category] || CATEGORY_CONFIG.system;
                          const SeverityIcon = severity.icon;
                          const CategoryIcon = category.icon;
                          const isExpanded = expandedLog === log.id;

                          return (
                            <motion.div
                              key={log.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: Math.min(i * 0.02, 0.5) }}
                            >
                              <Collapsible open={isExpanded} onOpenChange={(open) => setExpandedLog(open ? log.id : null)}>
                                <div className={`px-4 py-3 hover:bg-muted/30 transition-colors ${isExpanded ? "bg-muted/20" : ""}`}>
                                  <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 p-1.5 rounded-md border ${severity.bg}`}>
                                      <SeverityIcon className={`h-3.5 w-3.5 ${severity.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium">
                                          {ACTION_LABELS[log.action] || log.action}
                                        </span>
                                        <Badge variant="outline" className="text-xs gap-1 font-mono">
                                          <CategoryIcon className={`h-3 w-3 ${category.color}`} />
                                          {category.label}
                                        </Badge>
                                        {log.entity_type && (
                                          <Badge className="text-xs bg-muted text-muted-foreground border-0 font-mono">
                                            {log.entity_type}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground line-clamp-1">{log.message}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-xs text-muted-foreground font-mono">
                                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                                      </span>
                                      <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                        </Button>
                                      </CollapsibleTrigger>
                                    </div>
                                  </div>
                                </div>
                                <CollapsibleContent>
                                  <div className="px-4 pb-4 pt-1 ml-10 space-y-3">
                                    <Separator />
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                      <div>
                                        <span className="text-muted-foreground block mb-0.5">ID do Evento</span>
                                        <span className="font-mono text-foreground/80 break-all">{log.id.slice(0, 8)}...</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground block mb-0.5">Data/Hora</span>
                                        <span className="font-mono text-foreground/80">
                                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground block mb-0.5">Entidade</span>
                                        <span className="font-mono text-foreground/80">{log.entity_type || "—"}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground block mb-0.5">Severidade</span>
                                        <Badge className={`text-xs ${severity.bg} ${severity.color} border`}>
                                          {severity.label}
                                        </Badge>
                                      </div>
                                    </div>
                                    {log.entity_id && (
                                      <div className="text-xs">
                                        <span className="text-muted-foreground">Entity ID: </span>
                                        <span className="font-mono text-foreground/80">{log.entity_id}</span>
                                      </div>
                                    )}
                                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                                      <div>
                                        <span className="text-xs text-muted-foreground block mb-1">Metadata</span>
                                        <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-x-auto border border-border/50">
                                          {JSON.stringify(log.metadata, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===== GOVERNANCE TAB ===== */}
          <TabsContent value="governance" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Registro de todas as execuções do pipeline — evidências de aprovações, rejeições e estágios processados.
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    {t("common.export")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleExportGovernanceCSV}>{t("common.exportCSV")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportGovernancePDF}>{t("common.exportPDF")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {governanceJobs.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <FileCheck className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="font-display text-lg font-semibold">Nenhuma evidência ainda</h3>
                  <p className="text-sm text-muted-foreground mt-1">Execute estágios do pipeline para gerar evidências de governança</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50 overflow-hidden">
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="divide-y divide-border/30">
                      {governanceJobs.map((job: any) => {
                        const isApproval = job.stage === "approve";
                        const isRejection = job.stage === "reject";
                        return (
                          <div key={job.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded-md border ${isApproval ? "bg-success/10 border-success/20" : isRejection ? "bg-destructive/10 border-destructive/20" : "bg-muted/50 border-border"}`}>
                                <FileCheck className={`h-3.5 w-3.5 ${isApproval ? "text-success" : isRejection ? "text-destructive" : "text-muted-foreground"}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium capitalize">{job.stage}</span>
                                  <Badge variant={job.status === "completed" ? "default" : job.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                                    {job.status}
                                  </Badge>
                                  {(job as any).initiatives?.title && (
                                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                      — {(job as any).initiatives.title}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  {job.duration_ms && <span>{(job.duration_ms / 1000).toFixed(1)}s</span>}
                                  {job.cost_usd && <span>${Number(job.cost_usd).toFixed(4)}</span>}
                                  {job.model && <span className="font-mono">{job.model}</span>}
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground font-mono shrink-0">
                                {format(new Date(job.created_at), "dd/MM HH:mm")}
                              </span>
                            </div>
                            {job.error && (
                              <p className="text-xs text-destructive mt-2 ml-10 line-clamp-2">{job.error}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===== REVIEWS TAB ===== */}
          <TabsContent value="reviews" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Histórico de revisões humanas em artefatos — aprovações, rejeições e rework solicitados.
              </p>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportReviewsCSV}>
                <Download className="h-3.5 w-3.5" />
                {t("common.exportCSV")}
              </Button>
            </div>

            {reviews.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="font-display text-lg font-semibold">Nenhuma review ainda</h3>
                  <p className="text-sm text-muted-foreground mt-1">Revise artefatos para gerar evidências de compliance</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50 overflow-hidden">
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="divide-y divide-border/30">
                      {reviews.map((rev: any) => (
                        <div key={rev.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <Badge variant={rev.action === "approve" ? "default" : rev.action === "reject" ? "destructive" : "secondary"} className="text-xs capitalize">
                              {rev.action}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {(rev as any).agent_outputs?.initiatives?.title && (
                                  <span className="text-sm font-medium truncate">{(rev as any).agent_outputs.initiatives.title}</span>
                                )}
                                {(rev as any).agent_outputs?.type && (
                                  <Badge variant="outline" className="text-xs font-mono">{(rev as any).agent_outputs.type}</Badge>
                                )}
                              </div>
                              {rev.comment && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{rev.comment}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs text-muted-foreground font-mono">
                                {format(new Date(rev.created_at), "dd/MM HH:mm")}
                              </span>
                              {rev.previous_status && rev.new_status && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {rev.previous_status} → {rev.new_status}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
