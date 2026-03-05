import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start text-muted-foreground"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <Sun className="mr-2 h-4 w-4 shrink-0" />
      ) : (
        <Moon className="mr-2 h-4 w-4 shrink-0" />
      )}
      {!collapsed && (theme === "dark" ? "Modo Claro" : "Modo Escuro")}
    </Button>
  );
}
