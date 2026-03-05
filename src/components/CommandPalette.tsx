import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useI18n } from "@/contexts/I18nContext";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Lightbulb, LayoutDashboard, Users, Hammer, Code2,
  GitBranch, Columns3, Shield, Radio, Settings,
  Moon, Sun, Rocket, Package, CreditCard,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, group: "nav" },
  { label: "Initiatives", path: "/initiatives", icon: Lightbulb, group: "nav" },
  { label: "Agents", path: "/agents", icon: Users, group: "nav" },
  { label: "Stories", path: "/stories", icon: Hammer, group: "nav" },
  { label: "Code Explorer", path: "/code", icon: Code2, group: "nav" },
  { label: "Workspace", path: "/workspace", icon: GitBranch, group: "nav" },
  { label: "Kanban", path: "/kanban", icon: Columns3, group: "nav" },
  { label: "Deployments", path: "/artifacts", icon: Rocket, group: "nav" },
  { label: "Audit Logs", path: "/audit", icon: Shield, group: "gov" },
  { label: "Observability", path: "/observability", icon: Radio, group: "gov" },
  { label: "Connections", path: "/connections", icon: Package, group: "gov" },
  { label: "Billing", path: "/billing", icon: CreditCard, group: "gov" },
  { label: "Settings", path: "/org", icon: Settings, group: "gov" },
];

export function CommandPalette() {
  const { commandOpen, setCommandOpen } = useWorkspace();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [commandOpen, setCommandOpen]);

  const runCommand = (fn: () => void) => {
    setCommandOpen(false);
    fn();
  };

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {NAV_ITEMS.filter(i => i.group === "nav").map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => runCommand(() => navigate(item.path))}
              className="gap-2"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Governance">
          {NAV_ITEMS.filter(i => i.group === "gov").map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => runCommand(() => navigate(item.path))}
              className="gap-2"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))} className="gap-2">
            {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
            <span>Toggle Theme</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
