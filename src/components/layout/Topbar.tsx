/**
 * Topbar — Sticky top bar with branding, search, and notifications.
 * Extracted from AppShell for modularity.
 */

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Search, Bell } from "lucide-react";
import axionLogo from "@/assets/axion-logo.svg";

interface TopbarProps {
  compact?: boolean;
}

export function Topbar({ compact = false }: TopbarProps) {
  return (
    <header className="h-11 flex items-center border-b border-border/50 px-3 shrink-0 bg-card/30 backdrop-blur-sm sticky top-0 z-30">
      <SidebarTrigger className="mr-3" />

      <div className="flex items-center gap-2 mr-auto">
        <img src={axionLogo} alt="AxionOS" className="h-4 w-4 opacity-40" />
        {!compact && (
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
  );
}
