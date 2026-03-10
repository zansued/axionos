import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useTheme } from "next-themes";
import { useRoleBasedExperience } from "@/hooks/useRoleBasedExperience";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Moon, Sun } from "lucide-react";

export function CommandPalette() {
  const { commandOpen, setCommandOpen } = useWorkspace();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { navGroups } = useRoleBasedExperience();

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

        {/* Builder */}
        <CommandGroup heading="Builder">
          {navGroups.builder.map((item) => (
            <CommandItem
              key={item.url}
              onSelect={() => runCommand(() => navigate(item.url))}
              className="gap-2"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Owner */}
        {navGroups.owner.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Owner">
              {navGroups.owner.map((item) => (
                <CommandItem
                  key={item.url}
                  onSelect={() => runCommand(() => navigate(item.url))}
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))}
            className="gap-2"
          >
            {theme === "dark"
              ? <Sun className="h-4 w-4 text-muted-foreground" />
              : <Moon className="h-4 w-4 text-muted-foreground" />}
            <span>Toggle Theme</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
