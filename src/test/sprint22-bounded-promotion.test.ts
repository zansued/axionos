import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════
// Sprint 22 — Bounded Promotion & Rollback Guard Tests
// ═══════════════════════════════════════════════════════

// Import shared modules
import {
  evaluatePhaseAdvance,
  getNextPhasePercent,
  buildRolloutWindow,
  type RolloutWindow,
} from "../../supabase/functions/_shared/learning/prompt-rollout-engine";

import {
  evaluatePromotionHealth,
  DEFAULT_HEALTH_CONFIG,
  type HealthCheckResult,
} from "../../supabase/functions/_shared/learning/prompt-health-guard";

import {
  evaluateRollbackDecision,
  buildRollbackAction,
  isRollbackBounded,
} from "../../supabase/functions/_shared/learning/prompt-rollback-engine";

import {
  buildControlLineage,
} from "../../supabase/functions/_shared/learning/prompt-lineage-view";

import type { AggregatedMetrics } from "../../supabase/functions/_shared/learning/prompt-variant-metrics";

// ═══════════════════════════════════════════════════════
// 1. Rollout Engine Tests
// ═══════════════════════════════════════════════════════

describe("Sprint 22 — Rollout Engine", () => {
  const baseWindow: RolloutWindow = {
    id: "w-1",
    organization_id: "org-1",
    stage_key: "pipeline-planning",
    promoted_variant_id: "v-new",
    previous_control_variant_id: "v-old",
    rollout_mode: "manual_confirmed",
    rollout_strategy: "phased_10_25_50_100",
    rollout_status: "active",
    current_exposure_percent: 10,
    started_at: new Date().toISOString(),
    completed_at: null,
  };

  describe("getNextPhasePercent", () => {
    it("returns 25 from 10", () => {
      expect(getNextPhasePercent(10)).toBe(25);
    });

    it("returns 50 from 25", () => {
      expect(getNextPhasePercent(25)).toBe(50);
    });

    it("returns 100 from 50", () => {
      expect(getNextPhasePercent(50)).toBe(100);
    });

    it("returns null from 100 (already at max)", () => {
      expect(getNextPhasePercent(100)).toBeNull();
    });

    it("handles non-standard percent by finding next step", () => {
      expect(getNextPhasePercent(15)).toBe(25);
    });
  });

  describe("evaluatePhaseAdvance", () => {
    it("blocks advance when rollout not active", () => {
      const result = evaluatePhaseAdvance(
        { ...baseWindow, rollout_status: "paused" },
        "healthy", 20, 0.8,
      );
      expect(result.advanced).toBe(false);
      expect(result.reason).toContain("rollout_not_active");
    });

    it("advances immediately for immediate strategy", () => {
      const result = evaluatePhaseAdvance(
        { ...baseWindow, rollout_strategy: "immediate" },
        "healthy", 0, 0,
      );
      expect(result.advanced).toBe(true);
      expect(result.new_exposure_percent).toBe(100);
      expect(result.rollout_completed).toBe(true);
    });

    it("blocks advance when health is rollback_recommended", () => {
      const result = evaluatePhaseAdvance(baseWindow, "rollback_recommended", 20, 0.8);
      expect(result.advanced).toBe(false);
      expect(result.reason).toContain("health_guard_blocked");
    });

    it("blocks advance when health is rollback_required", () => {
      const result = evaluatePhaseAdvance(baseWindow, "rollback_required", 20, 0.8);
      expect(result.advanced).toBe(false);
    });

    it("blocks advance with insufficient executions", () => {
      const result = evaluatePhaseAdvance(baseWindow, "healthy", 5, 0.8);
      expect(result.advanced).toBe(false);
      expect(result.reason).toContain("insufficient_executions");
    });

    it("blocks advance with low confidence", () => {
      const result = evaluatePhaseAdvance(baseWindow, "healthy", 20, 0.2);
      expect(result.advanced).toBe(false);
      expect(result.reason).toContain("low_confidence");
    });

    it("advances from 10 to 25 when all criteria met", () => {
      const result = evaluatePhaseAdvance(baseWindow, "healthy", 20, 0.8);
      expect(result.advanced).toBe(true);
      expect(result.new_exposure_percent).toBe(25);
      expect(result.rollout_completed).toBe(false);
    });

    it("completes rollout when advancing from 50 to 100", () => {
      const result = evaluatePhaseAdvance(
        { ...baseWindow, current_exposure_percent: 50 },
        "healthy", 20, 0.8,
      );
      expect(result.advanced).toBe(true);
      expect(result.new_exposure_percent).toBe(100);
      expect(result.rollout_completed).toBe(true);
    });

    it("returns already_at_max when at 100", () => {
      const result = evaluatePhaseAdvance(
        { ...baseWindow, current_exposure_percent: 100 },
        "healthy", 20, 0.8,
      );
      expect(result.advanced).toBe(false);
      expect(result.reason).toContain("already_at_max_exposure");
    });
  });

  describe("buildRolloutWindow", () => {
    it("builds immediate rollout with 100% exposure", () => {
      const w = buildRolloutWindow({
        organizationId: "org-1",
        stageKey: "pipeline-planning",
        promotedVariantId: "v-new",
        previousControlVariantId: "v-old",
        rolloutMode: "manual_confirmed",
        rolloutStrategy: "immediate",
      });
      expect(w.current_exposure_percent).toBe(100);
      expect(w.rollout_status).toBe("active");
    });

    it("builds phased rollout with 10% initial exposure", () => {
      const w = buildRolloutWindow({
        organizationId: "org-1",
        stageKey: "pipeline-planning",
        promotedVariantId: "v-new",
        previousControlVariantId: null,
        rolloutMode: "manual_confirmed",
        rolloutStrategy: "phased_10_25_50_100",
      });
      expect(w.current_exposure_percent).toBe(10);
    });
  });
});

