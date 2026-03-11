/**
 * AppShell — Canonical layout wrapper for all authenticated AxionOS screens.
 * Provides: persistent sidebar, sticky top bar, content area, optional context panel.
 * 
 * Usage:
 *   <AppShell>
 *     <YourPageContent />
 *   </AppShell>
 * 
 * This is the canonical layout component. All new pages should use this.
 * Legacy pages may still import AppLayout which re-exports this.
 */

import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ContextPanel } from "@/components/ContextPanel";
import { Topbar } from "@/components/layout/Topbar";

interface AppShellProps {
  children: ReactNode;
  /** Optional: hide the top bar subtitle on narrow viewports */
  compactTopBar?: boolean;
}

export function AppShell({ children, compactTopBar = false }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── Sticky Top Bar ── */}
        <Topbar compact={compactTopBar} />

        {/* ── Main Content Area ── */}
        <main className="flex-1 overflow-auto p-3 md:p-5">
          {children}
        </main>
      </div>

      {/* ── Optional Right Context Panel ── */}
      <ContextPanel />
    </SidebarProvider>
  );
}

// Re-export as AppLayout for backward compatibility
export { AppShell as AppLayout };
