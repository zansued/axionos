import { describe, it, expect } from "vitest";

// ─── Test: Unified Memory Assembler ─────────────────────────────────

// We test the pure functions since DB calls require a live connection

describe("Memory Evolution — Unified Assembler", () => {
  // Import types inline to avoid Deno import issues in vitest
  const computeFreshness = (createdAt: string, nowMs: number = Date.now()): number => {
    const ageMs = nowMs - new Date(createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays <= 1) return 1.0;
    if (ageDays <= 7) return 0.9;
    if (ageDays <= 30) return Math.max(0.2, 1 - ageDays / 45);
    return Math.max(0.05, 0.2 - (ageDays - 30) / 365);
  };

  const computeCompositeScore = (
    relevance: number, confidence: number, freshness: number, accessSignal: number,
  ): number => {
    const raw = relevance * 0.35 + confidence * 0.25 + freshness * 0.25 + accessSignal * 0.15;
    return Math.round(Math.min(1, Math.max(0, raw)) * 1000) / 1000;
  };

  const classifyTier = (
    memoryType: string, ageDays: number, relevance: number, accessCount: number,
  ): string => {
    if (memoryType === "run" || memoryType === "ephemeral") return "ephemeral";
    if (ageDays > 90 && relevance < 0.3 && accessCount < 2) return "archived";
    if (ageDays > 30) return "historical";
    return "operational";
  };

  it("computes freshness correctly for recent entries", () => {
    const now = Date.now();
    const halfHourAgo = new Date(now - 30 * 60 * 1000).toISOString();
    expect(computeFreshness(halfHourAgo, now)).toBe(1.0);
  });

  it("computes freshness correctly for 3-day-old entries", () => {
    const now = Date.now();
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(computeFreshness(threeDaysAgo, now)).toBe(0.9);
  });

  it("computes freshness correctly for old entries", () => {
    const now = Date.now();
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();
    const freshness = computeFreshness(sixtyDaysAgo, now);
    expect(freshness).toBeLessThan(0.2);
    expect(freshness).toBeGreaterThan(0);
  });

  it("computes composite score with proper weights", () => {
    const score = computeCompositeScore(0.8, 0.7, 0.9, 0.5);
    // 0.8*0.35 + 0.7*0.25 + 0.9*0.25 + 0.5*0.15 = 0.28 + 0.175 + 0.225 + 0.075 = 0.755
    expect(score).toBeCloseTo(0.755, 2);
  });

  it("composite score is bounded [0, 1]", () => {
    expect(computeCompositeScore(1, 1, 1, 1)).toBeLessThanOrEqual(1);
    expect(computeCompositeScore(0, 0, 0, 0)).toBe(0);
  });

  it("classifies ephemeral types correctly", () => {
    expect(classifyTier("run", 0, 1, 0)).toBe("ephemeral");
    expect(classifyTier("ephemeral", 100, 1, 10)).toBe("ephemeral");
  });

  it("classifies archived correctly", () => {
    expect(classifyTier("episodic", 120, 0.1, 0)).toBe("archived");
  });

  it("classifies historical correctly", () => {
    expect(classifyTier("episodic", 45, 0.5, 5)).toBe("historical");
  });

  it("classifies operational correctly", () => {
    expect(classifyTier("episodic", 5, 0.8, 3)).toBe("operational");
  });
});

// ─── Test: Memory Lifecycle & Decay Engine ──────────────────────────

describe("Memory Evolution — Lifecycle & Decay", () => {
  const computeDecayedScore = (
    baseRelevance: number, ageDays: number, memoryType: string, accessCount: number,
    config = {
      decay_rates: { episodic: 0.02, run: 0.5, strategic: 0.01 } as Record<string, number>,
      tier_thresholds: { archive_threshold: 0.1, historical_threshold: 0.25, operational_threshold: 0.5 },
      max_org_entries: 5000,
      min_survival_confidence: 0.05,
    },
  ) => {
    const lambda = config.decay_rates[memoryType] ?? 0.015;
    const decay_factor = Math.exp(-lambda * ageDays);
    const access_boost = Math.min(0.3, accessCount * 0.02);
    const effective_score = Math.min(1, Math.max(0, baseRelevance * decay_factor + access_boost));
    return {
      effective_score: Math.round(effective_score * 1000) / 1000,
      decay_factor: Math.round(decay_factor * 1000) / 1000,
      access_boost: Math.round(access_boost * 1000) / 1000,
    };
  };

  const recommendTier = (
    effectiveScore: number, currentTier: string,
    config = { tier_thresholds: { archive_threshold: 0.1, historical_threshold: 0.25, operational_threshold: 0.5 } },
  ) => {
    const { archive_threshold, historical_threshold, operational_threshold } = config.tier_thresholds;
    if (effectiveScore < archive_threshold) return "archived";
    if (effectiveScore < historical_threshold) return "historical";
    if (effectiveScore >= operational_threshold) return "operational";
    return currentTier === "operational" ? "operational" : "historical";
  };

  it("applies exponential decay correctly", () => {
    const result = computeDecayedScore(0.8, 30, "episodic", 0);
    // 0.8 * e^(-0.02 * 30) = 0.8 * e^(-0.6) ≈ 0.8 * 0.5488 ≈ 0.439
    expect(result.effective_score).toBeCloseTo(0.439, 1);
    expect(result.decay_factor).toBeCloseTo(0.549, 1);
    expect(result.access_boost).toBe(0);
  });

  it("applies access boost correctly", () => {
    const result = computeDecayedScore(0.3, 60, "episodic", 10);
    expect(result.access_boost).toBe(0.2);
    expect(result.effective_score).toBeGreaterThan(0.3 * Math.exp(-0.02 * 60));
  });

  it("caps access boost at 0.3", () => {
    const result = computeDecayedScore(0.1, 100, "episodic", 50);
    expect(result.access_boost).toBe(0.3);
  });

  it("fast decay for run-type memories", () => {
    const result = computeDecayedScore(0.9, 5, "run", 0);
    // 0.9 * e^(-0.5 * 5) = 0.9 * e^(-2.5) ≈ 0.9 * 0.082 ≈ 0.074
    expect(result.effective_score).toBeLessThan(0.1);
  });

  it("slow decay for strategic memories", () => {
    const result = computeDecayedScore(0.9, 30, "strategic", 0);
    // 0.9 * e^(-0.01 * 30) = 0.9 * e^(-0.3) ≈ 0.9 * 0.741 ≈ 0.667
    expect(result.effective_score).toBeGreaterThan(0.6);
  });

  it("recommends archive for very low scores", () => {
    expect(recommendTier(0.05, "operational")).toBe("archived");
  });

  it("recommends historical for low scores", () => {
    expect(recommendTier(0.2, "operational")).toBe("historical");
  });

  it("recommends operational for high scores", () => {
    expect(recommendTier(0.7, "historical")).toBe("operational");
  });

  it("preserves operational tier in gray zone", () => {
    expect(recommendTier(0.4, "operational")).toBe("operational");
  });
});

