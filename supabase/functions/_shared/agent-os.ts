// Agent OS — Legacy re-export for backward compatibility
// All modules have been refactored into supabase/functions/_shared/agent-os/
// Import from "./agent-os/index.ts" for new code.

export {
  // Types
  type AgentType,
  type AgentMode,
  type WorkStatus,
  type StageName,
  type AgentCapability,
  type Artifact,
  type WorkInput,
  type WorkResult,
  type ExecutionContext,
  type RuntimeEvent,
  type RuntimeEventType,
  type AgentDefinition,
  type StagePolicy,
  type ValidationScore,
  type RunState,
  type IMemory,

  // Classes
  AgentOS,
  AgentRegistry,
  EventBus,
  RuntimeMemory,

  // Functions
  createDefaultPolicies,
  scoreArtifacts,
  averageScore,
  meetsThreshold,
  cryptoRandomId,
  nowIso,
  createArtifact,
} from "./agent-os/index.ts";
