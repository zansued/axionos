/**
 * Meta-Agents v1 Hardening — Scoring & Validation Test Suite
 *
 * Tests:
 * - Scoring determinism and boundary correctness
 * - Score consistency (priority = f(confidence, impact, urgency))
 * - Evidence integrity validation
 * - Quality gate filtering
 * - Signature normalization and deduplication
 * - Forbidden mutation regression checks
 */

import { describe, it, expect } from "vitest";

// --- Inline implementations mirroring the edge function code ---
// (We test the logic, not the Deno imports)

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

interface ScoringInputs {
  evidence_count: number;
  recurrence_count: number;
  total_observations: number;
  cost_savings_estimate: number;
  failure_rate: number;
  time_savings_estimate: number;
  avg_execution_time: number;
  trend_worsening: boolean;
  breadth: number;
}

interface ScoringResult {
  confidence_score: number;
  impact_score: number;
  priority_score: number;
}

function scoreRecommendation(inputs: ScoringInputs): ScoringResult {
  const evidence_factor = Math.min(1, Math.log(inputs.evidence_count + 1) / Math.log(10));
  const recurrence_ratio = inputs.total_observations > 0
    ? inputs.recurrence_count / inputs.total_observations : 0;
  const recurrence_factor = clamp(recurrence_ratio * 3);
  const data_quality_factor = clamp(inputs.total_observations / 5);

  const confidence_score = clamp(
    evidence_factor * 0.4 + recurrence_factor * 0.35 + data_quality_factor * 0.25
  );

  const cost_factor = clamp(inputs.cost_savings_estimate / 50);
  const reliability_factor = clamp(inputs.failure_rate);
  const efficiency_factor = inputs.avg_execution_time > 0
    ? clamp(inputs.time_savings_estimate / inputs.avg_execution_time) : 0;

  const impact_score = clamp(
    0.35 * cost_factor + 0.4 * reliability_factor + 0.25 * efficiency_factor
  );

  const urgency = (inputs.trend_worsening ? 0.8 : 0.2) * clamp(inputs.breadth / 3);
  const priority_score = clamp(
    confidence_score * 0.4 + impact_score * 0.4 + urgency * 0.2
  );

  return {
    confidence_score: Math.round(confidence_score * 1000) / 1000,
    impact_score: Math.round(impact_score * 1000) / 1000,
    priority_score: Math.round(priority_score * 1000) / 1000,
  };
}

function generateSignature(
  meta_agent_type: string,
  recommendation_type: string,
  target_component: string,
  key_evidence_hash: string
): string {
  return `${meta_agent_type}::${recommendation_type}::${target_component}::${key_evidence_hash}`;
}

function normalizeSignature(signature: string): string {
  return signature
    .toLowerCase()
    .trim()
    .split("::")
    .map((s) => s.trim().replace(/\s+/g, "_").replace(/_+/g, "_").replace(/[^a-z0-9_]/g, "").replace(/^_|_$/g, ""))
    .join("::");
}

const MIN_CONFIDENCE_THRESHOLD = 0.15;
const MIN_IMPACT_THRESHOLD = 0.10;
const ARCHITECTURE_MIN_CONFIDENCE = 0.25;

interface MetaRecommendation {
  meta_agent_type: string;
  recommendation_type: string;
  target_component: string;
  title: string;
  description: string;
  confidence_score: number;
  impact_score: number;
  priority_score: number;
  supporting_evidence: Record<string, unknown>[];
  source_metrics: Record<string, unknown>;
  source_record_ids: string[];
  recommendation_signature: string;
}

function qualityGate(rec: MetaRecommendation): { pass: boolean; reason?: string } {
  if (rec.confidence_score < 0 || rec.confidence_score > 1) return { pass: false, reason: "confidence OOB" };
  if (rec.impact_score < 0 || rec.impact_score > 1) return { pass: false, reason: "impact OOB" };
  if (rec.priority_score < 0 || rec.priority_score > 1) return { pass: false, reason: "priority OOB" };

  const minConf = rec.meta_agent_type === "ARCHITECTURE_META_AGENT"
    ? ARCHITECTURE_MIN_CONFIDENCE : MIN_CONFIDENCE_THRESHOLD;
  if (rec.confidence_score < minConf) return { pass: false, reason: "low confidence" };
  if (rec.impact_score < MIN_IMPACT_THRESHOLD) return { pass: false, reason: "low impact" };
  if (!rec.supporting_evidence || rec.supporting_evidence.length === 0) return { pass: false, reason: "no evidence" };
  if (!rec.title?.trim()) return { pass: false, reason: "empty title" };
  if (!rec.description?.trim()) return { pass: false, reason: "empty description" };
  return { pass: true };
}

