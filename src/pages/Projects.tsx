import { AppLayout } from "@/components/AppLayout";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { FolderKanban } from "lucide-react";

export default function Projects() {
  return (
    <AppLayout>
      <PlaceholderPage
        title="Projects"
        description="All initiatives and projects with status, progress, and quick navigation."
        icon={FolderKanban}
        category="Product Surface"
        plannedComponents={["Project List Table", "Status Badges", "Progress Bars", "Search & Filters"]}
        plannedActions={["Create Project", "Open Project", "Archive Project"]}
      />
    </AppLayout>
  );
}
