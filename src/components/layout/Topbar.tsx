/**
 * Topbar â€” Sticky top bar with breadcrumbs, page title, search, and notifications.
 * Derives title/description/breadcrumbs from centralized route registry.
 */

import { useLocation, Link } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Search, Bell, ChevronRight, Zap } from "lucide-react";
import { getRouteEntry, getBreadcrumbs } from "@/lib/routes";


interface TopbarProps {
  compact?: boolean;
}

export function Topbar({ compact = false }: TopbarProps) {
  const { pathname } = useLocation();
  const entry = getRouteEntry(pathname);
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="h-12 flex items-center border-b border-border/50 px-3 shrink-0 bg-card/30 backdrop-blur-sm sticky top-0 z-30">
      <SidebarTrigger className="mr-3 md:hidden" />

      <div className="flex items-center gap-2 mr-auto min-w-0">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-[11px] min-w-0" aria-label="breadcrumb">
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <span key={crumb.path} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
                  {isLast ? (
                    <span className="font-medium text-foreground truncate">{crumb.label}</span>
                  ) : (
                    <Link
                      to={crumb.path}
                      className="text-muted-foreground/60 hover:text-foreground transition-colors truncate"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
        )}

        {/* Page description */}
        {!compact && entry?.description && (
          <span className="text-[10px] text-muted-foreground/40 hidden lg:inline ml-2 font-mono tracking-wide">
            {entry.description}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mr-2 border-r border-border/50 pr-2">
        <AxionPromptDrawer />
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