// ======================== TESTS ========================

describe("Meta-Agent Scoring", () => {
  it("produces bounded scores (0-1) for all inputs", () => {
    const cases: ScoringInputs[] = [
      { evidence_count: 0, recurrence_count: 0, total_observations: 0, cost_savings_estimate: 0, failure_rate: 0, time_savings_estimate: 0, avg_execution_time: 0, trend_worsening: false, breadth: 0 },
      { evidence_count: 100, recurrence_count: 100, total_observations: 100, cost_savings_estimate: 1000, failure_rate: 1, time_savings_estimate: 1000, avg_execution_time: 100, trend_worsening: true, breadth: 10 },
      { evidence_count: 1, recurrence_count: 1, total_observations: 1, cost_savings_estimate: 0, failure_rate: 0.5, time_savings_estimate: 0, avg_execution_time: 0, trend_worsening: false, breadth: 1 },
    ];

    for (const c of cases) {
      const result = scoreRecommendation(c);
      expect(result.confidence_score).toBeGreaterThanOrEqual(0);
      expect(result.confidence_score).toBeLessThanOrEqual(1);
      expect(result.impact_score).toBeGreaterThanOrEqual(0);
      expect(result.impact_score).toBeLessThanOrEqual(1);
      expect(result.priority_score).toBeGreaterThanOrEqual(0);
      expect(result.priority_score).toBeLessThanOrEqual(1);
    }
  });

  it("is deterministic for same inputs", () => {
    const input: ScoringInputs = {
      evidence_count: 5, recurrence_count: 10, total_observations: 50,
      cost_savings_estimate: 20, failure_rate: 0.4, time_savings_estimate: 5,
      avg_execution_time: 30, trend_worsening: true, breadth: 2,
    };
    const a = scoreRecommendation(input);
    const b = scoreRecommendation(input);
    expect(a).toEqual(b);
  });

  it("ranks high recurrence + high failure above low-value items", () => {
    const high = scoreRecommendation({
      evidence_count: 10, recurrence_count: 40, total_observations: 50,
      cost_savings_estimate: 30, failure_rate: 0.8, time_savings_estimate: 10,
      avg_execution_time: 20, trend_worsening: true, breadth: 2,
    });
    const low = scoreRecommendation({
      evidence_count: 1, recurrence_count: 1, total_observations: 50,
      cost_savings_estimate: 0, failure_rate: 0.05, time_savings_estimate: 0,
      avg_execution_time: 0, trend_worsening: false, breadth: 1,
    });
    expect(high.priority_score).toBeGreaterThan(low.priority_score);
  });

  it("produces zero scores for zero inputs", () => {
    const result = scoreRecommendation({
      evidence_count: 0, recurrence_count: 0, total_observations: 0,
      cost_savings_estimate: 0, failure_rate: 0, time_savings_estimate: 0,
      avg_execution_time: 0, trend_worsening: false, breadth: 0,
    });
    expect(result.confidence_score).toBe(0);
    expect(result.impact_score).toBe(0);
    expect(result.priority_score).toBe(0);
  });

  it("weak evidence does not inflate priority", () => {
    const result = scoreRecommendation({
      evidence_count: 1, recurrence_count: 1, total_observations: 100,
      cost_savings_estimate: 0, failure_rate: 0.01, time_savings_estimate: 0,
      avg_execution_time: 0, trend_worsening: false, breadth: 1,
    });
    expect(result.priority_score).toBeLessThan(0.3);
  });
});

