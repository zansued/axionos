import { useKeyboardShortcuts, KeyboardShortcutsDialog } from "@/hooks/useKeyboardShortcuts";

export function KeyboardShortcutsManager() {
  const { showHelp, setShowHelp } = useKeyboardShortcuts();
  return <KeyboardShortcutsDialog open={showHelp} onOpenChange={setShowHelp} />;
}
