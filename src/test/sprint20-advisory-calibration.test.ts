import { describe, it, expect } from "vitest";

// Import scoring functions
import {
  computeCalibrationScore,
  isUnderperforming,
  isHighValue,
  isContextOverweighted,
  isContextUnderused,
  isRedundancyTooStrict,
  isRedundancyTooWeak,
} from "../../supabase/functions/_shared/calibration/scoring";

// Import types
import {
  CALIBRATION_DOMAINS,
  CALIBRATION_SIGNAL_TYPES,
  META_AGENT_TYPES,
  ARTIFACT_TYPES,
  CALIBRATION_AUDIT_EVENTS,
  CALIBRATION_SUMMARY_TYPES,
} from "../../supabase/functions/_shared/calibration/types";

describe("Sprint 20: Advisory Calibration Layer", () => {
  // ─── Taxonomy Tests ───
  describe("Calibration Taxonomy", () => {
    it("should define all calibration domains", () => {
      expect(CALIBRATION_DOMAINS).toContain("META_AGENT_PERFORMANCE");
      expect(CALIBRATION_DOMAINS).toContain("PROPOSAL_USEFULNESS");
      expect(CALIBRATION_DOMAINS).toContain("HISTORICAL_CONTEXT_VALUE");
      expect(CALIBRATION_DOMAINS).toContain("REDUNDANCY_GUARD_EFFECTIVENESS");
      expect(CALIBRATION_DOMAINS).toContain("NOVELTY_BALANCE");
      expect(CALIBRATION_DOMAINS).toContain("DECISION_FOLLOW_THROUGH");
      expect(CALIBRATION_DOMAINS.length).toBe(6);
    });

    it("should define all signal types", () => {
      expect(CALIBRATION_SIGNAL_TYPES).toContain("UNDERPERFORMING_META_AGENT");
      expect(CALIBRATION_SIGNAL_TYPES).toContain("HIGH_VALUE_META_AGENT");
      expect(CALIBRATION_SIGNAL_TYPES).toContain("LOW_USEFULNESS_ARTIFACT_TYPE");
      expect(CALIBRATION_SIGNAL_TYPES).toContain("REDUNDANCY_GUARD_TOO_STRICT");
      expect(CALIBRATION_SIGNAL_TYPES).toContain("REDUNDANCY_GUARD_TOO_WEAK");
      expect(CALIBRATION_SIGNAL_TYPES).toContain("NOVEL_SIGNALS_UNDERSCORED");
      expect(CALIBRATION_SIGNAL_TYPES.length).toBe(14);
    });

    it("should define all meta-agent types", () => {
      expect(META_AGENT_TYPES.length).toBe(4);
    });

    it("should define all artifact types", () => {
      expect(ARTIFACT_TYPES.length).toBe(5);
    });

    it("should define all audit events", () => {
      expect(CALIBRATION_AUDIT_EVENTS.ADVISORY_CALIBRATION_SIGNAL_CREATED).toBeDefined();
      expect(CALIBRATION_AUDIT_EVENTS.ADVISORY_CALIBRATION_SUMMARY_CREATED).toBeDefined();
      expect(CALIBRATION_AUDIT_EVENTS.ADVISORY_CALIBRATION_VIEWED).toBeDefined();
      expect(CALIBRATION_AUDIT_EVENTS.ADVISORY_CALIBRATION_USED).toBeDefined();
    });

    it("should define summary types", () => {
      expect(CALIBRATION_SUMMARY_TYPES.length).toBe(5);
    });
  });

  // ─── Scoring Tests ───
  describe("Calibration Scoring", () => {
    it("should compute bounded signal strength [0,1]", () => {
      const result = computeCalibrationScore({
        sample_size: 50,
        acceptance_rate: 0.1,
        implementation_rate: 0.05,
        positive_outcome_rate: 0.1,
        avg_quality_score: 0.2,
        avg_usefulness_score: 0.2,
      });
      expect(result.signal_strength).toBeGreaterThanOrEqual(0);
      expect(result.signal_strength).toBeLessThanOrEqual(1);
    });

    it("should compute bounded confidence [0,1]", () => {
      const result = computeCalibrationScore({
        sample_size: 100,
        acceptance_rate: 0.5,
        implementation_rate: 0.5,
        positive_outcome_rate: 0.5,
        avg_quality_score: 0.5,
        avg_usefulness_score: 0.5,
      });
      expect(result.confidence_score).toBeGreaterThanOrEqual(0);
      expect(result.confidence_score).toBeLessThanOrEqual(1);
    });

    it("should compute bounded overcorrection risk [0,1]", () => {
      const result = computeCalibrationScore({
        sample_size: 3,
        acceptance_rate: 0.9,
        implementation_rate: 0.9,
        positive_outcome_rate: 0.9,
        avg_quality_score: 0.9,
        avg_usefulness_score: 0.9,
      });
      expect(result.risk_of_overcorrection).toBeGreaterThanOrEqual(0);
      expect(result.risk_of_overcorrection).toBeLessThanOrEqual(1);
    });

    it("should have higher confidence with larger sample", () => {
      const small = computeCalibrationScore({
        sample_size: 3, acceptance_rate: 0.5, implementation_rate: 0.5,
        positive_outcome_rate: 0.5, avg_quality_score: 0.5, avg_usefulness_score: 0.5,
      });
      const large = computeCalibrationScore({
        sample_size: 100, acceptance_rate: 0.5, implementation_rate: 0.5,
        positive_outcome_rate: 0.5, avg_quality_score: 0.5, avg_usefulness_score: 0.5,
      });
      expect(large.confidence_score).toBeGreaterThan(small.confidence_score);
    });

    it("should have higher risk with smaller sample", () => {
      const small = computeCalibrationScore({
        sample_size: 3, acceptance_rate: 0.5, implementation_rate: 0.5,
        positive_outcome_rate: 0.5, avg_quality_score: 0.5, avg_usefulness_score: 0.5,
      });
      const large = computeCalibrationScore({
        sample_size: 100, acceptance_rate: 0.5, implementation_rate: 0.5,
        positive_outcome_rate: 0.5, avg_quality_score: 0.5, avg_usefulness_score: 0.5,
      });
      expect(small.risk_of_overcorrection).toBeGreaterThan(large.risk_of_overcorrection);
    });

    it("should boost strength for declining trends", () => {
      const stable = computeCalibrationScore({
        sample_size: 30, acceptance_rate: 0.3, implementation_rate: 0.2,
        positive_outcome_rate: 0.2, avg_quality_score: 0.3, avg_usefulness_score: 0.3,
        trend_direction: "stable",
      });
      const declining = computeCalibrationScore({
        sample_size: 30, acceptance_rate: 0.3, implementation_rate: 0.2,
        positive_outcome_rate: 0.2, avg_quality_score: 0.3, avg_usefulness_score: 0.3,
        trend_direction: "declining",
      });
      expect(declining.signal_strength).toBeGreaterThanOrEqual(stable.signal_strength);
    });

    it("should boost strength for recurring issues", () => {
      const noRecurrence = computeCalibrationScore({
        sample_size: 30, acceptance_rate: 0.3, implementation_rate: 0.2,
        positive_outcome_rate: 0.2, avg_quality_score: 0.3, avg_usefulness_score: 0.3,
        recurrence_count: 1,
      });
      const recurring = computeCalibrationScore({
        sample_size: 30, acceptance_rate: 0.3, implementation_rate: 0.2,
        positive_outcome_rate: 0.2, avg_quality_score: 0.3, avg_usefulness_score: 0.3,
        recurrence_count: 5,
      });
      expect(recurring.signal_strength).toBeGreaterThanOrEqual(noRecurrence.signal_strength);
    });
  });

  // ─── Meta-Agent Detection Tests ───
  describe("Meta-Agent Performance Detection", () => {
    it("should detect underperforming agents", () => {
      expect(isUnderperforming(0.2, 0.1, 0.2)).toBe(true);
      expect(isUnderperforming(0.8, 0.6, 0.7)).toBe(false);
    });

    it("should detect high-value agents", () => {
      expect(isHighValue(0.8, 0.6, 0.7)).toBe(true);
      expect(isHighValue(0.3, 0.2, 0.1)).toBe(false);
    });
  });

  // ─── Historical Context Tests ───
  describe("Historical Context Value Detection", () => {
    it("should detect overweighted context", () => {
      expect(isContextOverweighted(0.3, 0.6, 10)).toBe(true);
      expect(isContextOverweighted(0.7, 0.5, 10)).toBe(false);
    });

    it("should detect underused context", () => {
      expect(isContextUnderused(0.8, 0.5, 5, 50)).toBe(true);
      expect(isContextUnderused(0.5, 0.5, 25, 50)).toBe(false);
    });

    it("should require minimum sample for overweight detection", () => {
      expect(isContextOverweighted(0.2, 0.8, 3)).toBe(false);
    });
  });

  // ─── Redundancy Guard Tests ───
  describe("Redundancy Guard Effectiveness Detection", () => {
    it("should detect too strict guard", () => {
      expect(isRedundancyTooStrict(5, 8)).toBe(true);
      expect(isRedundancyTooStrict(1, 10)).toBe(false);
    });

    it("should detect too weak guard", () => {
      expect(isRedundancyTooWeak(5, 10)).toBe(true);
      expect(isRedundancyTooWeak(1, 20)).toBe(false);
    });

    it("should require minimum sample for strictness detection", () => {
      expect(isRedundancyTooStrict(2, 3)).toBe(false);
    });

    it("should require minimum sample for weakness detection", () => {
      expect(isRedundancyTooWeak(2, 4)).toBe(false);
    });
  });

  // ─── Determinism Tests ───
  describe("Deterministic Scoring", () => {
    it("should produce identical output for identical input", () => {
      const input = {
        sample_size: 25, acceptance_rate: 0.6, implementation_rate: 0.4,
        positive_outcome_rate: 0.5, avg_quality_score: 0.6, avg_usefulness_score: 0.5,
      };
      const r1 = computeCalibrationScore(input);
      const r2 = computeCalibrationScore(input);
      expect(r1).toEqual(r2);
    });
  });

  // ─── Forbidden Mutation Regression ───
  describe("Forbidden Mutation Regression", () => {
    it("scoring functions must not return mutation instructions", () => {
      const result = computeCalibrationScore({
        sample_size: 50, acceptance_rate: 0.1, implementation_rate: 0.05,
        positive_outcome_rate: 0.05, avg_quality_score: 0.1, avg_usefulness_score: 0.1,
      });
      expect(result).not.toHaveProperty("auto_apply");
      expect(result).not.toHaveProperty("mutation");
      expect(result).not.toHaveProperty("apply_immediately");
    });

    it("types must not include auto-apply fields", () => {
      // Verify signal types are advisory
      for (const st of CALIBRATION_SIGNAL_TYPES) {
        expect(st).not.toContain("AUTO_APPLY");
        expect(st).not.toContain("AUTO_CHANGE");
      }
    });
  });

  // ─── Graceful Degradation ───
  describe("Graceful Degradation", () => {
    it("scoring should handle edge case inputs without throwing", () => {
      expect(() => computeCalibrationScore({
        sample_size: 0, acceptance_rate: 0, implementation_rate: 0,
        positive_outcome_rate: 0, avg_quality_score: 0, avg_usefulness_score: 0,
      })).not.toThrow();
    });

    it("scoring should handle extreme values without throwing", () => {
      expect(() => computeCalibrationScore({
        sample_size: 10000, acceptance_rate: 1, implementation_rate: 1,
        positive_outcome_rate: 1, avg_quality_score: 1, avg_usefulness_score: 1,
      })).not.toThrow();
    });

    it("detection functions should handle zero values", () => {
      expect(() => isUnderperforming(0, 0, 0)).not.toThrow();
      expect(() => isHighValue(0, 0, 0)).not.toThrow();
      expect(() => isContextOverweighted(0, 0, 0)).not.toThrow();
      expect(() => isContextUnderused(0, 0, 0, 0)).not.toThrow();
      expect(() => isRedundancyTooStrict(0, 0)).not.toThrow();
      expect(() => isRedundancyTooWeak(0, 0)).not.toThrow();
    });
  });
});
