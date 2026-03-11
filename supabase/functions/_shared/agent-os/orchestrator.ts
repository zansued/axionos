// Agent OS — Orchestrator (Kernel)
// Runs the cognitive pipeline: intake → perception → design → build → validation → evolution → done
// Handles stage transitions, agent dispatch, validation scoring, and rollback.
//
// Sprint 122: Canon retrieval integrated before agent dispatch.
// Sprint 140: Policy enforcement integrated before agent dispatch.
// Sprint 141: Readiness gate integrated before policy evaluation.
//
// Operational Decision Chain enforced:
//   Canon informs → Readiness evaluates → Policy constrains →
//   Action Engine formalizes → AgentOS orchestrates → Executors act

import type {
  AgentDefinition,
  RunState,
  StageName,
  StagePolicy,
  WorkInput,
} from "./types.ts";
import { AgentRegistry } from "./registry.ts";
import { EventBus } from "./event-bus.ts";
import { RuntimeMemory } from "./memory.ts";
import { scoreArtifacts, averageScore } from "./scoring.ts";
import { cryptoRandomId, nowIso } from "./utils.ts";

// Sprint 122 — Canon integration
import {
  buildCanonRetrievalRequest,
  retrieveCanonKnowledge,
  injectCanonIntoWorkInput,
  buildCanonTraceRecord,
  extractCanonConsumption,
  buildCanonConsumptionTrace,
  type CanonTraceRecord,
  type CanonConsumptionReport,
  type CanonConsumptionTrace,
  type CanonKnowledgePacket,
} from "./canon-orchestrator-integration.ts";

// Sprint 141 — Canon application scoring
import {
  scoreCanonApplication,
  buildCanonApplicationStageSummary,
  type CanonApplicationScore,
  type CanonApplicationStageSummary,
  type ExecutionOutcomeSignals,
} from "./canon-application-scoring.ts";

// Sprint 140 — Policy enforcement
import {
  evaluatePolicy,
  createApprovalRequest,
  type PolicyEnforcementResult,
  type PolicyTraceRecord,
  type ApprovalRequest,
} from "./policy-orchestrator-integration.ts";

// Sprint 141 — Readiness gate
import {
  evaluateReadiness,
  buildReadinessTraceRecord,
  type ReadinessGateResult,
  type ReadinessTraceRecord,
} from "./readiness-orchestrator-integration.ts";

// Sprint 142 — Decision Contract
import {
  buildDispatchDecision,
  validateDecision,
  type DispatchDecision,
} from "./decision-contract.ts";

export interface OrchestratorOptions {
  registry: AgentRegistry;
  policies: StagePolicy[];
  eventBus?: EventBus;
  maxRollbacks?: number;
  /** Sprint 139: Supabase client for real Canon retrieval */
  supabaseClient?: unknown;
}

export class AgentOS {
  private registry: AgentRegistry;
  private policies: StagePolicy[];
  private eventBus: EventBus;
  private maxRollbacks: number;
  private supabaseClient?: unknown;

  constructor(options: OrchestratorOptions) {
    this.registry = options.registry;
    this.policies = options.policies;
    this.eventBus = options.eventBus ?? new EventBus();
    this.maxRollbacks = options.maxRollbacks ?? 3;
    this.supabaseClient = options.supabaseClient;
  }

