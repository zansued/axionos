import { useWorkspace } from "@/contexts/WorkspaceContext";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

export function ContextPanel() {
  const { contextPanel, closeContextPanel } = useWorkspace();

  return (
    <AnimatePresence>
      {contextPanel.open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 380, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="border-l border-border bg-card overflow-hidden shrink-0"
        >
          <div className="flex items-center justify-between h-12 px-4 border-b border-border">
            <h3 className="text-sm font-medium truncate">{contextPanel.title}</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={closeContextPanel}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-3rem)]">
            <div className="p-4">
              {contextPanel.content}
            </div>
          </ScrollArea>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
