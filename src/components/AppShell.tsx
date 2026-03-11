/**
 * AppShell — Canonical layout wrapper for all authenticated AxionOS screens.
 * Provides: persistent sidebar, sticky top bar, content area, optional context panel.
 */

import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ContextPanel } from "@/components/ContextPanel";
import { Topbar } from "@/components/layout/Topbar";
import { PageGuidanceShell } from "@/components/guidance/PageGuidanceShell";
import { getPageKeyFromRoute } from "@/lib/guidance/route-page-keys";

interface AppShellProps {
  children: ReactNode;
  compactTopBar?: boolean;
}

export function AppShell({ children, compactTopBar = false }: AppShellProps) {
  const { pathname } = useLocation();
  const pageKey = getPageKeyFromRoute(pathname);

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar compact={compactTopBar} />
        <main className="flex-1 overflow-auto p-3 md:p-5">
          {pageKey && <PageGuidanceShell pageKey={pageKey} />}
          {children}
        </main>
      </div>
      <ContextPanel />
    </SidebarProvider>
  );
}

export { AppShell as AppLayout };
