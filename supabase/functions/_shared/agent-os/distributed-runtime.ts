// Agent OS — Distributed Agent Runtime (v0.9)
// Infrastructure-agnostic contracts for distributed task execution.
// Enables parallel execution across multiple worker nodes with
// task queuing, scheduling, health monitoring, and fault recovery.

import type { StageName } from "./types.ts";

// ─────────────────────────────────────────────
// §1  Distributed Task
// ─────────────────────────────────────────────

/** A task submitted for distributed execution. */
export interface DistributedTask {
  task_id: string;
  /** Task type discriminator. */
  task_type: DistributedTaskType;
  /** Priority (higher = more urgent). */
  priority: TaskPriority;
  /** Payload for the task. */
  payload: Record<string, unknown>;
  /** Required worker capabilities. */
  required_capabilities: string[];
  /** Required resource limits. */
  resource_requirements: TaskResourceRequirements;
  /** Retry policy for this task. */
  retry_policy: TaskRetryPolicy;
  /** Maximum execution time in ms. */
  timeout_ms: number;
  /** Delay before execution (for scheduled tasks). */
  delay_ms?: number;
  /** Trace metadata. */
  trace: DistributedTraceMetadata;
  /** Task status. */
  status: DistributedTaskStatus;
  /** When the task was created. */
  created_at: string;
  /** When the task should expire from the queue. */
  expires_at?: string;
}

export type DistributedTaskType =
  | "agent_execution"
  | "tool_invocation"
  | "coordination_step"
  | "artifact_processing"
  | "embedding_generation"
  | "validation"
  | "llm_invocation"
  | "batch_operation"
  | "custom";

export type TaskPriority =
  | "critical"  // 0 — immediate
  | "high"      // 1
  | "normal"    // 2
  | "low"       // 3
  | "background"; // 4

export type DistributedTaskStatus =
  | "pending"
  | "queued"
  | "assigned"
  | "running"
  | "completed"
  | "failed"
  | "retrying"
  | "timeout"
  | "cancelled"
  | "dead_letter";

/** Resource requirements for task execution. */
export interface TaskResourceRequirements {
  /** Minimum memory in MB. */
  min_memory_mb?: number;
  /** Maximum memory in MB. */
  max_memory_mb?: number;
  /** CPU cores required. */
  cpu_cores?: number;
  /** GPU required. */
  gpu_required?: boolean;
  /** Network access required. */
  network_required?: boolean;
  /** Sandbox isolation required. */
  sandbox_required?: boolean;
}

/** Retry policy for distributed tasks. */
export interface TaskRetryPolicy {
  max_retries: number;
  retry_delay_ms: number;
  /** Backoff multiplier for exponential backoff. */
  backoff_multiplier: number;
  /** Maximum retry delay in ms. */
  max_retry_delay_ms: number;
  /** Retry on these failure types only. */
  retryable_errors?: TaskFailureType[];
}

/** Trace context for distributed execution. */
export interface DistributedTraceMetadata {
  run_id: string;
  stage?: StageName;
  agent_id?: string;
  coordination_plan_id?: string;
  parent_task_id?: string;
  label?: string;
}

export const DEFAULT_TASK_RETRY_POLICY: TaskRetryPolicy = {
  max_retries: 3,
  retry_delay_ms: 1000,
  backoff_multiplier: 2.0,
  max_retry_delay_ms: 30_000,
};

// ─────────────────────────────────────────────
// §2  Task Assignment & Result
// ─────────────────────────────────────────────

/** Assignment of a task to a worker. */
export interface TaskAssignment {
  assignment_id: string;
  task_id: string;
  worker_id: string;
  assigned_at: string;
  /** Deadline for the worker to complete. */
  deadline: string;
  attempt_number: number;
}

/** Result returned by a worker after task execution. */
export interface TaskExecutionResult {
  task_id: string;
  worker_id: string;
  assignment_id: string;
  status: "completed" | "failed";
  /** Output payload. */
  output?: Record<string, unknown>;
  /** Failure details. */
  failure?: TaskFailure;
  /** Execution metrics. */
  metrics: TaskExecutionMetrics;
  completed_at: string;
}

/** Structured task failure. */
export interface TaskFailure {
  failure_id: string;
  failure_type: TaskFailureType;
  message: string;
  stack?: string;
  retryable: boolean;
  worker_id: string;
  attempt_number: number;
  timestamp: string;
}

export type TaskFailureType =
  | "worker_crash"
  | "task_timeout"
  | "agent_failure"
  | "tool_failure"
  | "resource_exhausted"
  | "sandbox_violation"
  | "network_error"
  | "cancelled"
  | "unknown";

