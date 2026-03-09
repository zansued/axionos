// AppSidebar – surface-aware navigation with animated SurfaceSwitcher.

import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, Search, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useRoleBasedExperience } from "@/hooks/useRoleBasedExperience";
import {
  SurfaceSwitcher,
  getSurfaceForRoute,
  getSurfaceMetadata,
  type SurfaceId,
} from "@/components/SurfaceSwitcher";
import {
  CANONICAL_ROLE_LABELS,
  CANONICAL_ROLE_BADGE_STYLES,
  type NavItem,
} from "@/lib/permissions";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── NavItemRow ──────────────────────────────────────────────────────────────

function NavItemRow({
  item,
  collapsed,
  surfaceColor,
}: {
  item: NavItem;
  collapsed: boolean;
  surfaceColor: string;
}) {
  return (
    <SidebarMenuItem>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuButton asChild>
            <NavLink
              to={item.url}
              end={item.url === "/"}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              style={
                {
                  "--surface-active": `hsl(var(${surfaceColor}) / 0.15)`,
                } as React.CSSProperties
              }
            >
              <item.icon className="h-4 w-4 shrink-0 opacity-70" />
              {!collapsed && (
                <span className="text-[13px]">{item.title}</span>
              )}
            </NavLink>
          </SidebarMenuButton>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right" className="text-xs">
            {item.title}
          </TooltipContent>
        )}
      </Tooltip>
    </SidebarMenuItem>
  );
}

// ─── AppSidebar ──────────────────────────────────────────────────────────────

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const { setCommandOpen } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const { canonicalRole, navGroups } = useRoleBasedExperience();

  // Derive active surface from current route
  const routeSurface = useMemo(
    () => getSurfaceForRoute(location.pathname, navGroups),
    [location.pathname, navGroups]
  );
  const [activeSurface, setActiveSurface] = useState<SurfaceId>(routeSurface);

  // Sync surface when route changes
  useMemo(() => {
    setActiveSurface(routeSurface);
  }, [routeSurface]);

  // Get nav items for active surface
  const activeNavItems = useMemo(() => {
    switch (activeSurface) {
      case "platform":
        return navGroups.platform;
      case "workspace":
        return navGroups.workspace;
      default:
        return navGroups.product;
    }
  }, [activeSurface, navGroups]);

  const surfaceMeta = getSurfaceMetadata(activeSurface);
  const roleBadgeLabel = CANONICAL_ROLE_LABELS[canonicalRole];
  const roleBadgeClass = CANONICAL_ROLE_BADGE_STYLES[canonicalRole];

  const handleSurfaceChange = (surface: SurfaceId) => {
    setActiveSurface(surface);
    // Navigate to first route of new surface
    const targetNav =
      surface === "platform"
        ? navGroups.platform
        : surface === "workspace"
        ? navGroups.workspace
        : navGroups.product;
    if (targetNav.length > 0) {
      navigate(targetNav[0].url);
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="gap-0">
        {/* ── Brand ── */}
        <SidebarGroup className="pb-0">
          <SidebarGroupContent>
            <div className="flex items-center gap-2 px-2 py-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
                <span className="text-xs font-bold text-primary-foreground">
                  Ax
                </span>
              </div>
              {!collapsed && (
                <span className="font-display text-sm font-semibold tracking-tight">
                  Axion<span className="font-normal text-muted-foreground">OS</span>
                </span>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Surface Switcher ── */}
        <SidebarGroup className="px-2 pb-2 pt-0">
          <SidebarGroupContent>
            <SurfaceSwitcher
              role={canonicalRole}
              activeSurface={activeSurface}
              onSurfaceChange={handleSurfaceChange}
              collapsed={collapsed}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Search ── */}
        {!collapsed ? (
          <SidebarGroup className="px-2 pb-2 pt-0">
            <SidebarGroupContent>
              <button
                onClick={() => setCommandOpen(true)}
                className="flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/30 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent/50"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search...</span>
                <kbd className="ml-auto rounded bg-sidebar-accent px-1.5 py-0.5 font-mono text-[10px]">
                  ⌘K
                </kbd>
              </button>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <SidebarGroup className="px-2 pb-2 pt-0">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        onClick={() => setCommandOpen(true)}
                        className="justify-center"
                      >
                        <Search className="h-4 w-4" />
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      Search ⌘K
                    </TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <Separator className="mx-2 w-auto" />

        {/* ── Navigation ── */}
        <SidebarGroup className="flex-1 px-2 pt-2">
          {!collapsed && (
            <div className="mb-1.5 px-2">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
                {surfaceMeta.label}
              </p>
            </div>
          )}
          <SidebarGroupContent>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSurface}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                <SidebarMenu className="space-y-0.5">
                  {activeNavItems.map((item) => (
                    <NavItemRow
                      key={item.url}
                      item={item}
                      collapsed={collapsed}
                      surfaceColor={surfaceMeta.colorVar}
                    />
                  ))}

                  {/* AutoPilot CTA – only on Product surface */}
                  {activeSurface === "product" && (
                    <SidebarMenuItem className="pt-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <button
                              onClick={() => navigate("/journey")}
                              className="flex w-full items-center gap-2.5 rounded-md border border-surface-product/30 bg-surface-product/10 px-2.5 py-2 text-surface-product transition-colors hover:bg-surface-product/20"
                            >
                              <Zap className="h-4 w-4 shrink-0" />
                              {!collapsed && (
                                <span className="text-[13px] font-medium">
                                  AutoPilot
                                </span>
                              )}
                            </button>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        {collapsed && (
                          <TooltipContent side="right" className="text-xs">
                            AutoPilot
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </motion.div>
            </AnimatePresence>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="p-2">
        {!collapsed && user && (
          <div className="mb-1 space-y-0.5 px-2">
            <div className="flex items-center gap-2">
              <p className="flex-1 truncate text-[11px] text-muted-foreground">
                {user.email}
              </p>
              <Badge
                variant="outline"
                className={`px-1.5 py-0 text-[9px] ${roleBadgeClass}`}
              >
                {roleBadgeLabel}
              </Badge>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
