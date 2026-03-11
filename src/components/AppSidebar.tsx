// AppSidebar – framer-motion sidebar with hover-to-expand, mode switcher, and role-aware nav.

import { useState, useMemo } from "react";
import axionLogo from "@/assets/axion-logo.svg";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
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
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipProvider,
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
          <NavLink
            to={item.url}
            end={item.url === "/"}
            className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground overflow-hidden"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            style={
              {
                "--surface-active": `hsl(var(${surfaceColor}) / 0.15)`,
              } as React.CSSProperties
            }
          >
            <item.icon className="h-4 w-4 shrink-0 opacity-70" />
            <motion.span
              animate={{
                opacity: collapsed ? 0 : 1,
                width: collapsed ? 0 : "auto",
              }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="text-[13px] whitespace-nowrap overflow-hidden"
            >
              {item.title}
            </motion.span>
          </NavLink>
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
  const { open } = useSidebar();
  const collapsed = !open;
  const { signOut, user } = useAuth();
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
      case "owner":
        return navGroups.owner;
      default:
        return navGroups.builder;
    }
  }, [activeSurface, navGroups]);

  const surfaceMeta = getSurfaceMetadata(activeSurface);
  const roleBadgeLabel = CANONICAL_ROLE_LABELS[canonicalRole];
  const roleBadgeClass = CANONICAL_ROLE_BADGE_STYLES[canonicalRole];

  const handleSurfaceChange = (surface: SurfaceId) => {
    setActiveSurface(surface);
    const targetNav = surface === "owner" ? navGroups.owner : navGroups.builder;
    if (targetNav?.length > 0) {
      navigate(targetNav[0].url);
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar className="border-r border-sidebar-border">
        <SidebarContent className="justify-between">
          {/* ── Top: brand + switcher + nav ── */}
          <div className="flex flex-col gap-0">
            {/* ── Brand ── */}
            <SidebarGroup className="pb-0">
              <SidebarGroupContent>
                <div className="flex items-center gap-2 px-2 py-3 overflow-hidden">
                  <img src={axionLogo} alt="AxionOS" className="h-7 w-7 shrink-0" />
                  <motion.span
                    animate={{
                      opacity: collapsed ? 0 : 1,
                      width: collapsed ? 0 : "auto",
                    }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="font-display text-sm font-semibold tracking-tight whitespace-nowrap overflow-hidden"
                  >
                    Axion<span className="font-normal text-muted-foreground">OS</span>
                  </motion.span>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* ── Mode Switcher ── */}
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

            <Separator className="mx-2 w-auto mb-2" />

            {/* ── Navigation ── */}
            <SidebarGroup className="px-2 pt-0">
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
                      {activeNavItems?.map((item) => (
                        <NavItemRow
                          key={item.url}
                          item={item}
                          collapsed={collapsed}
                          surfaceColor={surfaceMeta.colorVar}
                        />
                      ))}
                    </SidebarMenu>
                  </motion.div>
                </AnimatePresence>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>

          {/* ── Footer ── */}
          <div className="p-2 border-t border-sidebar-border/50">
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
          </div>
        </SidebarContent>
      </Sidebar>
    </TooltipProvider>
  );
}