/** Metrics collected during task execution. */
export interface TaskExecutionMetrics {
  duration_ms: number;
  queue_wait_ms: number;
  cpu_time_ms?: number;
  memory_peak_mb?: number;
  tokens_used?: number;
  cost_usd?: number;
}

// ─────────────────────────────────────────────
// §3  Worker Node
// ─────────────────────────────────────────────

/** Descriptor for a registered worker node. */
export interface WorkerDescriptor {
  worker_id: string;
  /** Human-readable name. */
  name: string;
  /** Worker type. */
  worker_type: WorkerType;
  /** Capabilities this worker provides. */
  capabilities: WorkerCapabilities;
  /** Resource capacity. */
  resources: WorkerResources;
  /** Current status. */
  status: WorkerStatus;
  /** Current load 0.0–1.0. */
  load: number;
  /** Active task count. */
  active_tasks: number;
  /** Maximum concurrent tasks. */
  max_concurrent_tasks: number;
  /** Registration timestamp. */
  registered_at: string;
  /** Last heartbeat. */
  last_heartbeat_at: string;
  /** Worker endpoint/address. */
  endpoint?: string;
  /** Worker metadata. */
  metadata?: Record<string, unknown>;
}

export type WorkerType =
  | "general"
  | "compute"
  | "gpu"
  | "llm"
  | "tool"
  | "sandbox"
  | "serverless";

export type WorkerStatus =
  | "idle"
  | "busy"
  | "draining"    // No new tasks, finishing current
  | "offline"
  | "unhealthy"
  | "terminated";

/** Capabilities declared by a worker. */
export interface WorkerCapabilities {
  /** Supported task types. */
  task_types: DistributedTaskType[];
  /** Supported agent capabilities. */
  agent_capabilities: string[];
  /** Supported tools. */
  tools: string[];
  /** Supported LLM models. */
  models: string[];
  /** Can run sandboxed tasks. */
  sandbox_support: boolean;
  /** Custom capability tags. */
  tags: string[];
}

/** Resource capacity of a worker. */
export interface WorkerResources {
  total_memory_mb: number;
  available_memory_mb: number;
  cpu_cores: number;
  gpu_available: boolean;
  gpu_memory_mb?: number;
  disk_mb?: number;
}

// ─────────────────────────────────────────────
// §4  Worker Heartbeat & Health
// ─────────────────────────────────────────────

/** Periodic heartbeat from a worker node. */
export interface WorkerHeartbeat {
  worker_id: string;
  status: WorkerStatus;
  load: number;
  active_tasks: number;
  resources: WorkerResources;
  /** Task IDs currently being executed. */
  current_task_ids: string[];
  timestamp: string;
}

/** Health assessment of a worker. */
export interface WorkerHealthAssessment {
  worker_id: string;
  healthy: boolean;
  /** Consecutive missed heartbeats. */
  missed_heartbeats: number;
  /** Average task success rate. */
  success_rate: number;
  /** Average task latency. */
  avg_latency_ms: number;
  /** Last seen. */
  last_seen_at: string;
  /** Recommended action. */
  action: WorkerHealthAction;
}

export type WorkerHealthAction =
  | "none"
  | "warn"
  | "drain"
  | "restart"
  | "exclude"
  | "terminate";

// ─────────────────────────────────────────────
// §5  Task Queue Interface
// ─────────────────────────────────────────────

/** Interface for the distributed task queue. */
export interface ITaskQueue {
  /** Enqueue a task. */
  enqueue(task: DistributedTask): Promise<string>;

  /** Dequeue the next task matching worker capabilities. */
  dequeue(worker: WorkerDescriptor): Promise<DistributedTask | undefined>;

  /** Peek at queue without removing. */
  peek(count: number): Promise<DistributedTask[]>;

  /** Acknowledge task completion. */
  ack(task_id: string, result: TaskExecutionResult): Promise<void>;

  /** Negative acknowledge (return to queue for retry). */
  nack(task_id: string, failure: TaskFailure): Promise<void>;

  /** Move to dead letter queue. */
  deadLetter(task_id: string, reason: string): Promise<void>;

  /** Cancel a pending task. */
  cancel(task_id: string): Promise<boolean>;

  /** Get queue depth. */
  depth(): Promise<number>;

  /** Get queue depth by priority. */
  depthByPriority(): Promise<Record<TaskPriority, number>>;
}

// ─────────────────────────────────────────────
// §6  Worker Registry Interface
// ─────────────────────────────────────────────