// ═══════════════════════════════════════════════════════
// 2. Health Guard Tests
// ═══════════════════════════════════════════════════════

describe("Sprint 22 — Health Guard", () => {
  const healthyMetrics: AggregatedMetrics = {
    prompt_variant_id: "v-new",
    executions: 30,
    success_rate: 0.9,
    repair_rate: 0.05,
    avg_cost_usd: 0.03,
    avg_duration_ms: 2000,
    avg_quality_score: 80,
    promotion_score: 0.85,
    confidence_level: 0.8,
  };

  const baseline: AggregatedMetrics = {
    prompt_variant_id: "v-old",
    executions: 100,
    success_rate: 0.88,
    repair_rate: 0.06,
    avg_cost_usd: 0.03,
    avg_duration_ms: 2100,
    avg_quality_score: 78,
    promotion_score: 0.80,
    confidence_level: 0.9,
  };

  it("returns healthy when all metrics are good", () => {
    const result = evaluatePromotionHealth(healthyMetrics, baseline);
    expect(result.health_status).toBe("healthy");
    expect(result.regression_flags).toContain("all_checks_passed");
  });

  it("returns watch for insufficient executions", () => {
    const result = evaluatePromotionHealth(
      { ...healthyMetrics, executions: 3 },
      baseline,
    );
    expect(result.health_status).toBe("watch");
    expect(result.regression_flags).toContain("insufficient_executions");
  });

  it("returns rollback_required for hard failure (low success_rate)", () => {
    const result = evaluatePromotionHealth(
      { ...healthyMetrics, success_rate: 0.3 },
      baseline,
    );
    expect(result.health_status).toBe("rollback_required");
    expect(result.regression_flags.some(f => f.includes("hard_failure"))).toBe(true);
  });

  it("returns rollback_required for catastrophic cost", () => {
    const result = evaluatePromotionHealth(
      { ...healthyMetrics, avg_cost_usd: 0.10 },
      { ...baseline, avg_cost_usd: 0.03 },
    );
    expect(result.health_status).toBe("rollback_required");
    expect(result.regression_flags.some(f => f.includes("catastrophic_cost"))).toBe(true);
  });

  it("returns rollback_recommended for success_rate regression", () => {
    const result = evaluatePromotionHealth(
      { ...healthyMetrics, success_rate: 0.80 },
      { ...baseline, success_rate: 0.90 },
    );
    expect(result.health_status).toBe("rollback_recommended");
  });

  it("returns rollback_recommended for repair_rate increase", () => {
    const result = evaluatePromotionHealth(
      { ...healthyMetrics, repair_rate: 0.20 },
      { ...baseline, repair_rate: 0.05 },
    );
    expect(result.health_status).toBe("rollback_recommended");
  });

  it("returns rollback_recommended for quality drop", () => {
    const result = evaluatePromotionHealth(
      { ...healthyMetrics, avg_quality_score: 60 },
      { ...baseline, avg_quality_score: 80 },
    );
    expect(result.health_status).toBe("rollback_recommended");
  });

  it("returns watch for low confidence", () => {
    const result = evaluatePromotionHealth(
      { ...healthyMetrics, confidence_level: 0.2 },
      null,
    );
    expect(result.health_status).toBe("watch");
  });

  it("returns watch for low sample size", () => {
    const result = evaluatePromotionHealth(
      { ...healthyMetrics, executions: 8, confidence_level: 0.5 },
      null,
    );
    expect(result.health_status).toBe("watch");
    expect(result.regression_flags.some(f => f.includes("low_sample_size"))).toBe(true);
  });

  it("handles null baseline gracefully", () => {
    const result = evaluatePromotionHealth(healthyMetrics, null);
    expect(["healthy", "watch"]).toContain(result.health_status);
  });
});

