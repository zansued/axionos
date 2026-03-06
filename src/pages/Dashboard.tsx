import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Activity, ArrowRight, ArrowUpRight, Cpu, Globe, Layers, Lightbulb,
  Rocket, Zap, CheckCircle2, Clock, DollarSign, GitBranch,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useDashboardKPIs } from "@/hooks/useDashboardKPIs";
import { useI18n } from "@/contexts/I18nContext";
import { useNavigate } from "react-router-dom";
import { useOnboarding } from "@/components/OnboardingGuide";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

function MetricCard({ label, value, subtext, icon: Icon }: { label: string; value: string | number; subtext?: string; icon: React.ElementType }) {
  return (
    <motion.div variants={item} className="border border-border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </motion.div>
  );
}

const JOURNEY_STEPS = [
  { icon: Lightbulb, labelPt: "Ideia", labelEn: "Idea" },
  { icon: Layers, labelPt: "Pipeline", labelEn: "Pipeline" },
  { icon: GitBranch, labelPt: "Repositório", labelEn: "Repository" },
  { icon: Globe, labelPt: "Deploy", labelEn: "Deploy" },
];

const OUTCOME_COLORS: Record<string, string> = {
  deployed: "bg-success",
  published: "bg-primary",
  deploying: "bg-warning animate-pulse",
  deploy_failed: "bg-destructive",
  ready_to_publish: "bg-info",
  validating: "bg-warning",
  in_progress: "bg-primary",
};

export default function Dashboard() {
  const { data: kpis, isLoading } = useDashboardKPIs();
  const { locale } = useI18n();
  const navigate = useNavigate();
  const { showOnboarding } = useOnboarding();
  const en = locale === "en-US";

  const { data: recentInitiatives = [] } = useQuery({
    queryKey: ["recent-initiatives"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("initiatives")
        .select("id, title, status, stage_status, deploy_url, deploy_status, updated_at")
        .order("updated_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  const hasInitiatives = recentInitiatives.length > 0;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <motion.div className="space-y-8" variants={container} initial="hidden" animate="show">
          {/* Header */}
          <motion.div variants={item}>
            <h1 className="text-2xl font-semibold tracking-tight">
              {en ? "Dashboard" : "Dashboard"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {en
                ? "From idea to deployed product — track your initiatives"
                : "Da ideia ao produto deployado — acompanhe suas iniciativas"}
            </p>
          </motion.div>

          {/* First-run hero */}
          {!hasInitiatives && !isLoading && (
            <motion.div variants={item}>
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold tracking-tight">
                      {en ? "Build your first product" : "Construa seu primeiro produto"}
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-xl">
                      {en
                        ? "Describe an idea and AxionOS will generate architecture, code, tests, and deploy it — all with your approval at every step."
                        : "Descreva uma ideia e o AxionOS vai gerar arquitetura, código, testes e fazer deploy — tudo com sua aprovação em cada etapa."}
                    </p>
                  </div>

                  {/* Product journey mini */}
                  <div className="flex items-center gap-2 overflow-x-auto py-2">
                    {JOURNEY_STEPS.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                            <s.icon className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{en ? s.labelEn : s.labelPt}</span>
                        </div>
                        {i < JOURNEY_STEPS.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => navigate("/initiatives")} className="gap-2">
                      <Rocket className="h-4 w-4" />
                      {en ? "Create First Initiative" : "Criar Primeira Iniciativa"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={showOnboarding} className="text-muted-foreground">
                      {en ? "How it works" : "Como funciona"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label={en ? "Initiatives" : "Iniciativas"}
              value={recentInitiatives.length}
              subtext={(() => {
                const deployed = recentInitiatives.filter((i: any) => i.stage_status === "deployed").length;
                return deployed > 0 ? `${deployed} ${en ? "deployed" : "deployadas"}` : undefined;
              })()}
              icon={Lightbulb}
            />
            <MetricCard
              label={en ? "Stories" : "Stories"}
              value={kpis?.storiesTotal ?? 0}
              subtext={kpis ? `${kpis.storiesDone} ${en ? "completed" : "concluídas"}` : undefined}
              icon={Zap}
            />
            <MetricCard
              label={en ? "Pending Review" : "Em Revisão"}
              value={kpis?.pendingReview ?? 0}
              icon={Cpu}
            />
            <MetricCard
              label={en ? "Monthly Cost" : "Custo Mensal"}
              value={kpis ? `$${kpis.monthlyCost.toFixed(2)}` : "$0.00"}
              icon={Activity}
            />
          </div>

          {/* Recent initiatives */}
          <motion.div variants={item}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium">
                {en ? "Recent Initiatives" : "Iniciativas Recentes"}
              </h2>
              {hasInitiatives && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/initiatives")} className="text-xs gap-1">
                  {en ? "View all" : "Ver todas"} <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="border border-border rounded-lg divide-y divide-border bg-card">
              {!hasInitiatives ? (
                <div className="p-8 text-center space-y-3">
                  <Lightbulb className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    {en
                      ? "No initiatives yet. Create one to see your product take shape."
                      : "Nenhuma iniciativa ainda. Crie uma para ver seu produto tomar forma."}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => navigate("/initiatives")} className="gap-1.5">
                    <Rocket className="h-3.5 w-3.5" />
                    {en ? "Create Initiative" : "Criar Iniciativa"}
                  </Button>
                </div>
              ) : (
                recentInitiatives.map((init: any) => (
                  <button
                    key={init.id}
                    onClick={() => navigate("/initiatives")}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group w-full text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${OUTCOME_COLORS[init.stage_status] || "bg-muted-foreground/30"}`} />
                      <span className="text-sm truncate">{init.title}</span>
                      {init.deploy_url && (
                        <Badge variant="outline" className="text-[9px] gap-0.5 shrink-0">
                          <Globe className="h-2.5 w-2.5" /> Live
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {init.stage_status}
                      </Badge>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>

          {/* System status */}
          <motion.div variants={item} className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-success" />
            <span>{en ? "All systems operational" : "Todos os sistemas operacionais"}</span>
          </motion.div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
