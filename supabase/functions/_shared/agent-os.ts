// Agent Operating System — Core Kernel
// Consolidates 18+ agent identities into 5 fundamental process types
// Specialization via Mode + Tools + Memory + Contract

export type AgentType =
  | "perception"
  | "design"
  | "build"
  | "validation"
  | "evolution";

export type AgentMode =
  | "discover"
  | "analyze"
  | "plan"
  | "architect"
  | "implement"
  | "refactor"
  | "review"
  | "test"
  | "score"
  | "learn"
  | "optimize";

export type WorkStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "blocked";

export type StageName =
  | "intake"
  | "perception"
  | "design"
  | "build"
  | "validation"
  | "evolution"
  | "done";

export interface AgentCapability {
  key: string;
  description: string;
}

export interface Artifact {
  id: string;
  kind: string;
  title: string;
  content: unknown;
  version: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface WorkInput {
  goal: string;
  context?: Record<string, unknown>;
  constraints?: string[];
  artifacts?: Artifact[];
}

export interface WorkResult {
  status: WorkStatus;
  summary: string;
  artifacts?: Artifact[];
  metrics?: Record<string, number>;
  nextSuggestedStage?: StageName;
  logs?: string[];
}

export interface ExecutionContext {
  runId: string;
  stage: StageName;
  memory: RuntimeMemory;
  emit: (event: RuntimeEvent) => void;
  now: () => string;
}

export interface RuntimeEvent {
  id: string;
  type:
    | "run.created"
    | "stage.started"
    | "stage.completed"
    | "agent.started"
    | "agent.completed"
    | "agent.failed"
    | "artifact.created"
    | "validation.failed"
    | "run.completed";
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface AgentDefinition {
  id: string;
  name: string;
  type: AgentType;
  modes: AgentMode[];
  capabilities: AgentCapability[];
  priority?: number;
  canHandle: (input: WorkInput, stage: StageName) => boolean;
  execute: (input: WorkInput, ctx: ExecutionContext) => Promise<WorkResult>;
}

// ── Runtime Memory ──

export class RuntimeMemory {
  private store = new Map<string, unknown>();

  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  snapshot(): Record<string, unknown> {
    return Object.fromEntries(this.store.entries());
  }
}

// ── Agent Registry ──

export class AgentRegistry {
  private agents: AgentDefinition[] = [];

  register(agent: AgentDefinition): void {
    this.agents.push(agent);
    this.agents.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  list(): AgentDefinition[] {
    return [...this.agents];
  }

  findForStage(stage: StageName, input: WorkInput): AgentDefinition[] {
    return this.agents.filter((agent) => agent.canHandle(input, stage));
  }
}

// ── Stage Policy ──

export interface StagePolicy {
  stage: StageName;
  requiredTypes: AgentType[];
  minSuccessScore?: number;
  nextOnSuccess: StageName;
  nextOnFailure?: StageName;
}

export interface ValidationScore {
  completeness: number;
  correctness: number;
  consistency: number;
  maintainability: number;
  goalFit: number;
}

export interface RunState {
  id: string;
  stage: StageName;
  input: WorkInput;
  artifacts: Artifact[];
  events: RuntimeEvent[];
  status: WorkStatus;
  score?: ValidationScore;
}

// ── Event Bus ──

export class EventBus {
  private events: RuntimeEvent[] = [];

  emit(event: RuntimeEvent): void {
    this.events.push(event);
  }

  all(): RuntimeEvent[] {
    return [...this.events];
  }
}

// ── Agent OS Kernel ──

export class AgentOS {
  constructor(
    private registry: AgentRegistry,
    private policies: StagePolicy[],
    private eventBus = new EventBus(),
  ) {}