  async run(input: WorkInput): Promise<RunState> {
    const runId = cryptoRandomId();
    const memory = new RuntimeMemory();

    const state: RunState = {
      id: runId,
      stage: "intake",
      input,
      artifacts: input.artifacts ? [...input.artifacts] : [],
      events: [],
      status: "running",
    };

    this.emit(state, "run.created", { runId, goal: input.goal });

    let currentStage: StageName = "perception";
    let rollbackCount = 0;

    while (currentStage !== "done") {
      const policy = this.policies.find((p) => p.stage === currentStage);
      if (!policy) {
        throw new Error(`[AgentOS] Missing stage policy: ${currentStage}`);
      }

      state.stage = currentStage;
      this.emit(state, "stage.started", { runId, stage: currentStage });

      // ────────────────────────────────────────────────────
      // Sprint 122: Canon Retrieval (Canon informs)
      // ────────────────────────────────────────────────────
      let enrichedInput = { ...input, artifacts: state.artifacts };
      let canonTrace: CanonTraceRecord | null = null;

      try {
        const canonRequest = buildCanonRetrievalRequest(currentStage, input);
        const canonResult = await retrieveCanonKnowledge(canonRequest, this.supabaseClient as any);
        enrichedInput = injectCanonIntoWorkInput(enrichedInput, canonResult);
        canonTrace = buildCanonTraceRecord(currentStage, canonResult);

        this.emit(state, "stage.started", {
          runId,
          stage: currentStage,
          canon_retrieval: {
            attempted: true,
            success: canonResult.success,
            entries_retrieved: canonResult.entries_retrieved,
            categories_used: canonResult.categories_used,
          },
        });
      } catch {
        // Safe fallback: Canon retrieval failure must not block execution
        canonTrace = {
          canon_retrieval_attempted: true,
          canon_retrieval_success: false,
          entries_retrieved: 0,
          pattern_ids_used: [],
          categories_used: [],
          average_confidence: 0,
          stage: currentStage,
          timestamp: nowIso(),
          error: "Canon retrieval failed — continuing without canon context",
        };

        this.emit(state, "stage.started", {
          runId,
          stage: currentStage,
          canon_retrieval: { attempted: true, success: false, error: "retrieval_failed" },
        });
      }

      // ────────────────────────────────────────────────────
      // Sprint 141: Readiness Gate (Readiness evaluates)
      // ────────────────────────────────────────────────────
      const readinessResult = evaluateReadiness(currentStage, enrichedInput);
      const readinessTrace = buildReadinessTraceRecord(readinessResult);

      this.emit(state, "stage.started", {
        runId,
        stage: currentStage,
        readiness_gate: {
          readiness_score: readinessResult.readiness_score,
          can_proceed: readinessResult.can_proceed,
          blocker_count: readinessResult.blockers.length,
          warning_count: readinessResult.warnings.length,
          blocker_keys: readinessResult.blockers.map((b) => b.key),
        },
      });

      // Gate: block stage if required checks fail
      if (!readinessResult.can_proceed) {
        state.status = "blocked";
        this.emit(state, "stage.completed", {
          runId,
          stage: currentStage,
          failed: true,
          reason: "readiness_blocked",
          readiness_trace: readinessTrace,
          canon_trace: canonTrace,
          blockers: readinessResult.blockers.map((b) => ({
            key: b.key,
            label: b.label,
            explanation: b.explanation,
            action: b.action,
          })),
          next_required_action: readinessResult.next_required_action,
        });
        return state;
      }

      // ────────────────────────────────────────────────────
      // Sprint 140: Policy Enforcement (Policy constrains)
      // ────────────────────────────────────────────────────
      const policyResult = evaluatePolicy(runId, currentStage, enrichedInput);
      const policyTrace: PolicyTraceRecord = policyResult.trace;

      this.emit(state, "stage.started", {
        runId,
        stage: currentStage,
        policy_enforcement: {
          execution_mode: policyResult.execution_mode,
          verdict: policyResult.decision.verdict,
          rules_triggered: policyTrace.rules_triggered,
          risk_level: policyTrace.risk_level,
          allowed: policyResult.allowed,
        },
      });

      // Enforce execution mode
      if (policyResult.execution_mode === "blocked") {
        state.status = "failed";
        this.emit(state, "run.completed", {
          runId,
          status: "failed",
          reason: "policy_blocked",
          policy_trace: policyTrace,
          canon_trace: canonTrace,
        });
        return state;
      }

      if (policyResult.execution_mode === "manual_only") {
        state.status = "blocked";
        this.emit(state, "stage.completed", {
          runId,
          stage: currentStage,
          failed: true,
          reason: "manual_only — dispatch stopped",
          policy_trace: policyTrace,
        });
        return state;
      }

      let approvalRequest: ApprovalRequest | null = null;
      if (policyResult.execution_mode === "approval_required") {
        approvalRequest = createApprovalRequest(runId, currentStage, policyResult);
        this.emit(state, "stage.started", {
          runId,
          stage: currentStage,
          approval_request: approvalRequest,
        });
        // In a real system, this would pause and wait for approval.
        // For now, we log the request and continue (approval placeholder).
      }

      // ────────────────────────────────────────────────────
      // Agent Selection & Dispatch (via Decision Contract)
      // ────────────────────────────────────────────────────
      const candidates = this.registry.findForStage(currentStage, enrichedInput);

      const selected = candidates.filter((a) =>
        policy.requiredTypes.includes(a.type),
      );

      if (!selected.length) {
        state.status = "failed";
        throw new Error(`[AgentOS] No agents for stage: ${currentStage}`);
      }

      // Sprint 142: Build formal dispatch decision
      const decision = buildDispatchDecision({
        run_id: runId,
        initiative_id: (input.context?.initiative_id as string) || undefined,
        stage: currentStage,
        selected_agents: selected,
        canon_trace: canonTrace,
        readiness_trace: readinessTrace,
        policy_result: policyResult,
        approval_request: approvalRequest,
        input: enrichedInput,
      });

      const decisionError = validateDecision(decision);
      if (decisionError) {
        state.status = "failed";
        this.emit(state, "run.completed", {
          runId,
          status: "failed",
          reason: `invalid_decision: ${decisionError}`,
        });
        return state;
      }

      this.emit(state, "stage.started", {
        runId,
        stage: currentStage,
        dispatch_decision: {
          decision_id: decision.decision_id,
          execution_mode: decision.execution_mode,
          agents: decision.selected_agents.map((a) => a.agent_id),
          constraints_count: decision.constraints.length,
          rationale: decision.rationale,
        },
      });

      // ── Execute agents (with enriched input + decision trace) ──
      const availablePacketIds = (enrichedInput.context?.canon_pattern_ids as string[]) || [];

      const { failed: stageFailed, consumptionReports } = await this.executeAgentsWithCanon(
        selected,
        state,
        enrichedInput,
        runId,
        currentStage,
        memory,
        availablePacketIds,
      );

      // ── Sprint 140: Build Canon consumption trace ──
      const consumptionTrace = buildCanonConsumptionTrace(
        runId,
        currentStage,
        consumptionReports,
        availablePacketIds,
      );

      this.emit(state, "stage.completed", {
        runId,
        stage: currentStage,
        canon_consumption: {
          usage_mode: consumptionTrace.aggregated_usage_mode,
          packets_available: consumptionTrace.total_packets_available,
          packets_used: consumptionTrace.total_packets_used,
          packets_ignored: consumptionTrace.total_packets_ignored,
          usage_rate: consumptionTrace.usage_rate,
        },
      });

      // ── Validation scoring ──
      let validationFailed = false;
      if (currentStage === "validation") {
        const score = scoreArtifacts(state.artifacts, input.goal);
        state.score = score;
        const avg = averageScore(score);

        if (policy.minSuccessScore && avg < policy.minSuccessScore) {
          validationFailed = true;
          this.emit(state, "validation.failed", {
            runId,
            score,
            average: avg,
            minRequired: policy.minSuccessScore,
          });
        }
      }

      const failed = stageFailed || validationFailed;

      // ── Sprint 141: Canon Application Quality Scoring ──
      const outcomeSignals: ExecutionOutcomeSignals = {
        execution_succeeded: !failed,
        retries_needed: rollbackCount,
        repair_triggered: currentStage === "evolution",
        stage_passed_cleanly: !failed && rollbackCount === 0,
        anti_pattern_violated: false, // determined by agent logs in future
        error_count: failed ? 1 : 0,
      };

      const canonPackets = (enrichedInput.context?.canon_knowledge_packets as CanonKnowledgePacket[]) || [];
      const applicationScores: CanonApplicationScore[] = consumptionReports.map((report) =>
        scoreCanonApplication(
          report.agent_id || "unknown",
          currentStage,
          runId,
          report,
          canonPackets,
          outcomeSignals,
          (input.context?.initiative_id as string) || undefined,
        ),
      );

      const applicationSummary = buildCanonApplicationStageSummary(
        runId,
        currentStage,
        applicationScores,
        canonPackets,
        consumptionTrace,
      );

      this.emit(state, "stage.completed", {
        runId,
        stage: currentStage,
        failed,
        artifacts: state.artifacts.length,
        canon_trace: canonTrace,
        readiness_trace: readinessTrace,
        policy_trace: policyTrace,
        approval_request: approvalRequest,
        canon_application_summary: {
          quality_score: applicationSummary.application_quality_score,
          correlation: applicationSummary.aggregated_correlation,
          used: applicationSummary.canon_used_count,
          applied: applicationSummary.canon_applied_count,
          ignored: applicationSummary.canon_ignored_count,
          learning_signals_count: applicationSummary.learning_signals.length,
          quality_distribution: applicationSummary.quality_distribution,
        },
      });

      // ── Transition ──
      if (failed && policy.nextOnFailure && policy.nextOnFailure !== "done") {
        rollbackCount++;
        if (rollbackCount > this.maxRollbacks) {
          state.status = "failed";
          this.emit(state, "run.completed", {
            runId,
            status: "failed",
            reason: "max_rollbacks_exceeded",
          });
          return state;
        }
      }

      currentStage = failed
        ? policy.nextOnFailure ?? "done"
        : policy.nextOnSuccess;
    }

    state.stage = "done";
    state.status = "completed";

    this.emit(state, "run.completed", {
      runId,
      status: state.status,
      artifacts: state.artifacts.length,
      score: state.score,
    });

    return state;
  }

