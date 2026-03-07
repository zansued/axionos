/**
 * Meta-Agent Recommendation Validation & Quality Control — Sprint 13 Hardening
 *
 * Provides:
 * - Signature normalization for deduplication integrity
 * - Minimum quality thresholds to suppress noisy recommendations
 * - Evidence integrity validation
 * - Recommendation quality gate
 *
 * All heuristics are explicit, configurable, and documented.
 */

import { MetaRecommendation } from "./types.ts";

// --- Configurable Quality Thresholds ---

/** Minimum confidence_score to persist a recommendation */
export const MIN_CONFIDENCE_THRESHOLD = 0.15;

/** Minimum impact_score to persist a recommendation */
export const MIN_IMPACT_THRESHOLD = 0.10;

/** Minimum number of evidence items required */
export const MIN_EVIDENCE_COUNT = 1;

/** Architecture-level recommendations require higher confidence */
export const ARCHITECTURE_MIN_CONFIDENCE = 0.25;

// --- Signature Normalization ---

/**
 * Normalize a recommendation signature to prevent format/casing/whitespace collisions.
 *
 * Rules:
 * - lowercase all segments
 * - trim whitespace
 * - collapse multiple spaces/underscores
 * - remove non-alphanumeric chars except :: and _
 */
export function normalizeSignature(signature: string): string {
  return signature
    .toLowerCase()
    .trim()
    .split("::")
    .map((s) => s.trim().replace(/\s+/g, "_").replace(/_+/g, "_").replace(/[^a-z0-9_]/g, "").replace(/^_|_$/g, ""))
    .join("::");
}

// --- Evidence Integrity ---

/**
 * Validate that a recommendation has real, traceable evidence.
 * Returns { valid: boolean, reason?: string }
 */
export function validateEvidence(
  rec: MetaRecommendation
): { valid: boolean; reason?: string } {
  if (!rec.supporting_evidence || !Array.isArray(rec.supporting_evidence)) {
    return { valid: false, reason: "supporting_evidence is missing or not an array" };
  }
  if (rec.supporting_evidence.length < MIN_EVIDENCE_COUNT) {
    return { valid: false, reason: `requires at least ${MIN_EVIDENCE_COUNT} evidence items` };
  }
  // Each evidence item must have a 'type' field
  for (const item of rec.supporting_evidence) {
    if (!item || typeof item !== "object" || !("type" in item)) {
      return { valid: false, reason: "evidence item missing 'type' field" };
    }
  }
  return { valid: true };
}

// --- Quality Gate ---

/**
 * Apply quality control to a recommendation.
 * Returns { pass: boolean, reason?: string }
 */
export function qualityGate(
  rec: MetaRecommendation
): { pass: boolean; reason?: string } {
  // 1. Score bounds check
  if (rec.confidence_score < 0 || rec.confidence_score > 1) {
    return { pass: false, reason: `confidence_score out of bounds: ${rec.confidence_score}` };
  }
  if (rec.impact_score < 0 || rec.impact_score > 1) {
    return { pass: false, reason: `impact_score out of bounds: ${rec.impact_score}` };
  }
  if (rec.priority_score < 0 || rec.priority_score > 1) {
    return { pass: false, reason: `priority_score out of bounds: ${rec.priority_score}` };
  }

  // 2. Minimum confidence
  const minConf = rec.meta_agent_type === "ARCHITECTURE_META_AGENT"
    ? ARCHITECTURE_MIN_CONFIDENCE
    : MIN_CONFIDENCE_THRESHOLD;
  if (rec.confidence_score < minConf) {
    return { pass: false, reason: `confidence ${rec.confidence_score} below threshold ${minConf}` };
  }

  // 3. Minimum impact
  if (rec.impact_score < MIN_IMPACT_THRESHOLD) {
    return { pass: false, reason: `impact ${rec.impact_score} below threshold ${MIN_IMPACT_THRESHOLD}` };
  }

  // 4. Evidence integrity
  const evidenceCheck = validateEvidence(rec);
  if (!evidenceCheck.valid) {
    return { pass: false, reason: evidenceCheck.reason };
  }

  // 5. Title and description must be non-empty
  if (!rec.title || rec.title.trim().length === 0) {
    return { pass: false, reason: "title is empty" };
  }
  if (!rec.description || rec.description.trim().length === 0) {
    return { pass: false, reason: "description is empty" };
  }

  return { pass: true };
}

/**
 * Filter a batch of recommendations through the quality gate.
 * Returns { accepted, suppressed } with reasons.
 */
export function applyQualityGate(
  recs: MetaRecommendation[]
): { accepted: MetaRecommendation[]; suppressed: { rec: MetaRecommendation; reason: string }[] } {
  const accepted: MetaRecommendation[] = [];
  const suppressed: { rec: MetaRecommendation; reason: string }[] = [];

  for (const rec of recs) {
    const result = qualityGate(rec);
    if (result.pass) {
      accepted.push(rec);
    } else {
      suppressed.push({ rec, reason: result.reason || "unknown" });
    }
  }

  return { accepted, suppressed };
}
