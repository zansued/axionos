/**
 * OperationalDashboard — Main AxionOS operational control view.
 * Composes modular dashboard sub-components.
 */

import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { SystemStatusBar, KPIGrid } from "./DashboardOverview";
import { RuntimeActivity } from "./RuntimeActivity";
import { GovernancePanel } from "./GovernancePanel";
import { ObservabilityMini, QuickActions } from "./ObservabilityPanel";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

export function OperationalDashboard() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4 max-w-[1600px]"
    >
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display font-semibold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">System overview and operational intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-mono">
            {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </Badge>
        </div>
      </div>

      {/* System Status */}
      <SystemStatusBar />

      {/* KPI Grid */}
      <KPIGrid />

      {/* Two-column layout */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <RuntimeActivity />
          <ObservabilityMini />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <GovernancePanel />
          <QuickActions />
        </div>
      </div>
    </motion.div>
  );
}
