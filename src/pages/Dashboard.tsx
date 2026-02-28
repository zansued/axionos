import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { useDashboardKPIs } from "@/hooks/useDashboardKPIs";
import { KPICards } from "@/components/dashboard/KPICards";
import { TopAgentsTable } from "@/components/dashboard/TopAgentsTable";

const STORY_STATUS_COLORS: Record<string, string> = {
  todo: "hsl(215, 15%, 55%)", in_progress: "hsl(210, 100%, 52%)",
  done: "hsl(160, 84%, 39%)", blocked: "hsl(0, 72%, 51%)",
};
const STORY_STATUS_LABELS: Record<string, string> = {
  todo: "A Fazer", in_progress: "Em Progresso", done: "Concluído", blocked: "Bloqueado",
};
const ROLE_COLORS: Record<string, string> = {
  devops: "hsl(210, 100%, 52%)", qa: "hsl(38, 92%, 50%)", architect: "hsl(270, 60%, 60%)",
  sm: "hsl(160, 84%, 39%)", po: "hsl(160, 84%, 39%)", dev: "hsl(215, 15%, 55%)",
};
const ROLE_LABELS: Record<string, string> = {
  devops: "DevOps", qa: "QA", architect: "Architect", sm: "Scrum Master",
  po: "Product Owner", dev: "Developer",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "hsl(215, 15%, 55%)", medium: "hsl(210, 100%, 52%)",
  high: "hsl(38, 92%, 50%)", critical: "hsl(0, 72%, 51%)",
};
const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa", medium: "Média", high: "Alta", critical: "Crítica",
};

const tooltipStyle = {
  backgroundColor: "hsl(225, 22%, 11%)", border: "1px solid hsl(225, 15%, 18%)",
  borderRadius: "8px", color: "hsl(210, 20%, 92%)", fontSize: "12px",
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

export default function Dashboard() {
  const { data: kpis, isLoading } = useDashboardKPIs();

  // Stories by status
  const { data: storiesByStatus = [] } = useQuery({
    queryKey: ["stories-by-status"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stories").select("status");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((s: any) => { counts[s.status] = (counts[s.status] || 0) + 1; });
      return Object.entries(counts).map(([status, count]) => ({
        name: STORY_STATUS_LABELS[status] || status, value: count,
        color: STORY_STATUS_COLORS[status] || "hsl(215, 15%, 55%)",
      }));
    },
  });

  // Agents by role
  const { data: agentsByRole = [] } = useQuery({
    queryKey: ["agents-by-role"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agents").select("role");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((a: any) => { counts[a.role] = (counts[a.role] || 0) + 1; });
      return Object.entries(counts).map(([role, count]) => ({
        name: ROLE_LABELS[role] || role, value: count,
        fill: ROLE_COLORS[role] || "hsl(215, 15%, 55%)",
      }));
    },
  });

  // Stories by priority
  const { data: storiesByPriority = [] } = useQuery({
    queryKey: ["stories-by-priority"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stories").select("priority");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((s: any) => { counts[s.priority] = (counts[s.priority] || 0) + 1; });
      return ["low", "medium", "high", "critical"]
        .filter((p) => counts[p])
        .map((priority) => ({
          name: PRIORITY_LABELS[priority], value: counts[priority],
          fill: PRIORITY_COLORS[priority],
        }));
    },
  });

  const hasChartData = storiesByStatus.length > 0 || agentsByRole.length > 0 || storiesByPriority.length > 0;

  return (
    <AppLayout>
      <motion.div className="space-y-8" variants={container} initial="hidden" animate="show">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">KPIs e visão geral do sistema AIOS</p>
        </div>

        {/* KPI Cards */}
        {kpis && <KPICards kpis={kpis} />}

        {/* Charts + Top Agents */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {storiesByStatus.length > 0 && (
            <Card className="border-border/50">
              <CardHeader><CardTitle className="font-display text-base">Stories por Status</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={storiesByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} strokeWidth={0}>
                      {storiesByStatus.map((entry: any, idx: number) => <Cell key={idx} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {agentsByRole.length > 0 && (
            <Card className="border-border/50">
              <CardHeader><CardTitle className="font-display text-base">Agentes por Role</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={agentsByRole} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Top agents in third column */}
          {kpis && <TopAgentsTable agents={kpis.topAgents} />}
        </div>

        {storiesByPriority.length > 0 && (
          <Card className="border-border/50">
            <CardHeader><CardTitle className="font-display text-base">Stories por Prioridade</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={storiesByPriority} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {!hasChartData && !kpis?.storiesTotal && (
          <Card className="border-dashed border-2 border-border">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-lg font-semibold">Sem dados ainda</h3>
              <p className="text-sm text-muted-foreground mt-1">Crie agentes e stories para ver os KPIs aqui</p>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50">
          <CardHeader><CardTitle className="font-display text-lg">Status do Sistema</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-success animate-pulse-glow" />
            <span className="text-sm text-muted-foreground">Todos os sistemas operacionais</span>
            <Badge variant="outline" className="ml-auto border-success/30 text-success">Online</Badge>
          </CardContent>
        </Card>
      </motion.div>
    </AppLayout>
  );
}
