import { AppLayout } from "@/components/AppLayout";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { FolderKanban } from "lucide-react";

export default function ProjectDetail() {
  return (
    <AppLayout>
      <PlaceholderPage
        title="Project Detail"
        description="Single project view with lifecycle stages, stories, agents, and deployment status."
        icon={FolderKanban}
        category="Product Surface"
        plannedComponents={["Lifecycle Stage Tabs", "Stories List", "Agent Assignments", "Deploy Timeline", "Activity Feed"]}
        plannedActions={["Edit Project", "Deploy", "Rollback", "View Stories"]}
      />
    </AppLayout>
  );
}
