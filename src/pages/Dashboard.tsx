import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, Zap, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

const STORY_STATUS_COLORS: Record<string, string> = {
  todo: "hsl(215, 15%, 55%)",
  in_progress: "hsl(210, 100%, 52%)",
  done: "hsl(160, 84%, 39%)",
  blocked: "hsl(0, 72%, 51%)",
};

const STORY_STATUS_LABELS: Record<string, string> = {
  todo: "A Fazer",
  in_progress: "Em Progresso",
  done: "Concluído",
  blocked: "Bloqueado",
};

const ROLE_COLORS: Record<string, string> = {
  devops: "hsl(210, 100%, 52%)",
  qa: "hsl(38, 92%, 50%)",
  architect: "hsl(270, 60%, 60%)",
  sm: "hsl(160, 84%, 39%)",
  po: "hsl(160, 84%, 39%)",
  dev: "hsl(215, 15%, 55%)",
};

const ROLE_LABELS: Record<string, string> = {
  devops: "DevOps",
  qa: "QA",
  architect: "Architect",
  sm: "Scrum Master",
  po: "Product Owner",
  dev: "Developer",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "hsl(215, 15%, 55%)",
  medium: "hsl(210, 100%, 52%)",
  high: "hsl(38, 92%, 50%)",
  critical: "hsl(0, 72%, 51%)",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export default function Dashboard() {
  const { data: agentCount = 0 } = useQuery({
    queryKey: ["agent-count"],
    queryFn: async () => {
      const { count } = await supabase.from("agents").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: storyCount = 0 } = useQuery({
    queryKey: ["story-count"],
    queryFn: async () => {
      const { count } = await supabase.from("stories").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: activeAgents = 0 } = useQuery({
    queryKey: ["active-agents"],
    queryFn: async () => {
      const { count } = await supabase.from("agents").select("*", { count: "exact", head: true }).eq("status", "active");
      return count ?? 0;
    },
  });

  const { data: inProgressStories = 0 } = useQuery({
    queryKey: ["in-progress-stories"],
    queryFn: async () => {
      const { count } = await supabase.from("stories").select("*", { count: "exact", head: true }).eq("status", "in_progress");
      return count ?? 0;
    },
  });

  // Stories by status
  const { data: storiesByStatus = [] } = useQuery({
    queryKey: ["stories-by-status"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stories").select("status");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((s: any) => { counts[s.status] = (counts[s.status] || 0) + 1; });
      return Object.entries(counts).map(([status, count]) => ({
        name: STORY_STATUS_LABELS[status] || status,
        value: count,
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
        name: ROLE_LABELS[role] || role,
        value: count,
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
          name: PRIORITY_LABELS[priority],
          value: counts[priority],
          fill: PRIORITY_COLORS[priority],
        }));
    },
  });

  const stats = [
    { title: "Agentes", value: agentCount, icon: Users, color: "text-primary" },
    { title: "Agentes Ativos", value: activeAgents, icon: Activity, color: "text-success" },
    { title: "Stories", value: storyCount, icon: BookOpen, color: "text-accent" },
    { title: "Em Progresso", value: inProgressStories, icon: Zap, color: "text-warning" },
  ];

  const hasChartData = storiesByStatus.length > 0 || agentsByRole.length > 0 || storiesByPriority.length > 0;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral do sistema AIOS</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {hasChartData ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Stories by Status - Pie */}
            {storiesByStatus.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="font-display text-base">Stories por Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={storiesByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} strokeWidth={0}>
                          {storiesByStatus.map((entry: any, idx: number) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "hsl(225, 22%, 11%)", border: "1px solid hsl(225, 15%, 18%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)", fontSize: "12px" }} />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Agents by Role - Bar */}
            {agentsByRole.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="font-display text-base">Agentes por Role</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={agentsByRole} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                        <XAxis dataKey="name" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(225, 22%, 11%)", border: "1px solid hsl(225, 15%, 18%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)", fontSize: "12px" }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Stories by Priority - Bar */}
            {storiesByPriority.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="font-display text-base">Stories por Prioridade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={storiesByPriority} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                        <XAxis dataKey="name" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(225, 22%, 11%)", border: "1px solid hsl(225, 15%, 18%)", borderRadius: "8px", color: "hsl(210, 20%, 92%)", fontSize: "12px" }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        ) : (
          <Card className="border-dashed border-2 border-border">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-lg font-semibold">Sem dados para gráficos</h3>
              <p className="text-sm text-muted-foreground mt-1">Crie agentes e stories para ver os gráficos aqui</p>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Status do Sistema</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-success animate-pulse-glow" />
            <span className="text-sm text-muted-foreground">Todos os sistemas operacionais</span>
            <Badge variant="outline" className="ml-auto border-success/30 text-success">Online</Badge>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
