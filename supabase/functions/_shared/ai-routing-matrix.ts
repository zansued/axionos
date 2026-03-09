/**
 * ═══════════════════════════════════════════════════════════════════════
 * AxionOS Canonical AI Routing Matrix
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Single source of truth for all AI provider/model routing decisions.
 *
 * ROUTING PHILOSOPHY:
 * ───────────────────
 * 1. DeepSeek  = economy-first engine (high-volume, drafting, extraction)
 * 2. GPT-5-mini = high-confidence engine (structured, governance, user-facing)
 * 3. GPT-5.4   = premium escalation (rare strategic/architecture reviews)
 * 4. Pollinations = optional only, disabled by default, never Gemini
 *
 * WHY NOT GEMINI:
 *   Gemini is explicitly removed as a default route. AxionOS controls
 *   its own model selection based on task class, risk, and cost — not
 *   gateway defaults. The Lovable Gateway is used only as transport
 *   when no external API keys are configured; model names are always
 *   explicitly set to OpenAI models, never Gemini.
 *
 * CANON INVARIANTS PRESERVED:
 *   - Advisory-first (governance routes use high-confidence tier)
 *   - Governance before autonomy (recommendations require OpenAI)
 *   - Rollback everywhere (fallback chains are explicit)
 *   - Bounded adaptation (premium tier is budget-guarded)
 *   - Human approval for structural change (architecture tier = premium)
 *   - Tenant isolation (routing is stateless, no cross-tenant leakage)
 *   - No autonomous architecture mutation (architecture_reasoning → premium)
 */

// ─────────────────────────────────────────────
// §1  Task Classification
// ─────────────────────────────────────────────

export type TaskClass =
  | "simple_transform"
  | "extraction"
  | "summarization"
  | "drafting"
  | "workspace_analysis"
  | "code_generation"
  | "code_refactor"
  | "strict_structured_output"
  | "user_facing_response"
  | "governance_recommendation"
  | "architecture_reasoning"
  | "heavy_reasoning_cost_sensitive"
  | "premium_strategy"
  // Internal utility classes
  | "embedding_generation"
  | "prompt_compression"
  | "generic";

export type RoutingTier = "economy" | "balanced" | "high_confidence" | "premium";
export type ProviderName = "openai" | "deepseek" | "pollinations";
export type ComplexityLevel = "low" | "medium" | "high" | "critical";

// ─────────────────────────────────────────────
// §2  Canonical Model Identifiers
// ─────────────────────────────────────────────

/** Canonical model names used in routing decisions */
export const CANONICAL_MODELS = {
  // DeepSeek models (economy tier)
  DEEPSEEK_CHAT: "deepseek-chat",
  DEEPSEEK_REASONER: "deepseek-reasoner",

  // OpenAI models (confidence + premium tiers)
  // When using Lovable Gateway, prefix with "openai/"
  GPT5_MINI: "gpt-5-mini",
  GPT5_4: "gpt-5.4",
  GPT5_NANO: "gpt-5-nano",

  // Gateway-prefixed variants (for Lovable AI Gateway)
  GATEWAY_GPT5_MINI: "openai/gpt-5-mini",
  GATEWAY_GPT5_4: "openai/gpt-5.2", // maps to best available premium
  GATEWAY_GPT5_NANO: "openai/gpt-5-nano",
} as const;

// ─────────────────────────────────────────────
// §3  Routing Matrix Definition
// ─────────────────────────────────────────────

export interface RoutingMatrixEntry {
  taskClass: TaskClass;
  description: string;
  examples: string[];
  defaultProvider: ProviderName;
  defaultModel: string;
  /** Model when using Lovable Gateway (no external keys) */
  gatewayModel: string;
  fallbackProvider: ProviderName | null;
  fallbackModel: string | null;
  /** Model for premium escalation (null = no escalation) */
  premiumModel: string | null;
  tier: RoutingTier;
  complexity: ComplexityLevel;
  structureStrictness: "low" | "medium" | "high";
  costSensitivity: "low" | "medium" | "high";
  reliabilityRequirement: "low" | "medium" | "high" | "critical";
  notes: string;
}

/**
 * THE CANONICAL ROUTING MATRIX
 *
 * This is the single authoritative source for all routing decisions.
 * Every AI call in AxionOS resolves through this matrix.
 */
