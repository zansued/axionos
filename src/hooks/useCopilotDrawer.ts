/**
 * useCopilotDrawer — State hook for the Contextual Copilot Drawer
 *
 * Manages open/close state and integrates with usePageGuidance
 * for role-aware content resolution.
 */

import { useState, useCallback } from "react";
import { usePageGuidance } from "@/hooks/usePageGuidance";
import { useRoleBasedExperience } from "@/hooks/useRoleBasedExperience";

export function useCopilotDrawer(pageKey: string) {
  const [open, setOpen] = useState(false);
  const { guidance, whyNowText } = usePageGuidance(pageKey);
  const { canonicalRole } = useRoleBasedExperience();

  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);
  const toggleDrawer = useCallback(() => setOpen((o) => !o), []);

  return {
    open,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    guidance,
    whyNowText,
    canonicalRole,
    pageKey,
  };
}