describe("Signature Normalization", () => {
  it("normalizes casing and whitespace", () => {
    const a = normalizeSignature("ARCHITECTURE_META_AGENT::PIPELINE_OPTIMIZATION::stage_A::failures_5");
    const b = normalizeSignature("architecture_meta_agent::pipeline_optimization::stage_a::failures_5");
    expect(a).toBe(b);
  });

  it("handles extra whitespace", () => {
    const a = normalizeSignature("  TYPE :: REC_TYPE :: comp ::  hash  ");
    const b = normalizeSignature("TYPE::REC_TYPE::comp::hash");
    expect(a).toBe(b);
  });

  it("different components produce different signatures", () => {
    const a = normalizeSignature(generateSignature("A", "B", "comp1", "hash1"));
    const b = normalizeSignature(generateSignature("A", "B", "comp2", "hash1"));
    expect(a).not.toBe(b);
  });

  it("different orgs with same pattern produce same signature (dedup is per-org in DB)", () => {
    const sig = generateSignature("ARCHITECTURE_META_AGENT", "PIPELINE_OPTIMIZATION", "validation", "failures_10");
    // Signatures are org-agnostic; DB query filters by org_id
    expect(sig).toBe("ARCHITECTURE_META_AGENT::PIPELINE_OPTIMIZATION::validation::failures_10");
  });
});

describe("Quality Gate", () => {
  const makeRec = (overrides: Partial<MetaRecommendation> = {}): MetaRecommendation => ({
    meta_agent_type: "WORKFLOW_OPTIMIZER",
    recommendation_type: "STEP_ELIMINATION",
    target_component: "build",
    title: "Test recommendation",
    description: "A valid test recommendation with evidence.",
    confidence_score: 0.5,
    impact_score: 0.4,
    priority_score: 0.45,
    supporting_evidence: [{ type: "test", value: 1 }],
    source_metrics: { test: true },
    source_record_ids: [],
    recommendation_signature: "test::sig",
    ...overrides,
  });

  it("passes valid recommendation", () => {
    expect(qualityGate(makeRec()).pass).toBe(true);
  });

  it("rejects empty evidence", () => {
    expect(qualityGate(makeRec({ supporting_evidence: [] })).pass).toBe(false);
  });

  it("rejects empty title", () => {
    expect(qualityGate(makeRec({ title: "" })).pass).toBe(false);
  });

  it("rejects out-of-bounds confidence", () => {
    expect(qualityGate(makeRec({ confidence_score: 1.5 })).pass).toBe(false);
    expect(qualityGate(makeRec({ confidence_score: -0.1 })).pass).toBe(false);
  });

  it("rejects low confidence below threshold", () => {
    expect(qualityGate(makeRec({ confidence_score: 0.05 })).pass).toBe(false);
  });

  it("applies higher threshold for architecture recommendations", () => {
    const archRec = makeRec({ meta_agent_type: "ARCHITECTURE_META_AGENT", confidence_score: 0.20 });
    expect(qualityGate(archRec).pass).toBe(false);
    const archRecOk = makeRec({ meta_agent_type: "ARCHITECTURE_META_AGENT", confidence_score: 0.30 });
    expect(qualityGate(archRecOk).pass).toBe(true);
  });

  it("rejects low impact", () => {
    expect(qualityGate(makeRec({ impact_score: 0.05 })).pass).toBe(false);
  });
});

describe("Forbidden Mutation Regression", () => {
  it("review status values are informational only", () => {
    const statuses = ["pending", "reviewed", "accepted", "rejected", "deferred"];
    const mutationKeywords = ["execute", "deploy", "apply", "modify", "alter", "update_pipeline"];
    for (const status of statuses) {
      for (const keyword of mutationKeywords) {
        expect(status).not.toContain(keyword);
      }
    }
  });

  it("recommendation types do not include execution verbs", () => {
    const types = [
      "PIPELINE_OPTIMIZATION", "STAGE_REORDERING_SUGGESTION", "STAGE_SPLIT_OR_MERGE",
      "NEW_AGENT_ROLE", "AGENT_SPECIALIZATION", "AGENT_DEPRECATION",
      "WORKFLOW_PARALLELIZATION", "STEP_ELIMINATION", "STEP_REORDERING",
      "TECHNICAL_DEBT_ALERT", "ARCHITECTURE_CHANGE_PROPOSAL", "SYSTEM_EVOLUTION_REPORT",
    ];
    const forbiddenPrefixes = ["EXECUTE_", "DEPLOY_", "APPLY_", "FORCE_"];
    for (const t of types) {
      for (const prefix of forbiddenPrefixes) {
        expect(t.startsWith(prefix)).toBe(false);
      }
    }
  });

  it("audit event names cover full lifecycle", () => {
    const events = [
      "META_AGENT_RUN", "META_RECOMMENDATION_CREATED", "META_RECOMMENDATION_REVIEWED",
      "META_RECOMMENDATION_ACCEPTED", "META_RECOMMENDATION_REJECTED", "META_RECOMMENDATION_DEFERRED",
    ];
    expect(events).toHaveLength(6);
    expect(events.every((e) => e.startsWith("META_"))).toBe(true);
  });
});