  async run(input: WorkInput): Promise<RunState> {
    const runId = cryptoRandomId();
    const memory = new RuntimeMemory();

    const state: RunState = {
      id: runId,
      stage: "intake",
      input,
      artifacts: input.artifacts ?? [],
      events: [],
      status: "running",
    };

    this.emit(state, {
      id: cryptoRandomId(),
      type: "run.created",
      timestamp: nowIso(),
      payload: { runId, goal: input.goal },
    });

    let currentStage: StageName = "perception";

    while (currentStage !== "done") {
      const policy = this.policies.find((p) => p.stage === currentStage);
      if (!policy) {
        throw new Error(`Missing stage policy for ${currentStage}`);
      }

      state.stage = currentStage;
      this.emit(state, {
        id: cryptoRandomId(),
        type: "stage.started",
        timestamp: nowIso(),
        payload: { runId, stage: currentStage },
      });

      const candidates = this.registry.findForStage(currentStage, {
        ...input,
        artifacts: state.artifacts,
      });

      const selected = candidates.filter((agent) =>
        policy.requiredTypes.includes(agent.type),
      );

      if (!selected.length) {
        state.status = "failed";
        throw new Error(`No agents found for stage ${currentStage}`);
      }

      let stageFailed = false;

      for (const agent of selected) {
        this.emit(state, {
          id: cryptoRandomId(),
          type: "agent.started",
          timestamp: nowIso(),
          payload: { runId, stage: currentStage, agentId: agent.id },
        });

        try {
          const result = await agent.execute(
            { ...input, artifacts: state.artifacts },
            {
              runId,
              stage: currentStage,
              memory,
              emit: (event) => this.emit(state, event),
              now: nowIso,
            },
          );

          if (result.artifacts?.length) {
            for (const artifact of result.artifacts) {
              state.artifacts.push(artifact);
              this.emit(state, {
                id: cryptoRandomId(),
                type: "artifact.created",
                timestamp: nowIso(),
                payload: { runId, stage: currentStage, artifactId: artifact.id, kind: artifact.kind },
              });
            }
          }

          this.emit(state, {
            id: cryptoRandomId(),
            type: "agent.completed",
            timestamp: nowIso(),
            payload: {
              runId,
              stage: currentStage,
              agentId: agent.id,
              status: result.status,
              summary: result.summary,
            },
          });

          if (result.status === "failed" || result.status === "blocked") {
            stageFailed = true;
          }
        } catch (error) {
          stageFailed = true;
          this.emit(state, {
            id: cryptoRandomId(),
            type: "agent.failed",
            timestamp: nowIso(),
            payload: {
              runId,
              stage: currentStage,
              agentId: agent.id,
              error: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }

      if (currentStage === "validation") {
        const score = scoreArtifacts(state.artifacts, input.goal);
        state.score = score;
        const average = averageScore(score);
        if (policy.minSuccessScore && average < policy.minSuccessScore) {
          stageFailed = true;
          this.emit(state, {
            id: cryptoRandomId(),
            type: "validation.failed",
            timestamp: nowIso(),
            payload: { runId, score, average, minRequired: policy.minSuccessScore },
          });
        }
      }

      this.emit(state, {
        id: cryptoRandomId(),
        type: "stage.completed",
        timestamp: nowIso(),
        payload: {
          runId,
          stage: currentStage,
          failed: stageFailed,
          artifacts: state.artifacts.length,
        },
      });

      currentStage = stageFailed
        ? policy.nextOnFailure ?? "done"
        : policy.nextOnSuccess;
    }

    state.stage = "done";
    state.status = "completed";

    this.emit(state, {
      id: cryptoRandomId(),
      type: "run.completed",
      timestamp: nowIso(),
      payload: {
        runId,
        status: state.status,
        artifacts: state.artifacts.length,
        score: state.score,
      },
    });

    return state;
  }

  private emit(state: RunState, event: RuntimeEvent): void {
    this.eventBus.emit(event);
    state.events.push(event);
  }
}

// ── Helpers ──

export function createDefaultPolicies(): StagePolicy[] {
  return [
    {
      stage: "perception",
      requiredTypes: ["perception"],
      nextOnSuccess: "design",
      nextOnFailure: "done",
    },
    {
      stage: "design",
      requiredTypes: ["design"],
      nextOnSuccess: "build",
      nextOnFailure: "done",
    },
    {
      stage: "build",
      requiredTypes: ["build"],
      nextOnSuccess: "validation",
      nextOnFailure: "done",
    },
    {
      stage: "validation",
      requiredTypes: ["validation"],
      minSuccessScore: 0.75,
      nextOnSuccess: "evolution",
      nextOnFailure: "design",
    },
    {
      stage: "evolution",
      requiredTypes: ["evolution"],
      nextOnSuccess: "done",
      nextOnFailure: "done",
    },
  ];
}

export function createArtifact(kind: string, title: string, content: unknown): Artifact {
  return {
    id: cryptoRandomId(),
    kind,
    title,
    content,
    version: 1,
    createdAt: nowIso(),
  };
}

export function scoreArtifacts(_artifacts: Artifact[], _goal: string): ValidationScore {
  // Placeholder heuristic — replace with LLM evaluator or deterministic checks
  return {
    completeness: 0.8,
    correctness: 0.74,
    consistency: 0.82,
    maintainability: 0.78,
    goalFit: 0.85,
  };
}

export function averageScore(score: ValidationScore): number {
  const values = Object.values(score);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2, 10)}`;
}

// ── Default Agent Definitions ──

export const perceptionAgent: AgentDefinition = {
  id: "agent-perception-01",
  name: "Intent Mapper",
  type: "perception",
  modes: ["discover", "analyze"],
  capabilities: [
    { key: "goal-extraction", description: "Extracts the real objective from user input" },
    { key: "constraint-mapping", description: "Maps constraints and required inputs" },
  ],
  priority: 100,
  canHandle: (_input, stage) => stage === "perception",
  async execute(input) {
    return {
      status: "completed",
      summary: "Objective and constraints mapped.",
      artifacts: [
        createArtifact("brief", "Execution Brief", {
          goal: input.goal,
          constraints: input.constraints ?? [],
          context: input.context ?? {},
        }),
      ],
      nextSuggestedStage: "design",
    };
  },
};

export const designAgent: AgentDefinition = {
  id: "agent-design-01",
  name: "System Planner",
  type: "design",
  modes: ["plan", "architect"],
  capabilities: [
    { key: "solution-design", description: "Designs workflow and architecture" },
  ],
  priority: 90,
  canHandle: (_input, stage) => stage === "design",
  async execute(input) {
    return {
      status: "completed",
      summary: "Plan and architecture drafted.",
      artifacts: [
        createArtifact("plan", "Implementation Plan", {
          goal: input.goal,
          phases: ["kernel", "protocol", "registry", "observability"],
        }),
      ],
      nextSuggestedStage: "build",
    };
  },
};

export const buildAgent: AgentDefinition = {
  id: "agent-build-01",
  name: "Kernel Builder",
  type: "build",
  modes: ["implement", "refactor"],
  capabilities: [
    { key: "code-generation", description: "Builds the runtime kernel" },
  ],
  priority: 80,
  canHandle: (_input, stage) => stage === "build",
  async execute(input) {
    return {
      status: "completed",
      summary: "Initial kernel built.",
      artifacts: [
        createArtifact("code", "Kernel Output", {
          target: "agent-os-kernel.ts",
          goal: input.goal,
          status: "generated",
        }),
      ],
      nextSuggestedStage: "validation",
    };
  },
};

export const validationAgent: AgentDefinition = {
  id: "agent-validation-01",
  name: "Quality Judge",
  type: "validation",
  modes: ["review", "test", "score"],
  capabilities: [
    { key: "quality-scoring", description: "Scores artifacts across quality dimensions" },
  ],
  priority: 70,
  canHandle: (_input, stage) => stage === "validation",
  async execute() {
    return {
      status: "completed",
      summary: "Artifacts reviewed and scored.",
      nextSuggestedStage: "evolution",
    };
  },
};

export const evolutionAgent: AgentDefinition = {
  id: "agent-evolution-01",
  name: "Learning Loop",
  type: "evolution",
  modes: ["learn", "optimize"],
  capabilities: [
    { key: "feedback-loop", description: "Captures improvements for the next run" },
  ],
  priority: 60,
  canHandle: (_input, stage) => stage === "evolution",
  async execute(_input, ctx) {
    ctx.memory.set("lastEvolution", {
      at: ctx.now(),
      note: "Capture user feedback, validation deltas, and agent performance.",
    });

    return {
      status: "completed",
      summary: "Evolution hints stored for future runs.",
      artifacts: [
        createArtifact("feedback", "Evolution Notes", {
          recommendation: "Add real evaluator, tool adapters, and retry policy.",
        }),
      ],
      nextSuggestedStage: "done",
    };
  },
};

// ── Factory ──

export function createDefaultAgentOS(): AgentOS {
  const registry = new AgentRegistry();
  registry.register(perceptionAgent);
  registry.register(designAgent);
  registry.register(buildAgent);
  registry.register(validationAgent);
  registry.register(evolutionAgent);

  return new AgentOS(registry, createDefaultPolicies());
}
