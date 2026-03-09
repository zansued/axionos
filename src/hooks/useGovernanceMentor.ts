/**
 * useGovernanceMentor — Determines if Governance Mentor Mode should activate.
 *
 * Activates when:
 *   - canonicalRole is platform_admin or platform_reviewer
 *   - current page has governance mentor content
 */

import { useMemo } from "react";
import { useRoleBasedExperience } from "@/hooks/useRoleBasedExperience";
import { getGovernanceMentorContent } from "@/lib/guidance/governance-mentor-content";
import type { GovernanceMentorContent } from "@/lib/guidance/governance-mentor-types";

const MENTOR_ROLES = new Set(["platform_admin", "platform_reviewer"]);

export function useGovernanceMentor(pageKey: string) {
  const { canonicalRole } = useRoleBasedExperience();

  const content = useMemo((): GovernanceMentorContent | undefined => {
    if (!MENTOR_ROLES.has(canonicalRole)) return undefined;
    return getGovernanceMentorContent(pageKey);
  }, [canonicalRole, pageKey]);

  return {
    isMentorMode: !!content,
    mentorContent: content,
    canonicalRole,
  };
}