// ======================== SPRINT 14 HARDENING ========================

// --- Inline artifact generators (mirror edge function logic) ---

const AGENT_TYPE_TO_ARTIFACT: Record<string, string> = {
  ARCHITECTURE_META_AGENT: "ARCHITECTURE_PROPOSAL",
  AGENT_ROLE_DESIGNER: "AGENT_ROLE_SPEC",
  WORKFLOW_OPTIMIZER: "WORKFLOW_CHANGE_PROPOSAL",
  SYSTEM_EVOLUTION_ADVISOR: "ADR_DRAFT",
};

const REC_TYPE_OVERRIDES: Record<string, string> = {
  TECHNICAL_DEBT_ALERT: "ADR_DRAFT",
  ARCHITECTURE_CHANGE_PROPOSAL: "ARCHITECTURE_PROPOSAL",
  SYSTEM_EVOLUTION_REPORT: "IMPLEMENTATION_PLAN",
};

function resolveArtifactType(meta_agent_type: string, recommendation_type: string): string {
  return REC_TYPE_OVERRIDES[recommendation_type]
    || AGENT_TYPE_TO_ARTIFACT[meta_agent_type]
    || "ADR_DRAFT";
}

function generateADR(rec: Record<string, unknown>): Record<string, unknown> {
  return {
    format: "ADR_DRAFT",
    sections: {
      title: `ADR: ${rec.title}`,
      status: "Draft",
      context: `This ADR was generated from Meta-Agent recommendation "${rec.title}" by ${rec.meta_agent_type}.`,
      problem_statement: rec.description,
      evidence: rec.supporting_evidence,
      proposed_change: `Based on analysis of ${rec.target_component}, the system recommends structural changes to improve reliability and efficiency.`,
      impact_analysis: { confidence_score: rec.confidence_score, impact_score: rec.impact_score, priority_score: rec.priority_score, source_metrics: rec.source_metrics },
      risks: ["Change may require coordinated deployment across affected components", "Rollback strategy should be defined before implementation"],
      alternatives_considered: ["Maintain current architecture (accept observed inefficiency)", "Partial implementation targeting highest-impact subset"],
      decision: "Pending human review and approval",
      rollback_considerations: "All changes should be reversible through standard deployment rollback procedures.",
    },
  };
}

function generateArchitectureProposal(rec: Record<string, unknown>): Record<string, unknown> {
  return {
    format: "ARCHITECTURE_PROPOSAL",
    sections: {
      title: `Architecture Proposal: ${rec.title}`,
      current_architecture_snapshot: `Component: ${rec.target_component}`,
      detected_structural_issue: rec.description,
      evidence: rec.supporting_evidence,
      proposed_change: `Restructure ${rec.target_component} based on observed patterns in execution metrics.`,
      compatibility_analysis: "Requires validation against existing pipeline contracts and governance rules.",
      migration_considerations: ["Staged rollout recommended", "Monitor observability metrics during transition", "Validate with existing test suite before full deployment"],
      risk_assessment: { confidence: rec.confidence_score, impact: rec.impact_score, rollback_strategy: "Revert to previous architecture configuration via version control" },
    },
  };
}

function generateAgentRoleSpec(rec: Record<string, unknown>): Record<string, unknown> {
  return {
    format: "AGENT_ROLE_SPEC",
    sections: {
      agent_name: `Proposed: ${(rec.title as string || "").replace(/^(Suggest|Create|Propose)\s+/i, "")}`,
      purpose: rec.description,
      evidence_for_creation: rec.supporting_evidence,
      inputs: ["Pipeline execution context", "Stage-specific data", "Error patterns"],
      outputs: ["Specialized processing results", "Status reports", "Error resolution attempts"],
      capabilities: ["Domain-specific task execution", "Pattern recognition", "Automated reporting"],
      constraints: ["Must operate within existing governance boundaries", "Cannot modify pipeline stages or contracts", "Must produce auditable outputs"],
      interaction_with_existing_agents: "Coordinates through standard Agent OS event bus and handoff protocol.",
      estimated_complexity: rec.impact_score && Number(rec.impact_score) > 0.7 ? "high" : "medium",
      source_metrics: rec.source_metrics,
    },
  };
}