// ═══════════════════════════════════════════════════════
// 3. Rollback Engine Tests
// ═══════════════════════════════════════════════════════

describe("Sprint 22 — Rollback Engine", () => {
  describe("evaluateRollbackDecision", () => {
    it("recommends manual rollback for rollback_required (auto disabled)", () => {
      const result = evaluateRollbackDecision("rollback_required", ["hard_failure"], false);
      expect(result.shouldRollback).toBe(false);
      expect(result.rollbackMode).toBe("manual");
      expect(result.severity).toBe("critical");
    });

    it("triggers auto rollback for rollback_required when auto enabled", () => {
      const result = evaluateRollbackDecision("rollback_required", ["hard_failure"], true);
      expect(result.shouldRollback).toBe(true);
      expect(result.rollbackMode).toBe("bounded_auto");
      expect(result.severity).toBe("critical");
    });

    it("never auto-rollbacks for rollback_recommended", () => {
      const result = evaluateRollbackDecision("rollback_recommended", ["quality_drop"], true);
      expect(result.shouldRollback).toBe(false);
      expect(result.severity).toBe("warning");
    });

    it("returns no rollback for healthy", () => {
      const result = evaluateRollbackDecision("healthy", [], false);
      expect(result.shouldRollback).toBe(false);
      expect(result.reason).toHaveLength(0);
    });
  });

  describe("buildRollbackAction", () => {
    it("builds a valid rollback action", () => {
      const action = buildRollbackAction("v-new", "v-old", ["test"], "manual");
      expect(action.rolledBackVariantId).toBe("v-new");
      expect(action.restoredControlVariantId).toBe("v-old");
      expect(action.rollbackMode).toBe("manual");
      expect(action.rollbackReason.flags).toEqual(["test"]);
    });
  });

  describe("isRollbackBounded", () => {
    it("returns true for valid bounded action", () => {
      const action = buildRollbackAction("v-new", "v-old", ["test"], "manual");
      expect(isRollbackBounded(action)).toBe(true);
    });

    it("returns false if same variant ids", () => {
      const action = buildRollbackAction("v-same", "v-same", ["test"], "manual");
      expect(isRollbackBounded(action)).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════
// 4. Lineage View Tests
// ═══════════════════════════════════════════════════════

describe("Sprint 22 — Lineage View", () => {
  it("builds lineage with current control", () => {
    const lineage = buildControlLineage(
      "pipeline-planning",
      [
        { id: "v-1", variant_name: "v1", stage_key: "pipeline-planning", status: "retired" },
        { id: "v-2", variant_name: "v2", stage_key: "pipeline-planning", status: "active_control" },
      ],
      [
        { promoted_variant_id: "v-1", previous_control_variant_id: null, promotion_reason: { manual: true }, created_at: "2026-01-01T00:00:00Z" },
        { promoted_variant_id: "v-2", previous_control_variant_id: "v-1", promotion_reason: { manual: true }, created_at: "2026-02-01T00:00:00Z" },
      ],
      [],
    );

    expect(lineage.currentControl).not.toBeNull();
    expect(lineage.currentControl!.variantId).toBe("v-2");
    expect(lineage.history).toHaveLength(2);
  });

  it("marks rolled-back entries", () => {
    const lineage = buildControlLineage(
      "pipeline-planning",
      [
        { id: "v-1", variant_name: "v1", stage_key: "pipeline-planning", status: "active_control" },
        { id: "v-2", variant_name: "v2", stage_key: "pipeline-planning", status: "retired" },
      ],
      [
        { promoted_variant_id: "v-2", previous_control_variant_id: "v-1", promotion_reason: {}, created_at: "2026-01-15T00:00:00Z" },
      ],
      [
        { rolled_back_variant_id: "v-2", restored_control_variant_id: "v-1", rollback_reason: { flags: ["quality_drop"] }, created_at: "2026-01-20T00:00:00Z" },
      ],
    );

    const rolledBack = lineage.history.find(h => h.variantId === "v-2");
    expect(rolledBack?.wasRolledBack).toBe(true);
    expect(rolledBack?.rollbackReason).not.toBeNull();
  });

  it("handles empty data gracefully", () => {
    const lineage = buildControlLineage("test-stage", [], [], []);
    expect(lineage.currentControl).toBeNull();
    expect(lineage.history).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════
// 5. Safety Guard Tests
// ═══════════════════════════════════════════════════════

describe("Sprint 22 — Safety Guards", () => {
  it("bounded_auto is disabled by default in rollback decisions", () => {
    const result = evaluateRollbackDecision("rollback_required", ["failure"], false);
    expect(result.shouldRollback).toBe(false);
  });

  it("rollback action never contains pipeline/governance/billing mutation fields", () => {
    const action = buildRollbackAction("v-new", "v-old", ["test"], "bounded_auto");
    const keys = Object.keys(action);
    expect(keys).not.toContain("mutate_pipeline");
    expect(keys).not.toContain("mutate_governance");
    expect(keys).not.toContain("mutate_billing");
    expect(keys).not.toContain("auto_promote");
  });

  it("health guard never returns mutation instructions", () => {
    const result = evaluatePromotionHealth(
      {
        prompt_variant_id: "v-1",
        executions: 50,
        success_rate: 0.2,
        repair_rate: 0.5,
        avg_cost_usd: 1.0,
        avg_duration_ms: 5000,
        avg_quality_score: 10,
        promotion_score: 0.1,
        confidence_level: 0.9,
      },
      null,
    );
    const keys = Object.keys(result);
    expect(keys).not.toContain("execute_rollback");
    expect(keys).not.toContain("mutate_pipeline");
  });

  it("phased rollout cannot skip phases", () => {
    // Can only go 10→25→50→100
    expect(getNextPhasePercent(10)).toBe(25);
    expect(getNextPhasePercent(25)).toBe(50);
    expect(getNextPhasePercent(50)).toBe(100);
    // Cannot go 10→100 directly
    expect(getNextPhasePercent(10)).not.toBe(100);
  });
});
