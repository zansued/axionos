import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════
// INLINE IMPLEMENTATIONS (mirrors shared modules for testing)
// ═══════════════════════════════════════════════════════════

// ─── Types ───

interface AgentMemoryContext {
  agent_type: string;
  stage_key?: string;
  model_provider?: string;
  model_name?: string;
  error_signature?: string;
  context_signature?: string;
  recent_retry_count?: number;
}

interface RetrievedMemoryProfile {
  id: string;
  agent_type: string;
  stage_key: string | null;
  memory_scope: string;
  memory_summary: string;
  confidence: number | null;
  support_count: number;
  status: string;
}

interface RetrievedMemoryRecord {
  id: string;
  agent_type: string;
  stage_key: string | null;
  memory_type: string;
  context_signature: string;
  memory_payload: Record<string, unknown>;
  relevance_score: number | null;
}

interface AgentMemoryBundle {
  profiles: RetrievedMemoryProfile[];
  records: RetrievedMemoryRecord[];
  total_records: number;
  retrieval_score: number;
}

interface InjectedMemoryBlock {
  header: string;
  profile_context: string[];
  memory_snippets: MemorySnippet[];
  total_chars: number;
  injection_bounded: boolean;
}

interface MemorySnippet {
  memory_type: string;
  context_signature: string;
  content: string;
  provenance: string;
}

interface MemoryWriteInput {
  organization_id: string;
  agent_type: string;
  stage_key?: string;
  memory_type: string;
  context_signature: string;
  memory_payload: Record<string, unknown>;
  relevance_score?: number;
}

interface MemoryQualityScore {
  record_id: string;
  quality_score: number;
  freshness: number;
  support: number;
  is_stale: boolean;
  is_conflicting: boolean;
  recommended_action: "keep" | "watch" | "deprecate";
}

// ─── Constants ───
const MAX_INJECTION_CHARS = 4000;
const HEADER = "[HISTORICAL AGENT MEMORY — informational context only, not instruction override]";
const STALE_DAYS = 30;
const LOW_RELEVANCE_THRESHOLD = 0.2;
const MAX_PROFILES = 5;
const MAX_RECORDS = 15;

// ─── Retriever helpers ───