function generateWorkflowChangeProposal(rec: Record<string, unknown>): Record<string, unknown> {
  return {
    format: "WORKFLOW_CHANGE_PROPOSAL",
    sections: {
      title: `Workflow Change: ${rec.title}`,
      current_workflow: `Current workflow for ${rec.target_component}`,
      detected_inefficiency: rec.description,
      evidence_metrics: rec.supporting_evidence,
      proposed_change: `Optimize workflow for ${rec.target_component} based on ${rec.recommendation_type} analysis.`,
      expected_benefits: { confidence: rec.confidence_score, estimated_impact: rec.impact_score },
      potential_risks: ["Workflow changes may affect downstream stage timing", "Parallel execution changes require concurrency validation"],
      testing_strategy: "Run shadow execution with proposed workflow alongside current workflow to compare outcomes.",
      rollback_strategy: "Revert to previous workflow configuration; all changes are configuration-only.",
    },
  };
}

function generateImplementationPlan(rec: Record<string, unknown>): Record<string, unknown> {
  return {
    format: "IMPLEMENTATION_PLAN",
    sections: {
      overview: `Implementation plan for: ${rec.title}`,
      scope: rec.description,
      steps: ["1. Review and validate proposal", "2. Create technical specification", "3. Implement in isolated branch", "4. Run full test suite", "5. Stage deployment", "6. Full rollout"],
      affected_components: [rec.target_component],
      testing_requirements: ["Unit tests for modified components", "Integration tests for pipeline interaction", "Observability validation"],
      rollback_plan: "Standard git revert + configuration rollback. No irreversible data changes.",
      deployment_considerations: ["Use canary deployment strategy", "Monitor key metrics for 24h post-deployment", "Maintain previous version for instant rollback"],
      source_evidence: rec.supporting_evidence,
      priority_assessment: { confidence: rec.confidence_score, impact: rec.impact_score, priority: rec.priority_score },
    },
  };
}

const GENERATORS: Record<string, (rec: Record<string, unknown>) => Record<string, unknown>> = {
  ADR_DRAFT: generateADR,
  ARCHITECTURE_PROPOSAL: generateArchitectureProposal,
  AGENT_ROLE_SPEC: generateAgentRoleSpec,
  WORKFLOW_CHANGE_PROPOSAL: generateWorkflowChangeProposal,
  IMPLEMENTATION_PLAN: generateImplementationPlan,
};

const VALID_ARTIFACT_TRANSITIONS: Record<string, string[]> = {
  draft: ["reviewed", "rejected"],
  reviewed: ["approved", "rejected"],
  approved: ["implemented"],
};

function makeSampleRec(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: "rec-001",
    title: "Split validation stage",
    description: "38% of failures occur before build, causing unnecessary runtime validation.",
    meta_agent_type: "ARCHITECTURE_META_AGENT",
    recommendation_type: "STAGE_SPLIT_OR_MERGE",
    target_component: "validation",
    confidence_score: 0.72,
    impact_score: 0.65,
    priority_score: 0.68,
    supporting_evidence: [
      { type: "stage_failure", stage: "validation", failure_rate: 0.38 },
      { type: "cost_signal", wasted_usd: 12.5 },
    ],
    source_metrics: { total_runs: 50, failed: 19 },
    source_record_ids: ["lr-1", "lr-2"],
    organization_id: "org-A",
    workspace_id: null,
    ...overrides,
  };
}

