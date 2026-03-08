import {
  Lightbulb, Users, LayoutDashboard, LogOut, Columns3, Shield, Radio, Map,
  Hammer, Package, GitBranch, Rocket, CreditCard, Code2, Settings, Search, Brain, FileText, Gauge, FlaskConical,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
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
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Initiatives", url: "/initiatives", icon: Lightbulb },
  { title: "Agents", url: "/agents", icon: Users },
  { title: "Stories", url: "/stories", icon: Hammer },
  { title: "Code", url: "/code", icon: Code2 },
  { title: "Workspace", url: "/workspace", icon: GitBranch },
  { title: "Kanban", url: "/kanban", icon: Columns3 },
  { title: "Deployments", url: "/artifacts", icon: Rocket },
];

const bottomItems = [
  { title: "Meta-Agents", url: "/meta-agents", icon: Brain },
  { title: "Meta-Artifacts", url: "/meta-artifacts", icon: FileText },
  { title: "Calibration", url: "/calibration", icon: Gauge },
  { title: "Prompt Opt.", url: "/prompt-optimization", icon: FlaskConical },
  { title: "Audit", url: "/audit", icon: Shield },
  { title: "Observability", url: "/observability", icon: Radio },
  { title: "Connections", url: "/connections", icon: Package },
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Settings", url: "/org", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const { setCommandOpen } = useWorkspace();

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
              {mainItems.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="mx-3 w-auto" />

        {/* Bottom nav */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        {!collapsed && user && (
          <div className="px-3 py-1">
            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
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
