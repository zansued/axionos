/**
 * Input Validation & Schema Enforcement — Sprint 194
 * Shared reusable validation layer for AxionOS edge functions.
 * 
 * Provides strict, typed schema validation without external dependencies.
 * All edge functions should use these helpers to validate request payloads.
 */

// ─── Core Types ───

export interface ValidationError {
  field: string;
  message: string;
  received?: unknown;
}

export interface ValidationResult<T = Record<string, unknown>> {
  valid: boolean;
  errors: ValidationError[];
  data: T | null;
}

// ─── Field Validators ───

type FieldRule = {
  type: "string" | "number" | "boolean" | "array" | "object" | "uuid";
  required?: boolean;
  enum?: readonly string[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  trim?: boolean;
  default?: unknown;
  validate?: (value: unknown) => string | null; // custom validator, return error msg or null
};

export type Schema = Record<string, FieldRule>;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_STRING_MAX = 10000;

/**
 * Validate a payload against a schema definition.
 * Returns typed, validated data or structured errors.
 */
export function validateSchema<T = Record<string, unknown>>(
  payload: Record<string, unknown>,
  schema: Schema
): ValidationResult<T> {
  const errors: ValidationError[] = [];
  const data: Record<string, unknown> = {};

  for (const [field, rule] of Object.entries(schema)) {
    let value = payload[field];

    // Handle defaults
    if (value === undefined || value === null) {
      if (rule.default !== undefined) {
        data[field] = rule.default;
        continue;
      }
      if (rule.required !== false) {
        errors.push({ field, message: `${field} is required` });
      }
      continue;
    }

    // Type checks
    switch (rule.type) {
      case "string": {
        if (typeof value !== "string") {
          errors.push({ field, message: `${field} must be a string`, received: typeof value });
          continue;
        }
        if (rule.trim !== false) value = (value as string).trim();
        const s = value as string;
        if (s.length > (rule.maxLength ?? SAFE_STRING_MAX)) {
          errors.push({ field, message: `${field} exceeds max length of ${rule.maxLength ?? SAFE_STRING_MAX}` });
          continue;
        }
        if (rule.minLength !== undefined && s.length < rule.minLength) {
          errors.push({ field, message: `${field} must be at least ${rule.minLength} characters` });
          continue;
        }
        if (rule.enum && !rule.enum.includes(s)) {
          errors.push({ field, message: `${field} must be one of: ${rule.enum.join(", ")}`, received: s });
          continue;
        }
        if (rule.pattern && !rule.pattern.test(s)) {
          errors.push({ field, message: `${field} has invalid format` });
          continue;
        }
        data[field] = s;
        break;
      }

      case "uuid": {
        if (typeof value !== "string" || !UUID_REGEX.test(value)) {
          errors.push({ field, message: `${field} must be a valid UUID`, received: value });
          continue;
        }
        data[field] = value;
        break;
      }

      case "number": {
        const n = typeof value === "string" ? Number(value) : value;
        if (typeof n !== "number" || isNaN(n as number)) {
          errors.push({ field, message: `${field} must be a number`, received: typeof value });
          continue;
        }
        if (rule.min !== undefined && (n as number) < rule.min) {
          errors.push({ field, message: `${field} must be >= ${rule.min}`, received: n });
          continue;
        }
        if (rule.max !== undefined && (n as number) > rule.max) {
          errors.push({ field, message: `${field} must be <= ${rule.max}`, received: n });
          continue;
        }
        data[field] = n;
        break;
      }

      case "boolean": {
        if (typeof value !== "boolean") {
          errors.push({ field, message: `${field} must be a boolean`, received: typeof value });
          continue;
        }
        data[field] = value;
        break;
      }

      case "array": {
        if (!Array.isArray(value)) {
          errors.push({ field, message: `${field} must be an array`, received: typeof value });
          continue;
        }
        data[field] = value;
        break;
      }

      case "object": {
        if (typeof value !== "object" || Array.isArray(value) || value === null) {
          errors.push({ field, message: `${field} must be an object`, received: typeof value });
          continue;
        }
        data[field] = value;
        break;
      }
    }

    // Custom validator
    if (rule.validate && data[field] !== undefined) {
      const customError = rule.validate(data[field]);
      if (customError) {
        errors.push({ field, message: customError });
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, data: null };
  }
  return { valid: true, errors: [], data: data as T };
}

// ─── Structured Error Response ───

import { jsonResponse } from "./cors.ts";

/**
 * Return a structured 400 validation error response.
 */
export function validationErrorResponse(errors: ValidationError[], req?: Request): Response {
  return jsonResponse({
    error: "Validation failed",
    validation_errors: errors.map(e => ({
      field: e.field,
      message: e.message,
    })),
  }, 400, req);
}

// ─── Safe Body Parser ───

/**
 * Safely parse JSON body with size limit.
 * Returns parsed body or a 400 error Response.
 */
export async function parseAndValidateBody(
  req: Request,
  schema: Schema
): Promise<ValidationResult & { response?: Response }> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return {
      valid: false,
      errors: [{ field: "_body", message: "Invalid JSON body" }],
      data: null,
      response: jsonResponse({ error: "Invalid JSON body" }, 400, req),
    };
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      valid: false,
      errors: [{ field: "_body", message: "Request body must be a JSON object" }],
      data: null,
      response: jsonResponse({ error: "Request body must be a JSON object" }, 400, req),
    };
  }

  const result = validateSchema(body, schema);
  if (!result.valid) {
    return {
      ...result,
      response: validationErrorResponse(result.errors, req),
    };
  }

  // Pass through un-schema'd fields for backward compat
  return { ...result, data: { ...body, ...result.data } };
}