export const ROUTING_MATRIX: Record<TaskClass, RoutingMatrixEntry> = {
  // ── Economy Tier (DeepSeek first) ──────────────────────

  simple_transform: {
    taskClass: "simple_transform",
    description: "Rewrite, shorten, clean text, paraphrase",
    examples: ["rewrite", "shorten", "clean text", "paraphrase"],
    defaultProvider: "deepseek",
    defaultModel: CANONICAL_MODELS.DEEPSEEK_CHAT,
    gatewayModel: CANONICAL_MODELS.GATEWAY_GPT5_NANO,
    fallbackProvider: "openai",
    fallbackModel: CANONICAL_MODELS.GPT5_MINI,
    premiumModel: null,
    tier: "economy",
    complexity: "low",
    structureStrictness: "low",
    costSensitivity: "high",
    reliabilityRequirement: "low",
    notes: "Economy-first, low-risk. DeepSeek handles volume.",
  },

  extraction: {
    taskClass: "extraction",
    description: "Pull fields, extract entities, classify inputs",
    examples: ["pull fields", "extract entities", "classify inputs"],
    defaultProvider: "deepseek",
    defaultModel: CANONICAL_MODELS.DEEPSEEK_CHAT,
    gatewayModel: CANONICAL_MODELS.GATEWAY_GPT5_NANO,
    fallbackProvider: "openai",
    fallbackModel: CANONICAL_MODELS.GPT5_MINI,
    premiumModel: null,
    tier: "economy",
    complexity: "low",
    structureStrictness: "medium",
    costSensitivity: "high",
    reliabilityRequirement: "medium",
    notes: "Use OpenAI if structure repeatedly fails on DeepSeek.",
  },

  summarization: {
    taskClass: "summarization",
    description: "Summarize docs, logs, evidence",
    examples: ["summarize docs", "summarize logs", "summarize evidence"],
    defaultProvider: "deepseek",
    defaultModel: CANONICAL_MODELS.DEEPSEEK_CHAT,
    gatewayModel: CANONICAL_MODELS.GATEWAY_GPT5_NANO,
    fallbackProvider: "openai",
    fallbackModel: CANONICAL_MODELS.GPT5_MINI,
    premiumModel: null,
    tier: "economy",
    complexity: "low",
    structureStrictness: "low",
    costSensitivity: "high",
    reliabilityRequirement: "low",
    notes: "Output-heavy, cost-sensitive. DeepSeek excels here.",
  },

  embedding_generation: {
    taskClass: "embedding_generation",
    description: "Generate embeddings for semantic search",
    examples: ["embed text", "vectorize content"],
    defaultProvider: "deepseek",
    defaultModel: CANONICAL_MODELS.DEEPSEEK_CHAT,
    gatewayModel: CANONICAL_MODELS.GATEWAY_GPT5_NANO,
    fallbackProvider: "openai",
    fallbackModel: CANONICAL_MODELS.GPT5_MINI,
    premiumModel: null,
    tier: "economy",
    complexity: "low",
    structureStrictness: "low",
    costSensitivity: "high",
    reliabilityRequirement: "low",
    notes: "Utility task, cost-optimize aggressively.",
  },

  prompt_compression: {
    taskClass: "prompt_compression",
    description: "Compress prompts to reduce token usage",
    examples: ["compress prompt", "reduce tokens"],
    defaultProvider: "deepseek",
    defaultModel: CANONICAL_MODELS.DEEPSEEK_CHAT,
    gatewayModel: CANONICAL_MODELS.GATEWAY_GPT5_NANO,
    fallbackProvider: "openai",
    fallbackModel: CANONICAL_MODELS.GPT5_MINI,
    premiumModel: null,
    tier: "economy",
    complexity: "low",
    structureStrictness: "low",
    costSensitivity: "high",
    reliabilityRequirement: "low",
    notes: "Meta-optimization, must be cheap itself.",
  },

  // ── Balanced Tier (DeepSeek first, OpenAI fallback) ────

  drafting: {
    taskClass: "drafting",
    description: "First-pass stories, reports, candidates, proposals",
    examples: ["first-pass stories", "reports", "candidates", "proposals"],
    defaultProvider: "deepseek",
    defaultModel: CANONICAL_MODELS.DEEPSEEK_CHAT,
    gatewayModel: CANONICAL_MODELS.GATEWAY_GPT5_MINI,
    fallbackProvider: "openai",
    fallbackModel: CANONICAL_MODELS.GPT5_MINI,
    premiumModel: null,
    tier: "balanced",
    complexity: "medium",
    structureStrictness: "medium",
    costSensitivity: "medium",
    reliabilityRequirement: "medium",
    notes: "DeepSeek for first draft, OpenAI for refinement if needed.",
  },

  workspace_analysis: {
    taskClass: "workspace_analysis",
    description: "Adoption analysis, post-deploy review, operational reasoning",
    examples: ["adoption analysis", "post-deploy review", "medium operational reasoning"],
    defaultProvider: "deepseek",
    defaultModel: CANONICAL_MODELS.DEEPSEEK_CHAT,
    gatewayModel: CANONICAL_MODELS.GATEWAY_GPT5_MINI,
    fallbackProvider: "openai",
    fallbackModel: CANONICAL_MODELS.GPT5_MINI,
    premiumModel: null,
    tier: "balanced",
    complexity: "medium",
    structureStrictness: "medium",
    costSensitivity: "medium",
    reliabilityRequirement: "medium",
    notes: "DeepSeek first, OpenAI when confidence/structure matters more.",
  },

  code_generation: {
    taskClass: "code_generation",
    description: "First-pass code, implementation scaffolding",
    examples: ["first-pass code", "code drafting", "implementation scaffolding"],
    defaultProvider: "deepseek",
    defaultModel: CANONICAL_MODELS.DEEPSEEK_CHAT,
    gatewayModel: CANONICAL_MODELS.GATEWAY_GPT5_MINI,
    fallbackProvider: "openai",
    fallbackModel: CANONICAL_MODELS.GPT5_MINI,
    premiumModel: null,
    tier: "balanced",
    complexity: "medium",
    structureStrictness: "medium",
    costSensitivity: "medium",
    reliabilityRequirement: "medium",
    notes: "Use DeepSeek Reasoner for harder internal code reasoning when cost matters.",
  },

  heavy_reasoning_cost_sensitive: {
    taskClass: "heavy_reasoning_cost_sensitive",
    description: "Deeper analysis where cost still matters significantly",
    examples: ["complex analysis", "deep reasoning on budget"],
    defaultProvider: "deepseek",
    defaultModel: CANONICAL_MODELS.DEEPSEEK_REASONER,
    gatewayModel: CANONICAL_MODELS.GATEWAY_GPT5_MINI,
    fallbackProvider: "openai",
    fallbackModel: CANONICAL_MODELS.GPT5_MINI,
    premiumModel: null,
    tier: "balanced",
    complexity: "high",
    structureStrictness: "medium",
    costSensitivity: "high",
    reliabilityRequirement: "medium",
    notes: "Use when reasoning depth matters but premium OpenAI is not yet justified.",
  },

  generic: {
    taskClass: "generic",
    description: "Unclassified tasks",
    examples: ["general purpose"],
    defaultProvider: "deepseek",
    defaultModel: CANONICAL_MODELS.DEEPSEEK_CHAT,
    gatewayModel: CANONICAL_MODELS.GATEWAY_GPT5_MINI,
    fallbackProvider: "openai",
    fallbackModel: CANONICAL_MODELS.GPT5_MINI,
    premiumModel: null,
    tier: "balanced",
    complexity: "medium",
    structureStrictness: "low",
    costSensitivity: "medium",
    reliabilityRequirement: "medium",
    notes: "Default route for unclassified tasks.",
  },

  // ── High Confidence Tier (OpenAI GPT-5-mini first) ─────

  code_refactor: {
    taskClass: "code_refactor",
    description: "Refactor suggestions, code cleanup, architecture-aware changes",
    examples: ["refactor suggestions", "code cleanup", "architecture-aware code changes"],
    defaultProvider: "openai",
    defaultModel: CANONICAL_MODELS.GPT5_MINI,
    gatewayModel: CANONICAL_MODELS.GATEWAY_GPT5_MINI,
    fallbackProvider: "deepseek",
    fallbackModel: CANONICAL_MODELS.DEEPSEEK_REASONER,
    premiumModel: CANONICAL_MODELS.GPT5_4,
    tier: "high_confidence",
    complexity: "high",
    structureStrictness: "high",
    costSensitivity: "low",
    reliabilityRequirement: "high",
    notes: "Escalate when output quality or safety is critical.",
  },

  strict_structured_output: {
    taskClass: "strict_structured_output",
    description: "Schema-bound JSON, validated machine-readable outputs",
    examples: ["schema-bound JSON", "validated machine-readable outputs"],
    defaultProvider: "openai",
    defaultModel: CANONICAL_MODELS.GPT5_MINI,
    gatewayModel: CANONICAL_MODELS.GATEWAY_GPT5_MINI,
    fallbackProvider: null,
    fallbackModel: null,
    premiumModel: CANONICAL_MODELS.GPT5_4,
    tier: "high_confidence",
    complexity: "medium",
    structureStrictness: "high",
    costSensitivity: "low",
    reliabilityRequirement: "critical",
    notes: "Structure reliability takes priority over cost. No DeepSeek fallback for schema.",
  },

  user_facing_response: {
    taskClass: "user_facing_response",
    description: "Final responses shown to customer/end user",
    examples: ["final user responses", "customer-facing text"],
    defaultProvider: "openai",
    defaultModel: CANONICAL_MODELS.GPT5_MINI,
    gatewayModel: CANONICAL_MODELS.GATEWAY_GPT5_MINI,
    fallbackProvider: "deepseek",
    fallbackModel: CANONICAL_MODELS.DEEPSEEK_CHAT,
    premiumModel: CANONICAL_MODELS.GPT5_4,
    tier: "high_confidence",
    complexity: "medium",
    structureStrictness: "medium",
    costSensitivity: "low",
    reliabilityRequirement: "high",
    notes: "Prioritize clarity and confidence. Premium only when high-stakes.",
  },

  governance_recommendation: {
    taskClass: "governance_recommendation",
    description: "Approve/reject/defer suggestions, risk summary, governance",
    examples: ["approve/reject/defer", "risk summary", "extension governance"],
    defaultProvider: "openai",
    defaultModel: CANONICAL_MODELS.GPT5_MINI,
    gatewayModel: CANONICAL_MODELS.GATEWAY_GPT5_MINI,
    fallbackProvider: null,
    fallbackModel: null,
    premiumModel: CANONICAL_MODELS.GPT5_4,
    tier: "high_confidence",
    complexity: "high",
    structureStrictness: "high",
    costSensitivity: "low",
    reliabilityRequirement: "critical",
    notes: "Governance-sensitive, reliability-first. No cheap fallback.",
  },

  architecture_reasoning: {
    taskClass: "architecture_reasoning",
    description: "Architecture trade-offs, structural analysis, system evolution",
    examples: ["architecture trade-offs", "structural analysis", "system evolution review"],
    defaultProvider: "openai",
    defaultModel: CANONICAL_MODELS.GPT5_MINI,
    gatewayModel: CANONICAL_MODELS.GATEWAY_GPT5_MINI,
    fallbackProvider: null,
    fallbackModel: null,
    premiumModel: CANONICAL_MODELS.GPT5_4,
    tier: "high_confidence",
    complexity: "high",
    structureStrictness: "high",
    costSensitivity: "low",
    reliabilityRequirement: "critical",
    notes: "High-value reasoning, avoid cheap default. Escalate to premium for critical.",
  },

  // ── Premium Tier (GPT-5.4 default) ────────────────────

  premium_strategy: {
    taskClass: "premium_strategy",
    description: "Rare executive synthesis, premium architectural review",
    examples: ["executive synthesis", "premium architecture review", "critical strategic decisions"],
    defaultProvider: "openai",
    defaultModel: CANONICAL_MODELS.GPT5_4,
    gatewayModel: CANONICAL_MODELS.GATEWAY_GPT5_4,
    fallbackProvider: "openai",
    fallbackModel: CANONICAL_MODELS.GPT5_MINI,
    premiumModel: null,
    tier: "premium",
    complexity: "critical",
    structureStrictness: "high",
    costSensitivity: "low",
    reliabilityRequirement: "critical",
    notes: "Explicit premium path only. Reserved for rare high-stakes cases.",
  },
};

