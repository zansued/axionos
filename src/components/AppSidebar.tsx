import { Lightbulb, Users, BookOpen, LayoutDashboard, LogOut, Columns3, Shield, Radio, Hammer, Building2, Package, GitBranch, Rocket, CheckSquare, CreditCard } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
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

const pipelineItems = [
  { title: "Iniciativas", url: "/initiatives", icon: Lightbulb },
  { title: "Squads", url: "/squads", icon: Users },
  { title: "Planejamento", url: "/planning", icon: BookOpen },
  { title: "Execução", url: "/stories", icon: Hammer },
  { title: "Validação", url: "/artifacts", icon: CheckSquare },
  { title: "Kanban", url: "/kanban", icon: Columns3 },
  { title: "Repositórios", url: "/workspace", icon: GitBranch },
];

const governanceItems = [
  { title: "Auditoria", url: "/audit", icon: Shield },
  { title: "Observabilidade", url: "/observability", icon: Radio },
  { title: "Organização", url: "/org", icon: Building2 },
  { title: "Billing & Usage", url: "/billing", icon: CreditCard },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { currentOrg } = useOrg();

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
