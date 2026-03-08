import {
  Lightbulb, Users, LayoutDashboard, LogOut, Columns3, Shield, Radio, Map,
  Hammer, Package, GitBranch, Rocket, CreditCard, Code2, Settings, Search, Brain, FileText, Gauge, FlaskConical,
  Plug, FileSearch, Sparkles,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useRoleBasedExperience, RoleSurface } from "@/hooks/useRoleBasedExperience";
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

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Journey", url: "/journey", icon: Map },
  { title: "Onboarding", url: "/onboarding", icon: Rocket },
  { title: "Initiatives", url: "/initiatives", icon: Lightbulb },
  { title: "Agents", url: "/agents", icon: Users },
  { title: "Stories", url: "/stories", icon: Hammer },
  { title: "Code", url: "/code", icon: Code2 },
  { title: "Workspace", url: "/workspace", icon: GitBranch },
  { title: "Kanban", url: "/kanban", icon: Columns3 },
  { title: "Deployments", url: "/artifacts", icon: Rocket },
];

const bottomItems = [
  { title: "Adoption", url: "/adoption", icon: Search },
  { title: "Evidence", url: "/improvement-ledger", icon: FileSearch },
  { title: "Candidates", url: "/improvement-candidates", icon: Sparkles },
  { title: "Benchmarks", url: "/improvement-benchmarks", icon: FlaskConical },
  { title: "Routing", url: "/agent-routing", icon: Plug },
  { title: "Extensions", url: "/extensions", icon: Package },
  { title: "Meta-Agents", url: "/meta-agents", icon: Brain },
  { title: "Meta-Artifacts", url: "/meta-artifacts", icon: FileText },
  { title: "Calibration", url: "/calibration", icon: Gauge },
  { title: "Prompt Opt.", url: "/prompt-optimization", icon: FlaskConical },
  { title: "Audit", url: "/audit", icon: Shield },
  { title: "Observability", url: "/observability", icon: Radio },
  { title: "Connections", url: "/connections", icon: Plug },
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Settings", url: "/org", icon: Settings },
];

const ROLE_BADGE: Record<RoleSurface, { label: string; className: string }> = {
  default_user: { label: "User", className: "bg-primary/20 text-primary border-primary/30" },
  operator: { label: "Operator", className: "bg-accent/20 text-accent-foreground border-accent/30" },
  admin: { label: "Admin", className: "bg-destructive/20 text-destructive border-destructive/30" },
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const { setCommandOpen } = useWorkspace();
  const { roleSurface, isSidebarItemVisible } = useRoleBasedExperience();

  const visibleMainItems = mainItems.filter(item => isSidebarItemVisible(item.title));
  const visibleBottomItems = bottomItems.filter(item => isSidebarItemVisible(item.title));

  const renderItem = (item: typeof mainItems[0]) => (
    <SidebarMenuItem key={item.title}>
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

  const roleBadge = ROLE_BADGE[roleSurface];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        {/* Brand */}
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

        {/* Search trigger */}
        {!collapsed && (
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
        )}

        {collapsed && (
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

        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMainItems.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleBottomItems.length > 0 && (
          <>
            <Separator className="mx-3 w-auto" />

            {/* Bottom nav */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleBottomItems.map(renderItem)}
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
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${roleBadge.className}`}>
                {roleBadge.label}
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