// ─────────────────────────────────────────────
// §4  Pipeline Stage → Task Class Mapping
// ─────────────────────────────────────────────

/**
 * Maps known pipeline stages to their canonical task class.
 * This is the single place to update when new stages are added.
 */
export const STAGE_TASK_MAP: Record<string, TaskClass> = {
  // Economy stages
  embeddings: "embedding_generation",
  "generate-embeddings": "embedding_generation",
  observability: "extraction",
  analytics: "summarization",
  behavior_analysis: "summarization",
  "build-self-healing": "extraction",
  "pipeline-ci-webhook": "simple_transform",
  adaptive_learning: "summarization",
  "prompt-compression": "prompt_compression",

  // Balanced stages
  prd: "drafting",
  stories: "drafting",
  data_model_generation: "code_generation",
  ui_generation: "code_generation",
  code_generation: "code_generation",
  "blueprint-generation": "drafting",
  "workspace-analysis": "workspace_analysis",
  "post-deploy": "workspace_analysis",
  "adoption-analysis": "workspace_analysis",

  // High Confidence stages
  architecture: "architecture_reasoning",
  domain_model: "architecture_reasoning",
  business_logic: "code_refactor",
  api_generation: "strict_structured_output",
  "pipeline-architecture": "architecture_reasoning",
  "pipeline-deep-validation": "governance_recommendation",
  "architecture-evolution": "architecture_reasoning",
  "product-evolution": "governance_recommendation",
  "revenue-strategy": "governance_recommendation",
  "governance-review": "governance_recommendation",
  "architecture-review": "architecture_reasoning",

  // Premium stages
  "executive-synthesis": "premium_strategy",
  "strategic-review": "premium_strategy",
};

