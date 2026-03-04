import { Lightbulb, Users, LayoutDashboard, LogOut, Columns3, Shield, Radio, Hammer, Building2, Package, GitBranch, Rocket, CheckSquare, CreditCard, Code2, Bell } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import { usePipeline } from "@/contexts/PipelineContext";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const pipelineItems = [
  { title: "Iniciativas", url: "/initiatives", icon: Lightbulb },
  { title: "Squads", url: "/squads", icon: Users },
  { title: "Execução", url: "/stories", icon: Hammer },
  { title: "Validação", url: "/artifacts", icon: CheckSquare },
  { title: "Código", url: "/code", icon: Code2 },
  { title: "Workspace", url: "/workspace", icon: GitBranch },
  { title: "Kanban", url: "/kanban", icon: Columns3 },
];

const governanceItems = [
  { title: "Auditoria", url: "/audit", icon: Shield },
  { title: "Observabilidade", url: "/observability", icon: Radio },
  { title: "Conexões", url: "/connections", icon: Package },
  { title: "Organização", url: "/org", icon: Building2 },
  { title: "Billing & Usage", url: "/billing", icon: CreditCard },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const { currentOrg } = useOrg();
  const { events, unreadCount, markAllRead, running } = usePipeline();

  const runningCount = Object.keys(running).length;

  const renderGroup = (label: string, items: typeof pipelineItems) => (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-3">
        {!collapsed && label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="hover:bg-sidebar-accent/50 transition-colors"
                  activeClassName="bg-sidebar-accent text-primary font-medium"
                >
                  <item.icon className="mr-2 h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        {/* Brand */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 px-3 py-4">
            <Rocket className="h-5 w-5 text-primary shrink-0" />
            {!collapsed && (
              <span className="font-display text-sm font-bold tracking-tight">
                <span className="text-gradient">Axion</span>OS
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" end className="hover:bg-sidebar-accent/50 transition-colors" activeClassName="bg-sidebar-accent text-primary font-medium">
                    <LayoutDashboard className="mr-2 h-4 w-4 shrink-0" />
                    {!collapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && <Separator className="mx-3 w-auto" />}

        {renderGroup("Pipeline", pipelineItems)}

        {!collapsed && <Separator className="mx-3 w-auto" />}

        {renderGroup("Governança", governanceItems)}
      </SidebarContent>
      <SidebarFooter className="p-2 space-y-1">
        {/* Pipeline notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground relative"
              onClick={markAllRead}
            >
              <Bell className="mr-2 h-4 w-4 shrink-0" />
              {!collapsed && "Notificações"}
              {(unreadCount > 0 || runningCount > 0) && (
                <Badge
                  variant="default"
                  className="ml-auto h-5 min-w-5 px-1 text-[10px] font-bold animate-pulse"
                >
                  {runningCount > 0 ? `⚡${runningCount}` : unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent side="right" align="end" className="w-80 p-0">
            <div className="p-3 border-b">
              <h4 className="font-semibold text-sm">Pipeline</h4>
              {runningCount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  ⚡ {runningCount} estágio(s) em execução
                </p>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 text-center">Nenhuma notificação ainda</p>
              ) : (
                events.slice(0, 15).map((ev) => (
                  <div
                    key={ev.id}
                    className={`px-3 py-2 text-xs border-b last:border-0 ${!ev.read ? "bg-accent/30" : ""}`}
                  >
                    <p className="font-medium">{ev.label}</p>
                    <p className="text-muted-foreground mt-0.5">
                      {new Date(ev.timestamp).toLocaleTimeString("pt-BR")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {!collapsed && user && (
          <p className="px-3 text-xs text-muted-foreground truncate">{user.email}</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4 shrink-0" />
          {!collapsed && "Sair"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