// ─── Common Shared Enums ───

export const COMMON_ACTIONS = {
  RED_TEAM: [
    "list_exercises", "list_scenarios", "list_runs", "list_findings",
    "list_reviews", "run_simulation", "overview",
  ] as const,

  BLUE_TEAM: [
    "overview", "list_alerts", "list_incidents", "list_response_actions",
    "list_containment", "list_recovery", "list_runbooks",
    "detect_signal", "assess_incident",
  ] as const,

  PURPLE_LEARNING: [
    "overview", "list_candidates", "list_patterns", "list_anti_patterns",
    "list_checklists", "list_rules", "list_reviews",
    "synthesize", "get_secure_dev_feedback", "explain_pattern",
  ] as const,

  CANON_INGESTION: [
    "ingest_source", "ingest_all", "seed_sources",
  ] as const,

  CANON_PROMOTION: [
    "create_record_from_candidate", "review_record", "approve_record",
    "activate_record", "deprecate_record", "list_canon_records", "canon_summary",
  ] as const,

  KNOWLEDGE_ACQUISITION: [
    "enqueue_plan", "execute_next", "list_jobs", "job_detail",
    "cancel_job", "retry_job", "pause_all", "resume_all", "overview",
  ] as const,

  CANON_POISONING: [
    "assess_candidate", "assess_batch", "quarantine_candidate",
    "release_candidate", "check_promotion_gate",
  ] as const,
} as const;

// ─── Reusable Schema Fragments ───

export const COMMON_FIELDS = {
  action: (validActions: readonly string[]): FieldRule => ({
    type: "string",
    required: true,
    enum: validActions,
  }),

  organization_id: {
    type: "uuid" as const,
    required: false, // resolved from membership when missing
  },

  uuid_required: {
    type: "uuid" as const,
    required: true,
  },

  uuid_optional: {
    type: "uuid" as const,
    required: false,
  },

  confidence_score: {
    type: "number" as const,
    required: false,
    min: 0,
    max: 100,
  },

  severity: {
    type: "string" as const,
    required: false,
    enum: ["info", "low", "medium", "high", "critical"] as const,
  },

  priority: {
    type: "string" as const,
    required: false,
    enum: ["low", "medium", "high", "critical"] as const,
  },

  github_url: {
    type: "string" as const,
    required: true,
    pattern: /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+\/?$/,
    maxLength: 500,
  },

  safe_string: (maxLen = 500): FieldRule => ({
    type: "string",
    required: false,
    maxLength: maxLen,
    trim: true,
  }),

  safe_string_required: (maxLen = 500): FieldRule => ({
    type: "string",
    required: true,
    minLength: 1,
    maxLength: maxLen,
    trim: true,
  }),
};

// ─── Validation Audit Helper ───

/**
 * Log repeated validation failures for security analysis.
 * Fire-and-forget — does not throw.
 */
export async function logValidationFailure(
  serviceClient: any,
  context: {
    organization_id?: string;
    actor_id?: string;
    function_name: string;
    errors: ValidationError[];
  }
): Promise<void> {
  try {
    await serviceClient.from("security_audit_events").insert({
      organization_id: context.organization_id || "00000000-0000-0000-0000-000000000000",
      actor_id: context.actor_id || "anonymous",
      function_name: context.function_name,
      action: "validation_rejected",
      outcome: "rejected",
      context: {
        error_count: context.errors.length,
        fields: context.errors.map(e => e.field),
      },
    });
  } catch {
    // fire-and-forget
  }
}
