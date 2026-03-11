/**
 * Canon Source Registry — Sprint 139
 * Validates and builds source registration records.
 */

export interface SourceRegistrationInput {
  source_name: string;
  source_type: string;
  source_url?: string;
  domain_scope?: string;
  sync_policy?: string;
  source_notes?: string;
  created_by: string;
}

export interface SourceRegistrationResult {
  valid: boolean;
  errors: string[];
  record: Record<string, unknown> | null;
}

const VALID_SOURCE_TYPES = [
  "external_documentation",
  "internal_runtime_learning",
  "internal_postmortem",
  "official_framework_docs",
  "technical_reference",
  "methodology_reference",
] as const;

const VALID_SYNC_POLICIES = ["manual", "periodic", "event_driven", "disabled"] as const;

export function buildSourceRegistration(input: SourceRegistrationInput): SourceRegistrationResult {
  const errors: string[] = [];

  if (!input.source_name || input.source_name.length < 3) {
    errors.push("source_name must be at least 3 characters");
  }
  if (!input.created_by) {
    errors.push("created_by is required");
  }
  if (!VALID_SOURCE_TYPES.includes(input.source_type as any)) {
    errors.push(`source_type must be one of: ${VALID_SOURCE_TYPES.join(", ")}`);
  }
  if (input.sync_policy && !VALID_SYNC_POLICIES.includes(input.sync_policy as any)) {
    errors.push(`sync_policy must be one of: ${VALID_SYNC_POLICIES.join(", ")}`);
  }

  if (errors.length > 0) return { valid: false, errors, record: null };

  return {
    valid: true,
    errors: [],
    record: {
      source_name: input.source_name,
      source_type: input.source_type,
      source_url: input.source_url || "",
      domain_scope: input.domain_scope || "general",
      trust_level: "unknown",
      ingestion_status: "pending",
      sync_policy: input.sync_policy || "manual",
      approved_categories: [],
      source_notes: input.source_notes || "",
      created_by: input.created_by,
      status: "active",
    },
  };
}

export function getValidSourceTypes(): string[] {
  return [...VALID_SOURCE_TYPES];
}

export function getValidSyncPolicies(): string[] {
  return [...VALID_SYNC_POLICIES];
}
