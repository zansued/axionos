import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowUpRight, Cpu, Layers, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useDashboardKPIs } from "@/hooks/useDashboardKPIs";

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

export default function Dashboard() {
  const { data: kpis, isLoading } = useDashboardKPIs();

  const { data: recentInitiatives = [] } = useQuery({
    queryKey: ["recent-initiatives"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("initiatives")
        .select("id, title, status, stage_status, updated_at")
        .order("updated_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <motion.div className="space-y-8" variants={container} initial="hidden" animate="show">
          {/* Header */}
          <motion.div variants={item}>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Overview of your engineering workspace</p>
          </motion.div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Stories"
              value={kpis?.storiesTotal ?? 0}
              subtext={kpis ? `${kpis.storiesDone} completed` : undefined}
              icon={Zap}
            />
            <MetricCard
              label="Done"
              value={kpis?.storiesDone ?? 0}
              icon={Layers}
            />
            <MetricCard
              label="Pending Review"
              value={kpis?.pendingReview ?? 0}
              icon={Cpu}
            />
            <MetricCard
              label="Monthly Cost"
              value={kpis ? `$${kpis.monthlyCost.toFixed(2)}` : "$0.00"}
              icon={Activity}
            />
          </div>

          {/* Recent initiatives */}
          <motion.div variants={item}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium">Recent Initiatives</h2>
            </div>
            <div className="border border-border rounded-lg divide-y divide-border bg-card">
              {recentInitiatives.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">No initiatives yet. Create one to get started.</p>
                </div>
              ) : (
                recentInitiatives.map((init: any) => (
                  <a
                    key={init.id}
                    href="/initiatives"
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-2 w-2 rounded-full bg-success shrink-0" />
                      <span className="text-sm truncate">{init.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {init.stage_status}
                      </Badge>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
                ))
              )}
            </div>
          </motion.div>

          {/* System status */}
          <motion.div variants={item} className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-success" />
            <span>All systems operational</span>
          </motion.div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
