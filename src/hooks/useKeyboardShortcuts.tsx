import { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useI18n } from "@/contexts/I18nContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Shortcut {
  keys: string[];
  label: string;
  category: "navigation" | "actions";
  action: () => void;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts: Shortcut[] = [
    { keys: ["g", "d"], label: "shortcuts.goToDashboard", category: "navigation", action: () => navigate("/") },
    { keys: ["g", "i"], label: "shortcuts.goToInitiatives", category: "navigation", action: () => navigate("/initiatives") },
    { keys: ["g", "k"], label: "shortcuts.goToKanban", category: "navigation", action: () => navigate("/kanban") },
    { keys: ["g", "c"], label: "shortcuts.goToCode", category: "navigation", action: () => navigate("/code") },
    { keys: ["t"], label: "shortcuts.toggleTheme", category: "actions", action: () => setTheme(theme === "dark" ? "light" : "dark") },
    { keys: ["?"], label: "shortcuts.showShortcuts", category: "actions", action: () => setShowHelp(true) },
  ];

  const handleKeySequence = useCallback(() => {
    let buffer: string[] = [];
    let timer: ReturnType<typeof setTimeout>;

    return (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      clearTimeout(timer);
      buffer.push(e.key.toLowerCase());
      timer = setTimeout(() => { buffer = []; }, 500);

      for (const shortcut of shortcuts) {
        if (shortcut.keys.length === 1 && shortcut.keys[0] === e.key) {
          shortcut.action();
          buffer = [];
          return;
        }
        if (shortcut.keys.length === 2 && buffer.length >= 2) {
          const last2 = buffer.slice(-2);
          if (last2[0] === shortcut.keys[0] && last2[1] === shortcut.keys[1]) {
            shortcut.action();
            buffer = [];
            return;
          }
        }
      }
    };
  }, [navigate, theme, setTheme]);

  useEffect(() => {
    const handler = handleKeySequence();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKeySequence]);

  return { showHelp, setShowHelp, shortcuts };
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useI18n();

  const navShortcuts = [
    { keys: ["g", "d"], label: t("shortcuts.goToDashboard") },
    { keys: ["g", "i"], label: t("shortcuts.goToInitiatives") },
    { keys: ["g", "k"], label: t("shortcuts.goToKanban") },
    { keys: ["g", "c"], label: t("shortcuts.goToCode") },
  ];
  const actionShortcuts = [
    { keys: ["t"], label: t("shortcuts.toggleTheme") },
    { keys: ["?"], label: t("shortcuts.showShortcuts") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{t("shortcuts.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">{t("shortcuts.navigation")}</h4>
            <div className="space-y-2">
              {navShortcuts.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-sm">{s.label}</span>
                  <div className="flex gap-1">
                    {s.keys.map((k) => (
                      <Badge key={k} variant="outline" className="font-mono text-xs px-2">{k}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">{t("shortcuts.actions")}</h4>
            <div className="space-y-2">
              {actionShortcuts.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-sm">{s.label}</span>
                  <div className="flex gap-1">
                    {s.keys.map((k) => (
                      <Badge key={k} variant="outline" className="font-mono text-xs px-2">{k}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
