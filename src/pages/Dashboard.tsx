import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, Zap, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { user } = useAuth();

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

  const stats = [
    { title: "Agentes", value: agentCount, icon: Users, color: "text-primary" },
    { title: "Agentes Ativos", value: activeAgents, icon: Activity, color: "text-success" },
    { title: "Stories", value: storyCount, icon: BookOpen, color: "text-accent" },
    { title: "Em Progresso", value: inProgressStories, icon: Zap, color: "text-warning" },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do sistema AIOS
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-display">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Status do Sistema</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-success animate-pulse-glow" />
            <span className="text-sm text-muted-foreground">Todos os sistemas operacionais</span>
            <Badge variant="outline" className="ml-auto border-success/30 text-success">
              Online
            </Badge>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
