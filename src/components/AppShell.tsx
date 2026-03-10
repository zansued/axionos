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
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ContextPanel } from "@/components/ContextPanel";
import { Button } from "@/components/ui/button";
import { Search, Bell } from "lucide-react";
import axionLogo from "@/assets/axion-logo.svg";

interface AppShellProps {
  children: ReactNode;
  /** Optional: hide the top bar subtitle on narrow viewports */
  compactTopBar?: boolean;
}

export function AppShell({ children, compactTopBar = false }: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex min-w-0">
          <div className="flex-1 flex flex-col min-w-0">
            {/* ── Sticky Top Bar ── */}
            <header className="h-11 flex items-center border-b border-border/50 px-3 shrink-0 bg-card/30 backdrop-blur-sm sticky top-0 z-30">
              <SidebarTrigger className="mr-3" />

              <div className="flex items-center gap-2 mr-auto">
                <img src={axionLogo} alt="AxionOS" className="h-4 w-4 opacity-40" />
                {!compactTopBar && (
                  <span className="text-[11px] text-muted-foreground/60 font-mono hidden md:inline tracking-wide">
                    Autonomous Intelligent Infrastructure
                  </span>
                )}
              </div>

              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Search className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative">
                  <Bell className="h-3.5 w-3.5" />
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                </Button>
              </div>
            </header>

            {/* ── Main Content Area ── */}
            <main className="flex-1 overflow-auto p-4 md:p-6">
              {children}
            </main>
          </div>

          {/* ── Optional Right Context Panel ── */}
          <ContextPanel />
        </div>
      </div>
    </SidebarProvider>
  );
}

// Re-export as AppLayout for backward compatibility
export { AppShell as AppLayout };
