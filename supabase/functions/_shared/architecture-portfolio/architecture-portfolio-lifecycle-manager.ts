/**
 * Architecture Portfolio Lifecycle Manager — Sprint 43
 */

export type PortfolioLifecycle = "draft" | "active" | "watch" | "constrained" | "deprecated" | "archived";
export type MemberLifecycle = "candidate" | "active" | "paused" | "conflicting" | "deprecated" | "archived";

const PORTFOLIO_TRANSITIONS: Record<PortfolioLifecycle, PortfolioLifecycle[]> = {
  draft: ["active"],
  active: ["watch", "constrained", "deprecated"],
  watch: ["active", "constrained", "deprecated"],
  constrained: ["active", "watch", "deprecated"],
  deprecated: ["archived"],
  archived: [],
};

const MEMBER_TRANSITIONS: Record<MemberLifecycle, MemberLifecycle[]> = {
  candidate: ["active", "deprecated"],
  active: ["paused", "conflicting", "deprecated"],
  paused: ["active", "conflicting", "deprecated"],
  conflicting: ["active", "paused", "deprecated"],
  deprecated: ["archived"],
  archived: [],
};

export function canTransitionPortfolio(current: PortfolioLifecycle, target: PortfolioLifecycle): boolean {
  return (PORTFOLIO_TRANSITIONS[current] || []).includes(target);
}

export function canTransitionMember(current: MemberLifecycle, target: MemberLifecycle): boolean {
  return (MEMBER_TRANSITIONS[current] || []).includes(target);
}

export function getValidPortfolioTransitions(current: PortfolioLifecycle): PortfolioLifecycle[] {
  return PORTFOLIO_TRANSITIONS[current] || [];
}

export function getValidMemberTransitions(current: MemberLifecycle): MemberLifecycle[] {
  return MEMBER_TRANSITIONS[current] || [];
}
