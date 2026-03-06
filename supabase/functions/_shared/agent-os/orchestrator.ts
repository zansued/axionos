// Agent OS — Orchestrator (Kernel)
// Runs the cognitive pipeline: intake → perception → design → build → validation → evolution → done
// Handles stage transitions, agent dispatch, validation scoring, and rollback.

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

export interface OrchestratorOptions {
  registry: AgentRegistry;
  policies: StagePolicy[];
  eventBus?: EventBus;
  maxRollbacks?: number;
}

export class AgentOS {
  private registry: AgentRegistry;
  private policies: StagePolicy[];
  private eventBus: EventBus;
  private maxRollbacks: number;

  constructor(options: OrchestratorOptions) {
    this.registry = options.registry;
    this.policies = options.policies;
    this.eventBus = options.eventBus ?? new EventBus();
    this.maxRollbacks = options.maxRollbacks ?? 3;
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

      // ── Select agents ──
      const candidates = this.registry.findForStage(currentStage, {
        ...input,
        artifacts: state.artifacts,
      });

      const selected = candidates.filter((a) =>
        policy.requiredTypes.includes(a.type),
      );

      if (!selected.length) {
        state.status = "failed";
        throw new Error(`[AgentOS] No agents for stage: ${currentStage}`);
      }

      // ── Execute agents ──
      const stageFailed = await this.executeAgents(
        selected,
        state,
        input,
        runId,
        currentStage,
        memory,
      );

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

      this.emit(state, "stage.completed", {
        runId,
        stage: currentStage,
        failed,
        artifacts: state.artifacts.length,
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

  // ── Internal: execute all agents for a stage ──

  private async executeAgents(
    agents: AgentDefinition[],
    state: RunState,
    input: WorkInput,
    runId: string,
    stage: StageName,
    memory: RuntimeMemory,
  ): Promise<boolean> {
    let failed = false;

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

        this.emit(state, "agent.completed", {
          runId,
          stage,
          agentId: agent.id,
          status: result.status,
          summary: result.summary,
          metrics: result.metrics,
        });

        if (result.status === "failed" || result.status === "blocked") {
          failed = true;
        }
      } catch (error) {
        failed = true;
        this.emit(state, "agent.failed", {
          runId,
          stage,
          agentId: agent.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return failed;
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