// ─────────────────────────────────────────────
// §5  Escalation & Fallback Policy
// ─────────────────────────────────────────────

export interface EscalationPolicy {
  /** When to escalate from DeepSeek to OpenAI GPT-5-mini */
  deepseekToOpenai: {
    onInvalidSchema: boolean;
    onToolCallFailure: boolean;
    onLowConfidence: boolean;
    onInconsistentOutput: boolean;
    onRetryLimitExceeded: boolean;
    onTimeout: boolean;
    confidenceThreshold: number;
    maxRetries: number;
    timeoutMs: number;
  };
  /** When to escalate from GPT-5-mini to GPT-5.4 */
  openaiToPremium: {
    onArchitectureReview: boolean;
    onPremiumStrategyRequest: boolean;
    onHighStakesGovernance: boolean;
    onOperatorExplicitRequest: boolean;
    onPolicyCriticalThreshold: boolean;
    enabled: boolean;
  };
  /** OpenAI retry policy */
  openaiRetry: {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    neverFallbackToGemini: true; // invariant
  };
  /** Pollinations policy */
  pollinations: {
    enabled: boolean;
    dailyBudgetCap: number;
    allowedTaskClasses: TaskClass[];
    neverRouteToGemini: true; // invariant
  };
}

export const DEFAULT_ESCALATION_POLICY: EscalationPolicy = {
  deepseekToOpenai: {
    onInvalidSchema: true,
    onToolCallFailure: true,
    onLowConfidence: true,
    onInconsistentOutput: true,
    onRetryLimitExceeded: true,
    onTimeout: true,
    confidenceThreshold: 0.7,
    maxRetries: 2,
    timeoutMs: 30_000,
  },
  openaiToPremium: {
    onArchitectureReview: true,
    onPremiumStrategyRequest: true,
    onHighStakesGovernance: true,
    onOperatorExplicitRequest: true,
    onPolicyCriticalThreshold: true,
    enabled: true,
  },
  openaiRetry: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 15_000,
    neverFallbackToGemini: true,
  },
  pollinations: {
    enabled: false,
    dailyBudgetCap: 50,
    allowedTaskClasses: ["simple_transform", "summarization"],
    neverRouteToGemini: true,
  },
};

