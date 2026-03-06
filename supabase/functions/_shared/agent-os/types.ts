// Agent OS — Core Type Definitions
// All types are pure data contracts with zero runtime dependencies.

// ── Agent Classification ──

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

// ── Execution Status ──

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

// ── Agent Capabilities ──

export interface AgentCapability {
  key: string;
  description: string;
}

// ── Artifacts ──

export interface Artifact {
  id: string;
  kind: string;
  title: string;
  content: unknown;
  version: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// ── Work IO ──

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

// ── Execution Context (injected into each agent) ──

export interface ExecutionContext {
  runId: string;
  stage: StageName;
  memory: IMemory;
  emit: (event: RuntimeEvent) => void;
  now: () => string;
}

// ── Memory Interface ──

export interface IMemory {
  set<T>(key: string, value: T): void;
  get<T>(key: string): T | undefined;
  has(key: string): boolean;
  snapshot(): Record<string, unknown>;
}

// ── Events ──

export type RuntimeEventType =
  | "run.created"
  | "stage.started"
  | "stage.completed"
  | "agent.started"
  | "agent.completed"
  | "agent.failed"
  | "artifact.created"
  | "validation.failed"
  | "run.completed";

export interface RuntimeEvent {
  id: string;
  type: RuntimeEventType;
  timestamp: string;
  payload: Record<string, unknown>;
}

// ── Agent Definition ──

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

// ── Stage Policy ──

export interface StagePolicy {
  stage: StageName;
  requiredTypes: AgentType[];
  minSuccessScore?: number;
  nextOnSuccess: StageName;
  nextOnFailure?: StageName;
}

// ── Validation ──

export interface ValidationScore {
  completeness: number;
  correctness: number;
  consistency: number;
  maintainability: number;
  goalFit: number;
}

// ── Run State ──

export interface RunState {
  id: string;
  stage: StageName;
  input: WorkInput;
  artifacts: Artifact[];
  events: RuntimeEvent[];
  status: WorkStatus;
  score?: ValidationScore;
}
