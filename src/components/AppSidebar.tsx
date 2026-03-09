import { useNavigate } from "react-router-dom";
import { LogOut, Search, Rocket, Zap } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useRoleBasedExperience } from "@/hooks/useRoleBasedExperience";
import {
  CANONICAL_ROLE_LABELS,
  CANONICAL_ROLE_BADGE_STYLES,
  NavItem,
} from "@/lib/permissions";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Single nav row ──────────────────────────────────────────────────────────

function NavItemRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <SidebarMenuItem>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuButton asChild>
            <NavLink
              to={item.url}
              end={item.url === "/"}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="text-sm">{item.title}</span>}
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

// ─── Section group label ─────────────────────────────────────────────────────

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <SidebarGroupLabel className="text-[10px] font-semibold tracking-widest text-muted-foreground/50 uppercase px-3 pb-1 pt-0">
      {label}
    </SidebarGroupLabel>
  );
}

// ─── AppSidebar ──────────────────────────────────────────────────────────────

export function AppSidebar() {
  const { state }          = useSidebar();
  const collapsed          = state === "collapsed";
  const { signOut, user }  = useAuth();
  const { setCommandOpen } = useWorkspace();
  const navigate           = useNavigate();
  const { canonicalRole, navGroups } = useRoleBasedExperience();

  const roleBadgeLabel = CANONICAL_ROLE_LABELS[canonicalRole];
  const roleBadgeClass = CANONICAL_ROLE_BADGE_STYLES[canonicalRole];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>

        {/* ── Brand ── */}
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="flex items-center gap-2 px-3 py-3">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Rocket className="h-4 w-4 text-primary-foreground" />
              </div>
              {!collapsed && (
                <span className="font-display text-sm font-bold tracking-tight">
                  Axion<span className="text-muted-foreground font-normal">OS</span>
                </span>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Search trigger ── */}
        {!collapsed ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <button
                onClick={() => setCommandOpen(true)}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-muted-foreground rounded-md border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Search...</span>
                <kbd className="ml-auto text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
              </button>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton onClick={() => setCommandOpen(true)}>
                        <Search className="h-4 w-4 mx-auto" />
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">Search ⌘K</TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <Separator className="mx-3 w-auto" />

        {/* ── PRODUCT ── */}
        <SidebarGroup>
          <SectionLabel label="Product" collapsed={collapsed} />
          <SidebarGroupContent>
            <SidebarMenu>
              {navGroups.product.map((item) => (
                <NavItemRow key={item.url} item={item} collapsed={collapsed} />
              ))}

              {/* AutoPilot CTA */}
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton asChild>
                      <button
                        onClick={() => navigate("/journey")}
                        className="flex items-center gap-3 px-3 py-2 w-full rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors mt-1"
                      >
                        <Zap className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="text-sm font-medium">AutoPilot</span>}
                      </button>
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" className="text-xs">AutoPilot</TooltipContent>
                  )}
                </Tooltip>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── WORKSPACE ── */}
        {navGroups.workspace.length > 0 && (
          <>
            <Separator className="mx-3 w-auto" />
            <SidebarGroup>
              <SectionLabel label="Workspace" collapsed={collapsed} />
              <SidebarGroupContent>
                <SidebarMenu>
                  {navGroups.workspace.map((item) => (
                    <NavItemRow key={item.url} item={item} collapsed={collapsed} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* ── PLATFORM ── */}
        {navGroups.platform.length > 0 && (
          <>
            <Separator className="mx-3 w-auto" />
            <SidebarGroup>
              <SectionLabel label="Platform" collapsed={collapsed} />
              <SidebarGroupContent>
                <SidebarMenu>
                  {navGroups.platform.map((item) => (
                    <NavItemRow key={item.url} item={item} collapsed={collapsed} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

      </SidebarContent>

      <SidebarFooter className="p-2">
        {!collapsed && user && (
          <div className="px-3 py-1 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-muted-foreground truncate flex-1">{user.email}</p>
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${roleBadgeClass}`}>
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
