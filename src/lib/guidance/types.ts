/**
 * Contextual Guidance & Copilot Layer — Types
 *
 * Canonical contract for page-level guidance in AxionOS.
 * Each major area provides a PageGuidanceContract that answers:
 *   - What this area is
 *   - Who it's for
 *   - What actions are available
 *   - When it's worth using now / when it can be ignored
 *   - What usually comes next
 *   - Whether human approval is required
 *
 * Canon constraints preserved:
 *   - advisory-first
 *   - governance before autonomy
 *   - rollback everywhere
 *   - bounded adaptation
 *   - human approval for structural change
 *   - tenant isolation
 *   - no autonomous architecture mutation
 */

export type GuidanceSurface = "product" | "workspace" | "platform";

export type ApprovalPosture = "none" | "optional" | "recommended" | "required";

export interface PageGuidanceContract {
  /** Machine key for the area */
  key: string;
  /** Human-readable area title */
  title: { pt: string; en: string };
  /** One-sentence explanation of what this area is */
  description: { pt: string; en: string };
  /** Who this area is for */
  audience: { pt: string; en: string };
  /** Which surface this belongs to */
  surface: GuidanceSurface;
  /** Key actions available in this area */
  actions: { pt: string; en: string }[];
  /** When this area is worth using now */
  whenRelevant: { pt: string; en: string };
  /** When this area can be safely ignored */
  whenIgnorable: { pt: string; en: string };
  /** What usually comes next after this area */
  nextStep: { pt: string; en: string };
  /** Whether human approval is required for actions here */
  approvalPosture: ApprovalPosture;
  /** Optional risk/approval hint text */
  approvalHint?: { pt: string; en: string };
  /** Optional "why this matters now" dynamic hint key */
  whyNowKey?: string;
}

export interface GuidanceTooltipData {
  label: { pt: string; en: string };
  description: { pt: string; en: string };
}

// ─── Copilot Drawer Types ──────────────────────────────────────────────────

export interface CopilotSuggestedAction {
  label: { pt: string; en: string };
  /** Route to navigate to, or undefined for non-navigating actions */
  route?: string;
  /** Icon name from lucide (resolved at render time) */
  icon?: string;
}

export interface CopilotDrawerContent {
  /** Page key — must match PageGuidanceContract.key */
  key: string;
  /** Role-specific overrides (falls back to base guidance if absent) */
  roleOverrides?: Partial<Record<string, Partial<CopilotRoleContent>>>;
  /** Default drawer content (used when no role override matches) */
  default: CopilotRoleContent;
}

export interface CopilotRoleContent {
  /** Expanded summary (richer than PageGuidanceContract.description) */
  summary?: { pt: string; en: string };
  /** Contextual "why now" explanation */
  whyNow?: { pt: string; en: string };
  /** Primary recommended next action */
  nextAction: { pt: string; en: string };
  /** Optional secondary action */
  secondaryAction?: { pt: string; en: string };
  /** Reason for the recommendation */
  nextActionReason?: { pt: string; en: string };
  /** Risk/approval explanation */
  approvalExplanation?: { pt: string; en: string };
  /** What user can safely ignore for now */
  ignoreForNow?: { pt: string; en: string };
  /** Suggested action shortcuts */
  suggestedActions?: CopilotSuggestedAction[];
}
