import { AppLayout } from "@/components/AppLayout";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { Layers } from "lucide-react";

export default function Modes() {
  return (
    <AppLayout>
      <PlaceholderPage
        title="Modes"
        description="Operational mode management for surface, strategy, and runtime configurations."
        icon={Layers}
        category="Product Surface"
        plannedComponents={["Active Modes Panel", "Mode Comparison", "Impact Preview", "History"]}
        plannedActions={["Switch Mode", "Preview Impact", "Reset to Default"]}
      />
    </AppLayout>
  );
}