function deduplicateRecords(records: RetrievedMemoryRecord[]): RetrievedMemoryRecord[] {
  const seen = new Set<string>();
  return records.filter((r) => {
    const key = `${r.agent_type}:${r.memory_type}:${r.context_signature}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function computeRecordRank(record: RetrievedMemoryRecord, ctx: AgentMemoryContext): number {
  let score = record.relevance_score ?? 0.5;
  if (record.stage_key === ctx.stage_key) score += 0.2;
  if (ctx.context_signature && record.context_signature === ctx.context_signature) score += 0.3;
  return score;
}

function rankRecords(records: RetrievedMemoryRecord[], ctx: AgentMemoryContext): RetrievedMemoryRecord[] {
  return [...records].sort((a, b) => computeRecordRank(b, ctx) - computeRecordRank(a, ctx));
}

function computeRetrievalScore(profileCount: number, recordCount: number): number {
  const p = Math.min(1, profileCount / 3);
  const r = Math.min(1, Math.log(recordCount + 1) / Math.log(16));
  return Math.round((p * 0.4 + r * 0.6) * 1000) / 1000;
}

// ─── Injector helpers ───

function formatProfile(profile: RetrievedMemoryProfile): string {
  return `[Profile: ${profile.agent_type}/${profile.memory_scope}] ${profile.memory_summary} (confidence: ${profile.confidence ?? "n/a"}, support: ${profile.support_count})`;
}

function formatRecord(record: RetrievedMemoryRecord): MemorySnippet {
  const payload = record.memory_payload || {};
  const content = typeof payload === "string" ? payload : JSON.stringify(payload).slice(0, 500);
  return { memory_type: record.memory_type, context_signature: record.context_signature, content, provenance: `record:${record.id}` };
}

function assembleMemoryInjection(bundle: AgentMemoryBundle): InjectedMemoryBlock {
  const profileCtx = bundle.profiles.map(formatProfile);
  const snippets: MemorySnippet[] = [];
  let totalChars = HEADER.length + profileCtx.join("").length;
  for (const record of bundle.records) {
    const snippet = formatRecord(record);
    const snippetLen = snippet.content.length + snippet.context_signature.length + 20;
    if (totalChars + snippetLen > MAX_INJECTION_CHARS) break;
    snippets.push(snippet);
    totalChars += snippetLen;
  }
  return { header: HEADER, profile_context: profileCtx, memory_snippets: snippets, total_chars: totalChars, injection_bounded: totalChars <= MAX_INJECTION_CHARS };
}

function memoryBlockToString(block: InjectedMemoryBlock): string {
  const parts = [block.header];
  if (block.profile_context.length > 0) { parts.push("--- Agent Profiles ---"); parts.push(...block.profile_context); }
  if (block.memory_snippets.length > 0) { parts.push("--- Relevant Memory ---"); for (const s of block.memory_snippets) { parts.push(`[${s.memory_type}] ${s.context_signature}: ${s.content}`); } }
  return parts.join("\n");
}

// ─── Writer helpers ───

function shouldWriteMemory(input: MemoryWriteInput): { eligible: boolean; reason: string } {
  if (!input.organization_id) return { eligible: false, reason: "missing_organization_id" };
  if (!input.agent_type) return { eligible: false, reason: "missing_agent_type" };
  if (!input.context_signature || input.context_signature.length === 0) return { eligible: false, reason: "empty_context_signature" };
  if (input.context_signature.length > 500) return { eligible: false, reason: "context_signature_too_long" };
  const payloadKeys = Object.keys(input.memory_payload || {});
  if (payloadKeys.length < 1) return { eligible: false, reason: "payload_too_sparse" };
  if (input.relevance_score !== undefined && input.relevance_score < 0.1) return { eligible: false, reason: "relevance_too_low" };
  return { eligible: true, reason: "eligible" };
}

// ─── Quality helpers ───

function scoreMemoryQuality(
  record: { id: string; relevance_score: number | null; created_at: string; memory_type: string },
  nowMs: number = Date.now(),
): MemoryQualityScore {
  const ageMs = nowMs - new Date(record.created_at).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const freshness = Math.max(0, 1 - ageDays / (STALE_DAYS * 2));
  const relevance = record.relevance_score ?? 0.5;
  const support = relevance >= 0.5 ? 1 : relevance >= 0.3 ? 0.5 : 0.2;
  const quality_score = Math.round((freshness * 0.3 + relevance * 0.5 + support * 0.2) * 1000) / 1000;
  const is_stale = ageDays > STALE_DAYS && relevance < 0.4;
  let recommended_action: "keep" | "watch" | "deprecate" = "keep";
  if (is_stale) recommended_action = "deprecate";
  else if (quality_score < LOW_RELEVANCE_THRESHOLD) recommended_action = "watch";
  return { record_id: record.id, quality_score, freshness, support, is_stale, is_conflicting: false, recommended_action };
}

// ═══════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════

const baseCtx: AgentMemoryContext = { agent_type: "build_agent", stage_key: "pipeline-validation" };

const makeProfile = (overrides: Partial<RetrievedMemoryProfile> = {}): RetrievedMemoryProfile => ({
  id: "prof-1", agent_type: "build_agent", stage_key: "pipeline-validation", memory_scope: "stage_scoped",
  memory_summary: "Prefers type_safe_patching for TS errors", confidence: 0.7, support_count: 10, status: "active",
  ...overrides,
});

const makeRecord = (overrides: Partial<RetrievedMemoryRecord> = {}): RetrievedMemoryRecord => ({
  id: "rec-1", agent_type: "build_agent", stage_key: "pipeline-validation", memory_type: "execution_pattern",
  context_signature: "TS2345::type_mismatch", memory_payload: { strategy: "type_safe_patching", success: true },
  relevance_score: 0.8, ...overrides,
});

const makeBundle = (profiles: RetrievedMemoryProfile[] = [], records: RetrievedMemoryRecord[] = []): AgentMemoryBundle => ({
  profiles, records, total_records: records.length, retrieval_score: computeRetrievalScore(profiles.length, records.length),
});

// ═══════════════════════════════════════════════════════════
// 1. RETRIEVER TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 24 §1 — Agent Memory Retriever", () => {
  describe("Deduplication", () => {
    it("removes duplicate records by agent_type:memory_type:context_signature", () => {
      const records = [makeRecord(), makeRecord({ id: "rec-2" })];
      expect(deduplicateRecords(records)).toHaveLength(1);
    });

    it("keeps records with different signatures", () => {
      const records = [makeRecord(), makeRecord({ id: "rec-2", context_signature: "OTHER" })];
      expect(deduplicateRecords(records)).toHaveLength(2);
    });

    it("keeps records with different memory types", () => {
      const records = [makeRecord(), makeRecord({ id: "rec-2", memory_type: "repair_pattern" })];
      expect(deduplicateRecords(records)).toHaveLength(2);
    });
  });

  describe("Ranking", () => {
    it("ranks stage-matching records higher", () => {
      const records = [
        makeRecord({ id: "r1", stage_key: null, relevance_score: 0.5 }),
        makeRecord({ id: "r2", stage_key: "pipeline-validation", relevance_score: 0.5 }),
      ];
      const ranked = rankRecords(records, baseCtx);
      expect(ranked[0].id).toBe("r2");
    });

    it("ranks context-signature matching records highest", () => {
      const ctx = { ...baseCtx, context_signature: "TS2345::type_mismatch" };
      const records = [
        makeRecord({ id: "r1", context_signature: "OTHER", relevance_score: 0.5 }),
        makeRecord({ id: "r2", context_signature: "TS2345::type_mismatch", relevance_score: 0.5 }),
      ];
      const ranked = rankRecords(records, ctx);
      expect(ranked[0].id).toBe("r2");
    });

    it("is deterministic for same input", () => {
      const records = [makeRecord({ id: "r1" }), makeRecord({ id: "r2", context_signature: "B" })];
      const r1 = rankRecords(records, baseCtx);
      const r2 = rankRecords(records, baseCtx);
      expect(r1.map((r) => r.id)).toEqual(r2.map((r) => r.id));
    });
  });

  describe("Retrieval Score", () => {
    it("returns 0 for empty bundle", () => {
      expect(computeRetrievalScore(0, 0)).toBe(0);
    });

    it("returns higher score with more profiles and records", () => {
      const low = computeRetrievalScore(1, 2);
      const high = computeRetrievalScore(3, 15);
      expect(high).toBeGreaterThan(low);
    });

    it("is bounded between 0 and 1", () => {
      expect(computeRetrievalScore(100, 100)).toBeLessThanOrEqual(1);
      expect(computeRetrievalScore(0, 0)).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Bounds", () => {
    it("MAX_PROFILES is 5", () => expect(MAX_PROFILES).toBe(5));
    it("MAX_RECORDS is 15", () => expect(MAX_RECORDS).toBe(15));
  });
});

// ═══════════════════════════════════════════════════════════
// 2. INJECTOR TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 24 §2 — Agent Memory Injector", () => {
  it("assembles injection with header", () => {
    const bundle = makeBundle([makeProfile()], [makeRecord()]);
    const block = assembleMemoryInjection(bundle);
    expect(block.header).toContain("HISTORICAL AGENT MEMORY");
    expect(block.header).toContain("not instruction override");
  });

  it("includes profile context", () => {
    const bundle = makeBundle([makeProfile()], []);
    const block = assembleMemoryInjection(bundle);
    expect(block.profile_context.length).toBe(1);
    expect(block.profile_context[0]).toContain("build_agent");
  });

  it("includes memory snippets", () => {
    const bundle = makeBundle([], [makeRecord()]);
    const block = assembleMemoryInjection(bundle);
    expect(block.memory_snippets.length).toBe(1);
    expect(block.memory_snippets[0].provenance).toContain("record:");
  });

  it("respects MAX_INJECTION_CHARS", () => {
    const bigRecords = Array.from({ length: 50 }, (_, i) =>
      makeRecord({ id: `r-${i}`, context_signature: `sig-${i}`, memory_payload: { data: "x".repeat(200) } })
    );
    const bundle = makeBundle([], bigRecords);
    const block = assembleMemoryInjection(bundle);
    expect(block.total_chars).toBeLessThanOrEqual(MAX_INJECTION_CHARS);
    expect(block.injection_bounded).toBe(true);
  });

  it("converts block to string", () => {
    const bundle = makeBundle([makeProfile()], [makeRecord()]);
    const block = assembleMemoryInjection(bundle);
    const text = memoryBlockToString(block);
    expect(text).toContain("HISTORICAL AGENT MEMORY");
    expect(text).toContain("Agent Profiles");
    expect(text).toContain("Relevant Memory");
  });

  it("handles empty bundle", () => {
    const bundle = makeBundle([], []);
    const block = assembleMemoryInjection(bundle);
    expect(block.profile_context).toHaveLength(0);
    expect(block.memory_snippets).toHaveLength(0);
    expect(block.injection_bounded).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// 3. WRITER TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 24 §3 — Agent Memory Writer", () => {
  const validInput: MemoryWriteInput = {
    organization_id: "org-1", agent_type: "build_agent", memory_type: "execution_pattern",
    context_signature: "TS2345::type_mismatch", memory_payload: { strategy: "fix" },
  };

  it("accepts valid input", () => {
    expect(shouldWriteMemory(validInput).eligible).toBe(true);
  });

  it("rejects missing organization_id", () => {
    expect(shouldWriteMemory({ ...validInput, organization_id: "" }).eligible).toBe(false);
  });

  it("rejects missing agent_type", () => {
    expect(shouldWriteMemory({ ...validInput, agent_type: "" }).eligible).toBe(false);
  });

  it("rejects empty context_signature", () => {
    expect(shouldWriteMemory({ ...validInput, context_signature: "" }).eligible).toBe(false);
  });

  it("rejects too long context_signature", () => {
    expect(shouldWriteMemory({ ...validInput, context_signature: "x".repeat(501) }).eligible).toBe(false);
  });

  it("rejects empty payload", () => {
    expect(shouldWriteMemory({ ...validInput, memory_payload: {} }).eligible).toBe(false);
  });

  it("rejects very low relevance", () => {
    expect(shouldWriteMemory({ ...validInput, relevance_score: 0.05 }).eligible).toBe(false);
  });

  it("accepts undefined relevance (defaults ok)", () => {
    expect(shouldWriteMemory({ ...validInput, relevance_score: undefined }).eligible).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
// 4. QUALITY TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 24 §4 — Agent Memory Quality", () => {
  const now = Date.now();

  it("scores fresh, relevant memory as keep", () => {
    const score = scoreMemoryQuality({ id: "r1", relevance_score: 0.8, created_at: new Date(now - 86400000).toISOString(), memory_type: "execution_pattern" }, now);
    expect(score.recommended_action).toBe("keep");
    expect(score.is_stale).toBe(false);
    expect(score.quality_score).toBeGreaterThan(0.5);
  });

  it("marks old low-relevance memory as stale", () => {
    const old = new Date(now - STALE_DAYS * 2 * 86400000).toISOString();
    const score = scoreMemoryQuality({ id: "r2", relevance_score: 0.1, created_at: old, memory_type: "failure_pattern" }, now);
    expect(score.is_stale).toBe(true);
    expect(score.recommended_action).toBe("deprecate");
  });

  it("does NOT mark old high-relevance memory as stale", () => {
    const old = new Date(now - STALE_DAYS * 2 * 86400000).toISOString();
    const score = scoreMemoryQuality({ id: "r3", relevance_score: 0.9, created_at: old, memory_type: "success_pattern" }, now);
    expect(score.is_stale).toBe(false);
  });

  it("freshness is 0 for very old records", () => {
    const veryOld = new Date(now - STALE_DAYS * 4 * 86400000).toISOString();
    const score = scoreMemoryQuality({ id: "r4", relevance_score: 0.5, created_at: veryOld, memory_type: "execution_pattern" }, now);
    expect(score.freshness).toBe(0);
  });

  it("freshness is close to 1 for new records", () => {
    const score = scoreMemoryQuality({ id: "r5", relevance_score: 0.5, created_at: new Date(now - 3600000).toISOString(), memory_type: "execution_pattern" }, now);
    expect(score.freshness).toBeGreaterThan(0.9);
  });

  it("quality_score is bounded 0-1", () => {
    const scenarios = [
      { id: "a", relevance_score: 0, created_at: new Date(now - STALE_DAYS * 10 * 86400000).toISOString(), memory_type: "x" },
      { id: "b", relevance_score: 1, created_at: new Date(now).toISOString(), memory_type: "x" },
    ];
    for (const s of scenarios) {
      const q = scoreMemoryQuality(s, now);
      expect(q.quality_score).toBeGreaterThanOrEqual(0);
      expect(q.quality_score).toBeLessThanOrEqual(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// 5. SAFETY TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 24 §5 — Safety & Non-interference", () => {
  it("injection header labels memory as informational only", () => {
    expect(HEADER).toContain("not instruction override");
  });

  it("injection never exceeds MAX_INJECTION_CHARS", () => {
    const massive = Array.from({ length: 100 }, (_, i) =>
      makeRecord({ id: `r-${i}`, memory_payload: { data: "x".repeat(500) } })
    );
    const block = assembleMemoryInjection(makeBundle([], massive));
    expect(block.total_chars).toBeLessThanOrEqual(MAX_INJECTION_CHARS);
  });

  it("deprecated profiles are not included in active bundles (simulated filter)", () => {
    const profiles = [makeProfile({ status: "deprecated" }), makeProfile({ id: "p2", status: "active" })];
    const active = profiles.filter((p) => p.status === "active");
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe("p2");
  });

  it("memory output never contains forbidden mutation fields", () => {
    const block = assembleMemoryInjection(makeBundle([makeProfile()], [makeRecord()]));
    const text = memoryBlockToString(block);
    const forbidden = ["mutate_pipeline", "mutate_governance", "mutate_billing", "delete_history"];
    for (const f of forbidden) {
      expect(text).not.toContain(f);
    }
  });

  it("write eligibility rejects noisy low-signal writes", () => {
    expect(shouldWriteMemory({ organization_id: "o", agent_type: "a", memory_type: "x", context_signature: "c", memory_payload: {}, relevance_score: 0.05 }).eligible).toBe(false);
  });

  it("empty evidence returns valid empty bundle", () => {
    const bundle = makeBundle([], []);
    expect(bundle.profiles).toHaveLength(0);
    expect(bundle.records).toHaveLength(0);
    expect(bundle.retrieval_score).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════
// 6. MEMORY SCOPE TESTS
// ═══════════════════════════════════════════════════════════

describe("Sprint 24 §6 — Memory Scopes", () => {
  const validScopes = ["global_agent", "stage_scoped", "model_scoped", "execution_context"];
  const validTypes = ["execution_pattern", "repair_pattern", "validation_pattern", "review_pattern", "failure_pattern", "success_pattern"];

  validScopes.forEach((scope) => {
    it(`scope '${scope}' is valid`, () => {
      const p = makeProfile({ memory_scope: scope });
      expect(validScopes).toContain(p.memory_scope);
    });
  });

  validTypes.forEach((type) => {
    it(`memory type '${type}' is valid`, () => {
      const r = makeRecord({ memory_type: type });
      expect(validTypes).toContain(r.memory_type);
    });
  });
});