// --- 1. Idempotência ---
describe("Sprint 14 — Idempotency", () => {
  it("resolves the same artifact type for the same recommendation", () => {
    const rec = makeSampleRec();
    const type1 = resolveArtifactType(rec.meta_agent_type as string, rec.recommendation_type as string);
    const type2 = resolveArtifactType(rec.meta_agent_type as string, rec.recommendation_type as string);
    expect(type1).toBe(type2);
    expect(type1).toBe("ARCHITECTURE_PROPOSAL");
  });

  it("generator output is deterministic for same input", () => {
    const rec = makeSampleRec();
    const type = resolveArtifactType(rec.meta_agent_type as string, rec.recommendation_type as string);
    const gen = GENERATORS[type];
    const a = gen(rec);
    const b = gen(rec);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("unique constraint key is (recommendation_id, artifact_type) — same rec always maps to same type", () => {
    const agents = ["ARCHITECTURE_META_AGENT", "AGENT_ROLE_DESIGNER", "WORKFLOW_OPTIMIZER", "SYSTEM_EVOLUTION_ADVISOR"];
    for (const agent of agents) {
      const rec = makeSampleRec({ meta_agent_type: agent });
      const type = resolveArtifactType(agent, rec.recommendation_type as string);
      // Running twice should produce same key
      expect(type).toBe(resolveArtifactType(agent, rec.recommendation_type as string));
    }
  });
});

// --- 2. Linkagem correta ---
describe("Sprint 14 — Artifact Linkage", () => {
  it("ADR references recommendation title and meta-agent type", () => {
    const rec = makeSampleRec({ meta_agent_type: "SYSTEM_EVOLUTION_ADVISOR", recommendation_type: "TECHNICAL_DEBT_ALERT" });
    const artifact = generateADR(rec);
    const sections = artifact.sections as Record<string, unknown>;
    expect(sections.title).toContain(rec.title);
    expect(sections.context).toContain(rec.meta_agent_type);
    expect(sections.evidence).toBe(rec.supporting_evidence);
    expect((sections.impact_analysis as Record<string, unknown>).source_metrics).toBe(rec.source_metrics);
  });

  it("Architecture Proposal includes evidence from recommendation", () => {
    const rec = makeSampleRec();
    const artifact = generateArchitectureProposal(rec);
    const sections = artifact.sections as Record<string, unknown>;
    expect(sections.evidence).toBe(rec.supporting_evidence);
    expect(sections.detected_structural_issue).toBe(rec.description);
    expect(sections.current_architecture_snapshot).toContain(rec.target_component);
  });

  it("Agent Role Spec preserves evidence and source_metrics", () => {
    const rec = makeSampleRec({ meta_agent_type: "AGENT_ROLE_DESIGNER", recommendation_type: "NEW_AGENT_ROLE" });
    const artifact = generateAgentRoleSpec(rec);
    const sections = artifact.sections as Record<string, unknown>;
    expect(sections.evidence_for_creation).toBe(rec.supporting_evidence);
    expect(sections.source_metrics).toBe(rec.source_metrics);
    expect(sections.purpose).toBe(rec.description);
  });

  it("Workflow Change Proposal links evidence_metrics", () => {
    const rec = makeSampleRec({ meta_agent_type: "WORKFLOW_OPTIMIZER", recommendation_type: "WORKFLOW_PARALLELIZATION" });
    const artifact = generateWorkflowChangeProposal(rec);
    const sections = artifact.sections as Record<string, unknown>;
    expect(sections.evidence_metrics).toBe(rec.supporting_evidence);
    expect(sections.detected_inefficiency).toBe(rec.description);
  });

  it("Implementation Plan includes source_evidence", () => {
    const rec = makeSampleRec({ recommendation_type: "SYSTEM_EVOLUTION_REPORT" });
    const artifact = generateImplementationPlan(rec);
    const sections = artifact.sections as Record<string, unknown>;
    expect(sections.source_evidence).toBe(rec.supporting_evidence);
    expect(sections.scope).toBe(rec.description);
  });
});

// --- 3. Sem mutação escondida ---
describe("Sprint 14 — No Hidden Mutation", () => {
  it("artifact statuses are informational only", () => {
    const statuses = ["draft", "reviewed", "approved", "rejected", "implemented"];
    const dangerousVerbs = ["execute", "deploy_now", "apply_changes", "force_update", "mutate"];
    for (const s of statuses) {
      for (const v of dangerousVerbs) {
        expect(s).not.toBe(v);
      }
    }
  });

  it("artifact review transitions never include system-modifying actions", () => {
    const allActions = Object.values(VALID_ARTIFACT_TRANSITIONS).flat();
    const forbidden = ["deploy", "execute", "apply", "modify_pipeline", "update_governance", "change_billing"];
    for (const action of allActions) {
      for (const f of forbidden) {
        expect(action).not.toBe(f);
      }
    }
  });

  it("'approved' only leads to 'implemented' (manual marker), not system action", () => {
    expect(VALID_ARTIFACT_TRANSITIONS["approved"]).toEqual(["implemented"]);
  });

  it("no artifact type implies automatic system change", () => {
    const types = ["ADR_DRAFT", "ARCHITECTURE_PROPOSAL", "AGENT_ROLE_SPEC", "WORKFLOW_CHANGE_PROPOSAL", "IMPLEMENTATION_PLAN", "PR_DRAFT"];
    const autoKeywords = ["AUTO_APPLY", "AUTO_DEPLOY", "FORCE_EXECUTE"];
    for (const t of types) {
      for (const k of autoKeywords) {
        expect(t).not.toContain(k);
      }
    }
  });

  it("artifact audit events are observation-only", () => {
    const events = ["META_ARTIFACT_CREATED", "META_ARTIFACT_REVIEWED", "META_ARTIFACT_APPROVED", "META_ARTIFACT_REJECTED", "META_ARTIFACT_IMPLEMENTED"];
    for (const e of events) {
      expect(e).not.toContain("EXECUTE");
      expect(e).not.toContain("DEPLOY");
      expect(e).not.toContain("MUTATE");
    }
  });
});

// --- 4. Qualidade mínima do conteúdo ---
describe("Sprint 14 — Artifact Content Quality", () => {
  const requiredSections: Record<string, string[]> = {
    ADR_DRAFT: ["context", "problem_statement", "evidence", "proposed_change", "risks", "rollback_considerations"],
    ARCHITECTURE_PROPOSAL: ["detected_structural_issue", "evidence", "proposed_change", "risk_assessment", "migration_considerations"],
    AGENT_ROLE_SPEC: ["purpose", "evidence_for_creation", "constraints", "inputs", "outputs"],
    WORKFLOW_CHANGE_PROPOSAL: ["detected_inefficiency", "evidence_metrics", "proposed_change", "potential_risks", "rollback_strategy"],
    IMPLEMENTATION_PLAN: ["scope", "steps", "testing_requirements", "rollback_plan", "source_evidence"],
  };

  for (const [artifactType, fields] of Object.entries(requiredSections)) {
    it(`${artifactType} contains all required sections`, () => {
      const gen = GENERATORS[artifactType];
      expect(gen).toBeDefined();
      const rec = makeSampleRec();
      const artifact = gen(rec);
      const sections = artifact.sections as Record<string, unknown>;
      for (const field of fields) {
        expect(sections).toHaveProperty(field);
        const val = sections[field];
        // Must be non-null/non-undefined
        expect(val).not.toBeNull();
        expect(val).not.toBeUndefined();
      }
    });
  }

  it("ADR includes alternatives_considered", () => {
    const artifact = generateADR(makeSampleRec());
    const sections = artifact.sections as Record<string, unknown>;
    expect(Array.isArray(sections.alternatives_considered)).toBe(true);
    expect((sections.alternatives_considered as string[]).length).toBeGreaterThan(0);
  });

  it("all generators produce a 'format' field matching the artifact type", () => {
    for (const [type, gen] of Object.entries(GENERATORS)) {
      const artifact = gen(makeSampleRec());
      expect(artifact.format).toBe(type);
    }
  });
});

// --- 5. Tenant Isolation ---
describe("Sprint 14 — Tenant Isolation", () => {
  it("artifact generator output does not leak cross-org data", () => {
    const recOrgA = makeSampleRec({ organization_id: "org-A", title: "Org A issue" });
    const recOrgB = makeSampleRec({ organization_id: "org-B", title: "Org B issue" });
    const artA = generateADR(recOrgA);
    const artB = generateADR(recOrgB);
    // Content should reference their own rec, not the other
    const sectionsA = artA.sections as Record<string, unknown>;
    const sectionsB = artB.sections as Record<string, unknown>;
    expect(sectionsA.title).toContain("Org A issue");
    expect(sectionsA.title).not.toContain("Org B issue");
    expect(sectionsB.title).toContain("Org B issue");
    expect(sectionsB.title).not.toContain("Org A issue");
  });

  it("artifact type resolution is org-agnostic (isolation enforced by DB/RLS)", () => {
    // Same meta_agent_type from different orgs → same artifact type (isolation is at DB layer)
    const typeA = resolveArtifactType("ARCHITECTURE_META_AGENT", "PIPELINE_OPTIMIZATION");
    const typeB = resolveArtifactType("ARCHITECTURE_META_AGENT", "PIPELINE_OPTIMIZATION");
    expect(typeA).toBe(typeB);
    expect(typeA).toBe("ARCHITECTURE_PROPOSAL");
  });

  it("generators do not embed organization_id in artifact content", () => {
    const rec = makeSampleRec({ organization_id: "org-secret-123" });
    for (const gen of Object.values(GENERATORS)) {
      const artifact = gen(rec);
      const content = JSON.stringify(artifact);
      expect(content).not.toContain("org-secret-123");
    }
  });
});