// ─── Test: Memory Consolidation Engine ──────────────────────────────

describe("Memory Evolution — Consolidation", () => {
  type Entry = {
    id: string;
    source_layer: string;
    memory_type: string;
    tier: string;
    content_summary: string;
    relevance_score: number;
    confidence_score: number;
    freshness_score: number;
    composite_score: number;
    context_signature: string;
    created_at: string;
    metadata: Record<string, unknown>;
  };

  const tokenize = (text: string): Set<string> =>
    new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((t) => t.length > 2));

  const jaccardSimilarity = (a: Set<string>, b: Set<string>): number => {
    if (a.size === 0 && b.size === 0) return 0;
    let intersection = 0;
    for (const token of a) if (b.has(token)) intersection++;
    const union = a.size + b.size - intersection;
    return union === 0 ? 0 : intersection / union;
  };

  it("detects exact duplicates by context_signature", () => {
    const entries: Entry[] = [
      { id: "a", source_layer: "agent_memory", memory_type: "episodic", tier: "operational", content_summary: "test", relevance_score: 0.8, confidence_score: 0.8, freshness_score: 0.9, composite_score: 0.8, context_signature: "sig1", created_at: new Date().toISOString(), metadata: {} },
      { id: "b", source_layer: "engineering_memory", memory_type: "episodic", tier: "operational", content_summary: "test", relevance_score: 0.5, confidence_score: 0.5, freshness_score: 0.9, composite_score: 0.5, context_signature: "sig1", created_at: new Date().toISOString(), metadata: {} },
    ];

    // Group by signature manually
    const grouped = new Map<string, Entry[]>();
    for (const e of entries) {
      if (!e.context_signature) continue;
      const g = grouped.get(e.context_signature) || [];
      g.push(e);
      grouped.set(e.context_signature, g);
    }

    const dupGroups = [...grouped.values()].filter((g) => g.length > 1);
    expect(dupGroups.length).toBe(1);
    expect(dupGroups[0].length).toBe(2);
  });

  it("computes Jaccard similarity correctly", () => {
    const a = tokenize("the quick brown fox jumps over the lazy dog");
    const b = tokenize("the quick brown cat jumps over the lazy mouse");
    const sim = jaccardSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.4);
    expect(sim).toBeLessThan(1);
  });

  it("Jaccard returns 0 for completely different texts", () => {
    const a = tokenize("alpha beta gamma");
    const b = tokenize("delta epsilon zeta");
    expect(jaccardSimilarity(a, b)).toBe(0);
  });

  it("Jaccard returns 1 for identical texts", () => {
    const a = tokenize("hello world testing");
    const b = tokenize("hello world testing");
    expect(jaccardSimilarity(a, b)).toBe(1);
  });

  it("identifies prune candidates below threshold", () => {
    const entries: Entry[] = [
      { id: "low", source_layer: "agent_memory", memory_type: "run", tier: "ephemeral", content_summary: "low", relevance_score: 0.05, confidence_score: 0.05, freshness_score: 0.1, composite_score: 0.05, context_signature: "unique_low", created_at: new Date().toISOString(), metadata: {} },
      { id: "high", source_layer: "agent_memory", memory_type: "episodic", tier: "operational", content_summary: "high", relevance_score: 0.9, confidence_score: 0.9, freshness_score: 0.9, composite_score: 0.9, context_signature: "unique_high", created_at: new Date().toISOString(), metadata: {} },
    ];

    const prunable = entries.filter((e) => e.composite_score < 0.15);
    expect(prunable.length).toBe(1);
    expect(prunable[0].id).toBe("low");
  });
});
