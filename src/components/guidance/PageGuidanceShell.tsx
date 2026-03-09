/**
 * PageGuidanceShell — Unified guidance integration for any page
 *
 * Renders the PageIntroCard (Phase 1) and provides a CopilotTrigger + Drawer (Phase 2).
 * Drop this into any page's header area to get full guidance integration.
 */

import { PageIntroCard } from "./PageIntroCard";
import { ContextualCopilotDrawer } from "./ContextualCopilotDrawer";
import { GovernanceMentorDrawer } from "./GovernanceMentorDrawer";
import { CopilotTrigger } from "./CopilotTrigger";
import { useCopilotDrawer } from "@/hooks/useCopilotDrawer";
import { useGovernanceMentor } from "@/hooks/useGovernanceMentor";
import type { CopilotSubmode } from "@/lib/guidance/types";

interface PageGuidanceShellProps {
  pageKey: string;
  /** Show the intro card */
  showIntroCard?: boolean;
  /** Compact mode for intro card */
  compact?: boolean;
}

export function PageGuidanceShell({ pageKey, showIntroCard = true, compact = true }: PageGuidanceShellProps) {
  const { open, openDrawer, closeDrawer, guidance, whyNowText, canonicalRole } = useCopilotDrawer(pageKey);
  const { isMentorMode, mentorContent } = useGovernanceMentor(pageKey);

  if (!guidance) return null;

  // Derive canonical submode
  const submode: CopilotSubmode = isMentorMode
    ? "governance_mentor"
    : canonicalRole === "end_user"
    ? "product_copilot"
    : "workspace_copilot";

  return (
    <>
      {showIntroCard && (
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <PageIntroCard guidance={guidance} whyNow={whyNowText} compact={compact} />
          </div>
          <div className="pt-1">
            <CopilotTrigger onClick={openDrawer} compact />
          </div>
        </div>
      )}
      {isMentorMode && mentorContent ? (
        <GovernanceMentorDrawer
          content={mentorContent}
          open={open}
          onClose={closeDrawer}
        />
      ) : (
        <ContextualCopilotDrawer
          pageKey={pageKey}
          guidance={guidance}
          canonicalRole={canonicalRole}
          open={open}
          onClose={closeDrawer}
        />
      )}
    </>
  );
}
