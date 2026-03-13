// AppSidebar – framer-motion sidebar with click-to-toggle, mode switcher, and role-aware nav.
// Owner Mode renders collapsible domain groups; Builder Mode renders flat nav.

import { useState, useMemo } from "react";
import axionLogo from "@/assets/axion-logo.svg";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, ChevronLeft, ChevronDown, ChevronRight, Settings } from "lucide-react";
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
  getGroupedSidebarRoutes,
  OWNER_DOMAIN_GROUPS,
  type OwnerDomainGroup,
} from "@/lib/routes";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

// ─── Domain group lookup ─────────────────────────────────────────────────────

const domainGroupMap = new Map<string, OwnerDomainGroup>();
OWNER_DOMAIN_GROUPS.forEach((g) => domainGroupMap.set(g.id, g));

// ─── OwnerDomainSection ──────────────────────────────────────────────────────

function OwnerDomainSection({
  group,
  items,
  collapsed,
  surfaceColor,
  currentPath,
}: {
  group: OwnerDomainGroup;
  items: NavItem[];
  collapsed: boolean;
  surfaceColor: string;
  currentPath: string;
}) {
  const hasActiveRoute = items.some((item) => currentPath === item.url || currentPath.startsWith(item.url + "/"));
  const [isOpen, setIsOpen] = useState(hasActiveRoute);

  // Auto-expand when navigating into a group
  useMemo(() => {
    if (hasActiveRoute && !isOpen) setIsOpen(true);
  }, [hasActiveRoute]);

  if (collapsed) {
    // In collapsed mode, show only child route icons — no parent group icon
    return (
      <div className="mb-1">
        <SidebarMenu className="space-y-0.5">
          {items.map((item) => (
            <NavItemRow key={item.url} item={item} collapsed={collapsed} surfaceColor={surfaceColor} />
          ))}
        </SidebarMenu>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-1">
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md hover:bg-sidebar-accent/30 transition-colors group cursor-pointer">
        <group.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70 group-hover:text-muted-foreground transition-colors" />
        <div className="flex-1 text-left min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 group-hover:text-muted-foreground transition-colors truncate">
            {group.label}
          </p>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
        </motion.div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          className="ml-1 mt-0.5 border-l border-sidebar-border/30 pl-1.5"
        >
          {/* Domain subtitle */}
          <p className="text-[10px] text-muted-foreground/40 px-2 py-0.5 mb-0.5 truncate">
            {group.subtitle}
          </p>
          <SidebarMenu className="space-y-0.5">
            {items.map((item) => (
              <NavItemRow key={item.url} item={item} collapsed={collapsed} surfaceColor={surfaceColor} />
            ))}
          </SidebarMenu>
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── AppSidebar ──────────────────────────────────────────────────────────────

export function AppSidebar() {
  const { open, setOpen } = useSidebar();
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

  // Get grouped routes for owner mode
  const ownerGroups = useMemo(() => {
    if (activeSurface !== "owner") return [];
    return getGroupedSidebarRoutes("owner");
  }, [activeSurface]);

  const surfaceMeta = getSurfaceMetadata(activeSurface);
  const roleBadgeLabel = CANONICAL_ROLE_LABELS[canonicalRole];
  const roleBadgeClass = CANONICAL_ROLE_BADGE_STYLES[canonicalRole];

  const handleSurfaceChange = (surface: SurfaceId) => {
    setActiveSurface(surface);
    const targetNav = surface === "owner" ? navGroups.owner : navGroups.builder;
    if (targetNav?.length > 0) {
      navigate(targetNav[0].url);
    } else {
      navigate(surface === "owner" ? "/owner/system-health" : "/builder/dashboard");
    }
  };

  const isOwnerMode = activeSurface === "owner";

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar className="border-r border-sidebar-border">
        <SidebarContent className="justify-between">
          {/* ── Top: brand + switcher + nav ── */}
          <div className="flex flex-col gap-0 overflow-y-auto">
            {/* ── Brand + Toggle ── */}
            <SidebarGroup className="pb-0">
              <SidebarGroupContent>
                <div className="flex items-center justify-between px-2 py-3 overflow-hidden">
                  <button
                    onClick={() => setOpen(!open)}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                  >
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
                  </button>
                  <motion.div
                    animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "auto" }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <button
                      onClick={() => setOpen(false)}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
                      aria-label="Collapse sidebar"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </motion.div>
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
              <motion.div
                animate={{ opacity: collapsed ? 0 : 1, height: collapsed ? 0 : "auto" }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mb-1.5 px-2"
              >
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50 whitespace-nowrap">
                  {surfaceMeta.label}
                </p>
              </motion.div>
              <SidebarGroupContent>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSurface}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    {isOwnerMode ? (
                      // ── Owner Mode: Cognitive Architecture as direct link, rest as collapsible domain groups ──
                      <div className="space-y-0.5">
                      {ownerGroups.map(({ group, items }) => {
                          const domainGroup = domainGroupMap.get(group);
                          const navItems = items.map((r) => ({
                            title: r.title,
                            url: r.path,
                            icon: r.icon,
                          }));

                          // Cognitive Architecture: render as direct top-level link
                          if (group === "Cognitive Architecture") {
                            return (
                              <SidebarMenu key={group} className="space-y-0.5 mb-1">
                                {navItems.map((item) => (
                                  <NavItemRow
                                    key={item.url}
                                    item={item}
                                    collapsed={collapsed}
                                    surfaceColor={surfaceMeta.colorVar}
                                  />
                                ))}
                              </SidebarMenu>
                            );
                          }

                          // Other domain groups render as collapsible sections
                          if (domainGroup) {
                            return (
                              <OwnerDomainSection
                                key={group}
                                group={domainGroup}
                                items={navItems}
                                collapsed={collapsed}
                                surfaceColor={surfaceMeta.colorVar}
                                currentPath={location.pathname}
                              />
                            );
                          }

                          // Settings or ungrouped items — render flat
                          return (
                            <SidebarMenu key={group} className="space-y-0.5 mt-1">
                              {navItems.map((item) => (
                                <NavItemRow
                                  key={item.url}
                                  item={item}
                                  collapsed={collapsed}
                                  surfaceColor={surfaceMeta.colorVar}
                                />
                              ))}
                            </SidebarMenu>
                          );
                        })}
                      </div>
                    ) : (
                      // ── Builder Mode: Flat nav ──
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
                    )}
                  </motion.div>
                </AnimatePresence>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>

          {/* ── Footer ── */}
          <div className="p-2 border-t border-sidebar-border/50">
            <motion.div
              animate={{ opacity: collapsed ? 0 : 1, height: collapsed ? 0 : "auto" }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {user && (
                <div className="mb-1 space-y-0.5 px-2">
                  <div className="flex items-center gap-2">
                    <p className="flex-1 truncate text-[11px] text-muted-foreground whitespace-nowrap">
                      {user.email}
                    </p>
                    <Badge
                      variant="outline"
                      className={`px-1.5 py-0 text-[9px] shrink-0 ${roleBadgeClass}`}
                    >
                      {roleBadgeLabel}
                    </Badge>
                  </div>
                </div>
              )}
            </motion.div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4 shrink-0" />
              <motion.span
                animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "auto" }}
                transition={{ duration: 0.2 }}
                className="text-sm whitespace-nowrap overflow-hidden"
              >
                Sign Out
              </motion.span>
            </Button>
          </div>
        </SidebarContent>
      </Sidebar>
    </TooltipProvider>
  );
}
