import { AppLayout } from "@/components/AppLayout";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <AppLayout>
      <PlaceholderPage
        title="Settings"
        description="Workspace and user settings, roles & access, API integrations, and environment controls."
        icon={SettingsIcon}
        category="Settings"
        plannedComponents={["Profile Form", "Roles Matrix", "API Keys", "Feature Flags", "Environment Config"]}
        plannedActions={["Update Settings", "Manage Roles", "Generate API Key"]}
      />
    </AppLayout>
  );
}
