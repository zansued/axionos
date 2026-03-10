import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ContextPanel } from "@/components/ContextPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Bell } from "lucide-react";
import axionLogo from "@/assets/axion-logo.svg";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex min-w-0">
          <div className="flex-1 flex flex-col min-w-0">
            {/* ── Top Bar ── */}
            <header className="h-11 flex items-center border-b border-border/50 px-3 shrink-0 bg-card/30 backdrop-blur-sm">
              <SidebarTrigger className="mr-3" />

              <div className="flex items-center gap-2 mr-auto">
                <img src={axionLogo} alt="AxionOS" className="h-4 w-4 opacity-50" />
                <span className="text-[11px] text-muted-foreground font-mono hidden sm:inline">
                  Autonomous Intelligent Infrastructure
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <Search className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground relative">
                  <Bell className="h-3.5 w-3.5" />
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                </Button>
              </div>
            </header>

            {/* ── Main Content ── */}
            <main className="flex-1 overflow-auto p-4 md:p-6">
              {children}
            </main>
          </div>
          <ContextPanel />
        </div>
      </div>
    </SidebarProvider>
  );
}