  // ── Internal: execute all agents for a stage (with Canon consumption tracking) ──

  private async executeAgentsWithCanon(
    agents: AgentDefinition[],
    state: RunState,
    input: WorkInput,
    runId: string,
    stage: StageName,
    memory: RuntimeMemory,
    availablePacketIds: string[],
  ): Promise<{ failed: boolean; consumptionReports: CanonConsumptionReport[] }> {
    let failed = false;
    const consumptionReports: CanonConsumptionReport[] = [];

    for (const agent of agents) {
      this.emit(state, "agent.started", {
        runId,
        stage,
        agentId: agent.id,
        agentName: agent.name,
      });

      try {
        const result = await agent.execute(
          { ...input, artifacts: state.artifacts },
          {
            runId,
            stage,
            memory,
            emit: (event) => {
              this.eventBus.emit(event);
              state.events.push(event);
            },
            now: nowIso,
          },
        );

        // Collect artifacts
        if (result.artifacts?.length) {
          for (const artifact of result.artifacts) {
            state.artifacts.push(artifact);
            this.emit(state, "artifact.created", {
              runId,
              stage,
              artifactId: artifact.id,
              kind: artifact.kind,
            });
          }
        }

        // Sprint 140: Extract Canon consumption from agent result
        const consumption = extractCanonConsumption(
          agent.id,
          stage,
          availablePacketIds,
          result.metrics,
          result.logs,
        );
        consumptionReports.push(consumption);

        this.emit(state, "agent.completed", {
          runId,
          stage,
          agentId: agent.id,
          status: result.status,
          summary: result.summary,
          metrics: result.metrics,
          canon_consumption: {
            usage_mode: consumption.canon_usage_mode,
            packets_used: consumption.canon_packet_ids_used.length,
            packets_available: consumption.canon_packet_ids_available.length,
          },
        });

        if (result.status === "failed" || result.status === "blocked") {
          failed = true;
        }
      } catch (error) {
        failed = true;
        // Record consumption as "none" for failed agents
        consumptionReports.push({
          canon_context_available: availablePacketIds.length > 0,
          canon_packet_ids_available: availablePacketIds,
          canon_packet_ids_used: [],
          canon_categories_used: [],
          canon_usage_mode: "none",
          canon_usage_explanation: `Agent ${agent.id} failed — canon consumption not evaluated`,
          agent_id: agent.id,
          stage,
        });
        this.emit(state, "agent.failed", {
          runId,
          stage,
          agentId: agent.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { failed, consumptionReports };
  }

  // ── Internal: emit event ──

  private emit(
    state: RunState,
    type: RunState["events"][number]["type"],
    payload: Record<string, unknown>,
  ): void {
    const event = {
      id: cryptoRandomId(),
      type,
      timestamp: nowIso(),
      payload,
    };
    this.eventBus.emit(event);
    state.events.push(event);
  }

  // ── Accessors ──

  getRegistry(): AgentRegistry {
    return this.registry;
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }
}
