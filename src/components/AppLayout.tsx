import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ContextPanel } from "@/components/ContextPanel";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export function AppLayout({ children }: { children: ReactNode }) {
  const { contextPanel } = useWorkspace();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex min-w-0">
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-12 flex items-center border-b border-border px-3 shrink-0">
              <SidebarTrigger className="mr-3" />
            </header>
            <main className="flex-1 overflow-auto p-3 md:p-5">
              {children}
            </main>
          </div>
          <ContextPanel />
        </div>
      </div>
    </SidebarProvider>
  );
}
