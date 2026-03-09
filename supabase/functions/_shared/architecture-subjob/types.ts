/**
 * Architecture Subjob Orchestration — Types & Constants
 * Governs the granular execution of architecture stage agents.
 */

export type SubjobStatus = "queued" | "running" | "completed" | "failed" | "failed_timeout" | "retryable" | "blocked";

export interface SubjobDefinition {
  key: string;
  label: string;
  agentRole: string;
  dependsOn: string[];
  usePro: boolean;
  timeoutMs: number;
}

/** Canonical architecture subjob definitions with dependency graph */
export const ARCHITECTURE_SUBJOBS: SubjobDefinition[] = [
  {
    key: "architecture.system",
    label: "System Architect",
    agentRole: "system_architect",
    dependsOn: [],
    usePro: true,
    timeoutMs: 90_000,
  },
  {
    key: "architecture.data",
    label: "Data Architect",
    agentRole: "data_architect",
    dependsOn: ["architecture.system"],
    usePro: false,
    timeoutMs: 90_000,
  },
  {
    key: "architecture.api",
    label: "API Architect",
    agentRole: "api_architect",
    dependsOn: ["architecture.system"],
    usePro: false,
    timeoutMs: 90_000,
  },
  {
    key: "architecture.dependencies",
    label: "Dependency Planner",
    agentRole: "dependency_planner",
    dependsOn: ["architecture.data", "architecture.api"],
    usePro: true,
    timeoutMs: 60_000,
  },
  {
    key: "architecture.synthesis",
    label: "Architecture Synthesis",
    agentRole: "synthesis",
    dependsOn: ["architecture.system", "architecture.data", "architecture.api", "architecture.dependencies"],
    usePro: false,
    timeoutMs: 10_000,
  },
];

export interface SubjobRecord {
  id: string;
  job_id: string;
  initiative_id: string;
  organization_id: string;
  subjob_key: string;
  stage: string;
  status: SubjobStatus;
  depends_on: string[];
  result: Record<string, unknown> | null;
  error: string | null;
  model_used: string | null;
  tokens_used: number;
  cost_usd: number;
  duration_ms: number;
  attempt_number: number;
  max_attempts: number;
  started_at: string | null;
  completed_at: string | null;
}

export function getTerminalStatuses(): SubjobStatus[] {
  return ["completed", "failed", "failed_timeout"];
}

export function isTerminal(status: SubjobStatus): boolean {
  return getTerminalStatuses().includes(status);
}

export function canRetry(subjob: SubjobRecord): boolean {
  return (
    (subjob.status === "failed" || subjob.status === "failed_timeout" || subjob.status === "retryable") &&
    subjob.attempt_number < subjob.max_attempts
  );
}

export function getReadySubjobs(subjobs: SubjobRecord[]): SubjobRecord[] {
  const completedKeys = new Set(
    subjobs.filter(s => s.status === "completed").map(s => s.subjob_key)
  );
  return subjobs.filter(s =>
    s.status === "queued" &&
    s.depends_on.every(dep => completedKeys.has(dep))
  );
}

export function areAllComplete(subjobs: SubjobRecord[]): boolean {
  return subjobs.every(s => s.status === "completed");
}

export function hasAnyFailed(subjobs: SubjobRecord[]): SubjobRecord[] {
  return subjobs.filter(s => s.status === "failed" || s.status === "failed_timeout");
}
