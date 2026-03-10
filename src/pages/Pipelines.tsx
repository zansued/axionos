import { AppLayout } from "@/components/AppLayout";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { GitBranch } from "lucide-react";

export default function Pipelines() {
  return (
    <AppLayout>
      <PlaceholderPage
        title="Pipelines"
        description="Pipeline list with execution status, duration, success rates, and drill-down."
        icon={GitBranch}
        category="Product Surface"
        plannedComponents={["Pipeline List Table", "Status Filters", "Execution Sparklines", "Duration Columns"]}
        plannedActions={["Run Pipeline", "View Detail", "Cancel Run"]}
      />
    </AppLayout>
  );
}