/** Interface for managing worker nodes. */
export interface IWorkerRegistry {
  register(descriptor: WorkerDescriptor): Promise<void>;
  unregister(worker_id: string): Promise<void>;
  heartbeat(hb: WorkerHeartbeat): Promise<void>;
  getWorker(worker_id: string): WorkerDescriptor | undefined;
  listWorkers(status?: WorkerStatus): WorkerDescriptor[];
  /** Find workers capable of executing a task. */
  findCapable(task: DistributedTask): WorkerDescriptor[];
  /** Get health assessment for a worker. */
  assessHealth(worker_id: string): WorkerHealthAssessment;
  /** Drain a worker (no new tasks). */
  drain(worker_id: string): Promise<void>;
  /** Exclude a worker from scheduling. */
  exclude(worker_id: string, reason: string): Promise<void>;
}

// ─────────────────────────────────────────────
// §7  Task Scheduler Interface
// ─────────────────────────────────────────────

/** Interface for scheduling tasks to workers. */
export interface ITaskScheduler {
  /** Schedule a task for execution. */
  schedule(task: DistributedTask): Promise<TaskAssignment>;
  /** Reschedule a failed task. */
  reschedule(task_id: string, failure: TaskFailure): Promise<TaskAssignment | undefined>;
  /** Get scheduling metrics. */
  getMetrics(): SchedulerMetrics;
}

/** Aggregate scheduler metrics. */
export interface SchedulerMetrics {
  total_scheduled: number;
  total_completed: number;
  total_failed: number;
  total_retried: number;
  total_dead_lettered: number;
  avg_queue_wait_ms: number;
  avg_execution_ms: number;
  worker_utilization: Record<string, number>;
  queue_depth: number;
  timestamp: string;
}

// ─────────────────────────────────────────────
// §8  Distributed Runtime Interface
// ─────────────────────────────────────────────

/**
 * Core interface for the Distributed Agent Runtime.
 * Coordinates task scheduling, worker management, and fault recovery.
 */
export interface IDistributedRuntime {
  // ── Task Management ──
  submitTask(task: Omit<DistributedTask, "task_id" | "status" | "created_at">): Promise<string>;
  getTask(task_id: string): Promise<DistributedTask | undefined>;
  cancelTask(task_id: string): Promise<boolean>;
  getTaskResult(task_id: string): Promise<TaskExecutionResult | undefined>;

  // ── Worker Management ──
  registerWorker(descriptor: WorkerDescriptor): Promise<void>;
  unregisterWorker(worker_id: string): Promise<void>;
  listWorkers(status?: WorkerStatus): WorkerDescriptor[];
  drainWorker(worker_id: string): Promise<void>;

  // ── Monitoring ──
  getSchedulerMetrics(): SchedulerMetrics;
  getWorkerHealth(worker_id: string): WorkerHealthAssessment;

  // ── Lifecycle ──
  start(): Promise<void>;
  stop(): Promise<void>;
}

// ─────────────────────────────────────────────
// §9  Configuration
// ─────────────────────────────────────────────

export interface DistributedRuntimeConfig {
  enabled: boolean;
  /** Heartbeat interval in ms. */
  heartbeat_interval_ms: number;
  /** Heartbeats missed before marking unhealthy. */
  max_missed_heartbeats: number;
  /** Default task timeout in ms. */
  default_task_timeout_ms: number;
  /** Maximum queue depth before rejecting new tasks. */
  max_queue_depth: number;
  /** Default max concurrent tasks per worker. */
  default_max_concurrent: number;
  /** Default retry policy. */
  default_retry_policy: TaskRetryPolicy;
  /** Enable dead letter queue. */
  dead_letter_enabled: boolean;
  /** Maximum dead letter queue size. */
  max_dead_letter_size: number;
}

export const DEFAULT_DISTRIBUTED_RUNTIME_CONFIG: DistributedRuntimeConfig = {
  enabled: false,
  heartbeat_interval_ms: 10_000,
  max_missed_heartbeats: 3,
  default_task_timeout_ms: 60_000,
  max_queue_depth: 10_000,
  default_max_concurrent: 6,
  default_retry_policy: DEFAULT_TASK_RETRY_POLICY,
  dead_letter_enabled: true,
  max_dead_letter_size: 1000,
};

// ─────────────────────────────────────────────
// §10  Event Types (EventBus integration)
// ─────────────────────────────────────────────

export type DistributedRuntimeEventType =
  | "distributed.task_created"
  | "distributed.task_queued"
  | "distributed.task_assigned"
  | "distributed.task_started"
  | "distributed.task_completed"
  | "distributed.task_failed"
  | "distributed.task_retrying"
  | "distributed.task_timeout"
  | "distributed.task_cancelled"
  | "distributed.task_dead_lettered"
  | "distributed.worker_registered"
  | "distributed.worker_heartbeat"
  | "distributed.worker_unhealthy"
  | "distributed.worker_drained"
  | "distributed.worker_excluded"
  | "distributed.worker_terminated"
  | "distributed.queue_backlog_warning"
  | "distributed.scheduler_rebalance";