// ─────────────────────────────────────────────
// §6  Configuration Constants
// ─────────────────────────────────────────────

export const ROUTING_CONFIG = {
  DEFAULT_PROVIDER_ECONOMY: "deepseek" as ProviderName,
  DEFAULT_PROVIDER_CONFIDENCE: "openai" as ProviderName,
  DEFAULT_PROVIDER_PREMIUM: "openai" as ProviderName,

  DEEPSEEK_SCHEMA_FAILURE_THRESHOLD: 2,
  DEEPSEEK_TIMEOUT_MS: 30_000,
  OPENAI_RETRY_COUNT: 3,
  PREMIUM_ESCALATION_ENABLED: true,
  POLLINATIONS_ENABLED: false,
  POLLINATIONS_DAILY_BUDGET_CAP: 50,
  DEFAULT_ROUTING_MODE: "balanced" as RoutingTier,
} as const;

// ─────────────────────────────────────────────
// §7  Observability Schema
// ─────────────────────────────────────────────

export interface RoutingObservabilityRecord {
  timestamp: string;
  taskClass: TaskClass;
  complexity: ComplexityLevel;
  selectedProvider: ProviderName;
  selectedModel: string;
  tier: RoutingTier;
  fallbackUsed: boolean;
  fallbackProvider?: ProviderName;
  routingReason: string;
  retryCount: number;
  structureValid: boolean;
  latencyMs?: number;
  estimatedCostPosture: "economy" | "balanced" | "premium";
  premiumEscalation: boolean;
}

