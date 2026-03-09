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
