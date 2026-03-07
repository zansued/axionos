import { describe, it, expect } from "vitest";
import {
  rankRetrievedEvidence,
  deduplicateEvidence,
  applyContradictionPenalty,
  type RankedEvidence,
} from "../../supabase/functions/_shared/semantic-retrieval/semantic-retrieval-ranker";
import {
  validateRetrievalGuardrails,
  validateRetrievalUsage,
} from "../../supabase/functions/_shared/semantic-retrieval/semantic-retrieval-guardrails";

function makeEntry(overrides: Partial<RankedEvidence> = {}): RankedEvidence {
  return {
    id: overrides.id || crypto.randomUUID(),
    domain: overrides.domain || "engineering_memory",
    title: overrides.title || "Test Entry",
    summary: overrides.summary || "A test evidence entry",
    relevance_score: overrides.relevance_score ?? 0.7,
    confidence_score: overrides.confidence_score ?? 0.6,
    freshness: overrides.freshness || new Date().toISOString(),
    source_ref: overrides.source_ref || { table: "test", id: "1" },
    tags: overrides.tags || [],
    rank_score: overrides.rank_score ?? 0,
    similarity_score: overrides.similarity_score,
  };
}

describe("Sprint 36 — Semantic Retrieval & Embedding Memory Expansion", () => {
  // ── Ranking ──
  describe("Semantic Retrieval Ranker", () => {
    it("should rank entries by composite score", () => {
      const entries = [
        makeEntry({ relevance_score: 0.3, confidence_score: 0.3 }),
        makeEntry({ relevance_score: 0.9, confidence_score: 0.9 }),
        makeEntry({ relevance_score: 0.5, confidence_score: 0.5 }),
      ];
      const ranked = rankRetrievedEvidence(entries, {});
      expect(ranked[0].relevance_score).toBe(0.9);
      expect(ranked[0].rank_score).toBeGreaterThan(ranked[1].rank_score);
      expect(ranked[1].rank_score).toBeGreaterThan(ranked[2].rank_score);
    });

    it("should boost recent entries over old ones", () => {
      const recent = makeEntry({ relevance_score: 0.5, confidence_score: 0.5, freshness: new Date().toISOString() });
      const old = makeEntry({ relevance_score: 0.5, confidence_score: 0.5, freshness: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString() });
      const ranked = rankRetrievedEvidence([old, recent], {});
      expect(ranked[0].id).toBe(recent.id);
    });

    it("should boost scope-matching entries for error context", () => {
      const repair = makeEntry({ domain: "repair_history", relevance_score: 0.5 });
      const generic = makeEntry({ domain: "engineering_memory", relevance_score: 0.5 });
      const ranked = rankRetrievedEvidence([generic, repair], { error_signature: "NPE_1" });
      expect(ranked[0].domain).toBe("repair_history");
    });

    it("should handle empty input", () => {
      const ranked = rankRetrievedEvidence([], {});
      expect(ranked).toEqual([]);
    });

    it("should produce deterministic results for same input", () => {
      const entries = [
        makeEntry({ id: "a", relevance_score: 0.8, confidence_score: 0.7 }),
        makeEntry({ id: "b", relevance_score: 0.6, confidence_score: 0.9 }),
      ];
      const r1 = rankRetrievedEvidence([...entries], {});
      const r2 = rankRetrievedEvidence([...entries], {});
      expect(r1.map((e) => e.id)).toEqual(r2.map((e) => e.id));
    });
  });

  // ── Deduplication ──
  describe("Deduplication", () => {
    it("should remove duplicate entries by domain:id", () => {
      const entry = makeEntry({ id: "dup1", domain: "test" });
      const deduped = deduplicateEvidence([entry, { ...entry }, makeEntry({ id: "unique" })]);
      expect(deduped.length).toBe(2);
    });

    it("should handle empty input", () => {
      expect(deduplicateEvidence([])).toEqual([]);
    });
  });

  // ── Contradiction Penalty ──
  describe("Contradiction Penalty", () => {
    it("should penalize duplicate domain:title entries", () => {
      const e1 = makeEntry({ domain: "test", title: "Same", rank_score: 0.8 });
      const e2 = makeEntry({ domain: "test", title: "Same", rank_score: 0.7 });
      const result = applyContradictionPenalty([e1, e2]);
      expect(result[0].rank_score).toBe(0.8);
      expect(result[1].rank_score).toBeLessThan(0.7);
    });
  });

  // ── Guardrails ──
  describe("Retrieval Guardrails", () => {
    it("should require organization_id", () => {
      const result = validateRetrievalGuardrails({ organization_id: "", session_type: "test" });
      expect(result.allowed).toBe(false);
    });

    it("should allow valid context", () => {
      const result = validateRetrievalGuardrails({ organization_id: "org1", session_type: "test" });
      expect(result.allowed).toBe(true);
    });

    it("should block forbidden domains", () => {
      const result = validateRetrievalGuardrails({ organization_id: "org1", session_type: "test", domain_keys: ["billing_data"] });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("forbidden");
    });

    it("should block forbidden usage intents", () => {
      const result = validateRetrievalUsage("mutate pipeline_topology");
      expect(result.allowed).toBe(false);
    });

    it("should allow safe usage intents", () => {
      const result = validateRetrievalUsage("inform advisory recommendation");
      expect(result.allowed).toBe(true);
    });
  });

  // ── Context Builders ──
  describe("Context Builders", () => {
    it("should build runtime agent context with correct domains", async () => {
      const { buildRuntimeAgentContext } = await import("../../supabase/functions/_shared/semantic-retrieval/runtime-retrieval-context-builder");
      const ctx = buildRuntimeAgentContext("org1", { agent_type: "build", stage_key: "s1" });
      expect(ctx.organization_id).toBe("org1");
      expect(ctx.session_type).toBe("runtime_agent");
      expect(ctx.domain_keys).toContain("engineering_memory");
    });

    it("should build advisory context with correct domains", async () => {
      const { buildAdvisoryRecommendationContext } = await import("../../supabase/functions/_shared/semantic-retrieval/advisory-retrieval-context-builder");
      const ctx = buildAdvisoryRecommendationContext("org1", { advisory_target_scope: "platform" });
      expect(ctx.session_type).toBe("advisory_recommendation");
      expect(ctx.domain_keys).toContain("engineering_advisory");
    });

    it("should build strategy context with correct domains", async () => {
      const { buildStrategyEvolutionContext } = await import("../../supabase/functions/_shared/semantic-retrieval/strategy-retrieval-context-builder");
      const ctx = buildStrategyEvolutionContext("org1", { strategy_family: "repair" });
      expect(ctx.session_type).toBe("strategy_evolution");
      expect(ctx.domain_keys).toContain("strategy_variants");
    });

    it("should build platform context with correct domains", async () => {
      const { buildPlatformIntelligenceContext } = await import("../../supabase/functions/_shared/semantic-retrieval/platform-retrieval-context-builder");
      const ctx = buildPlatformIntelligenceContext("org1", { platform_context: "bottleneck" });
      expect(ctx.session_type).toBe("platform_intelligence");
      expect(ctx.domain_keys).toContain("platform_insights");
    });
  });

  // ── Forbidden Mutation Guards ──
  describe("Forbidden Mutation Guards", () => {
    const forbidden = [
      "pipeline_topology",
      "governance_rules",
      "billing_logic",
      "plan_enforcement",
      "execution_contracts",
      "hard_safety_constraints",
    ];

    forbidden.forEach((family) => {
      it(`should block mutation intent: ${family}`, () => {
        const result = validateRetrievalUsage(`auto-mutate ${family}`);
        expect(result.allowed).toBe(false);
      });
    });
  });

  // ── Tenant Isolation ──
  describe("Tenant Isolation", () => {
    it("should reject empty organization_id", () => {
      const result = validateRetrievalGuardrails({ organization_id: "", session_type: "test" });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("tenant isolation");
    });
  });

  // ── Edge Cases ──
  describe("Edge Cases", () => {
    it("should handle entries with missing fields gracefully", () => {
      const entry = makeEntry({ relevance_score: 0, confidence_score: 0, freshness: "" });
      const ranked = rankRetrievedEvidence([entry], {});
      expect(ranked.length).toBe(1);
      expect(ranked[0].rank_score).toBeGreaterThanOrEqual(0);
    });

    it("should handle very large tag arrays", () => {
      const entry = makeEntry({ tags: Array.from({ length: 100 }, (_, i) => `tag_${i}`) });
      const ranked = rankRetrievedEvidence([entry], {});
      expect(ranked.length).toBe(1);
    });

    it("should cap rank_score at reasonable bounds", () => {
      const entry = makeEntry({ relevance_score: 1, confidence_score: 1, similarity_score: 1 });
      const ranked = rankRetrievedEvidence([entry], { error_signature: "x" });
      expect(ranked[0].rank_score).toBeLessThanOrEqual(1);
    });
  });
});