// ─────────────────────────────────────────────
// §8  Cost Estimation
// ─────────────────────────────────────────────

/** Cost per token by model (approximate, in USD) */
export const MODEL_COST_PER_TOKEN: Record<string, number> = {
  [CANONICAL_MODELS.DEEPSEEK_CHAT]: 0.00000027,        // ~$0.27/M
  [CANONICAL_MODELS.DEEPSEEK_REASONER]: 0.00000055,     // ~$0.55/M
  [CANONICAL_MODELS.GPT5_NANO]: 0.0000003,              // ~$0.30/M
  [CANONICAL_MODELS.GPT5_MINI]: 0.0000006,              // ~$0.60/M
  [CANONICAL_MODELS.GPT5_4]: 0.000003,                  // ~$3.00/M
  [CANONICAL_MODELS.GATEWAY_GPT5_NANO]: 0.0000003,
  [CANONICAL_MODELS.GATEWAY_GPT5_MINI]: 0.0000006,
  [CANONICAL_MODELS.GATEWAY_GPT5_4]: 0.000003,
};

export function estimateTokenCost(model: string, tokens: number): number {
  // Normalize gateway prefix
  const normalized = model.replace("openai/", "");
  const perToken = MODEL_COST_PER_TOKEN[model] || MODEL_COST_PER_TOKEN[normalized] || 0.000001;
  return tokens * perToken;
}

// ─────────────────────────────────────────────
// §9  Tier Helpers
// ─────────────────────────────────────────────

export const TIER_COST_MULTIPLIER: Record<RoutingTier, number> = {
  economy: 0.15,
  balanced: 0.4,
  high_confidence: 1.0,
  premium: 3.0,
};

export const TIER_CONFIDENCE_MAP: Record<RoutingTier, "low" | "medium" | "high" | "critical"> = {
  economy: "low",
  balanced: "medium",
  high_confidence: "high",
  premium: "critical",
};

/**
 * Resolve a task class from the matrix.
 * Returns the full routing entry with all metadata.
 */
export function resolveRoute(taskClass: TaskClass): RoutingMatrixEntry {
  return ROUTING_MATRIX[taskClass] || ROUTING_MATRIX.generic;
}

/**
 * Get the task class for a known pipeline stage.
 */
export function taskClassForStage(stage: string): TaskClass {
  return STAGE_TASK_MAP[stage] || "generic";
}

/**
 * Get tier label for a model (for observability).
 */
export function getModelTier(model: string): ComplexityLevel {
  const m = model.replace("openai/", "");
  if (m.includes("nano") || m === "deepseek-chat") return "low";
  if (m.includes("mini") || m.includes("flash")) return "medium";
  if (m.includes("5.4") || m.includes("5.2") || m.includes("reasoner")) return "critical";
  if (m.includes("gpt-5")) return "high";
  return "medium";
}
