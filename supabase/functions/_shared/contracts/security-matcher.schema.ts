/**
 * Declarative Security Matcher Engine
 * 
 * Matcher-based validation engine for pipeline and deployment responses.
 * Supports status, word, regex matchers with AND/OR/NOT logic,
 * evidence extraction, severity metadata, and named rules.
 */

// ══════════════════════════════════════════════════
//  MATCHER TYPES
// ══════════════════════════════════════════════════

export type MatcherType = "status" | "word" | "regex" | "json_path";
export type MatchTarget = "status_code" | "body" | "headers" | "combined";
export type MatchSeverity = "info" | "low" | "medium" | "high" | "critical";
export type MatchLogic = "and" | "or";

export interface Matcher {
  type: MatcherType;
  target: MatchTarget;
  value: string | number | string[];
  negative: boolean;         // true = must NOT match
  case_sensitive: boolean;
}

// ══════════════════════════════════════════════════
//  VALIDATION RULE
// ══════════════════════════════════════════════════

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: MatchSeverity;
  logic: MatchLogic;          // how matchers combine: AND = all must match, OR = any
  matchers: Matcher[];
  extract_evidence: boolean;  // capture matching content as evidence
  tags: string[];
  enabled: boolean;
}

// ══════════════════════════════════════════════════
//  MATCH INPUT
// ══════════════════════════════════════════════════

export interface MatchInput {
  status_code?: number;
  body?: string;
  headers?: Record<string, string>;
}

// ══════════════════════════════════════════════════
//  MATCH RESULT
// ══════════════════════════════════════════════════

export interface MatchResult {
  rule_id: string;
  rule_name: string;
  matched: boolean;
  severity: MatchSeverity;
  evidence: string[];
  matcher_results: MatcherResult[];
}

export interface MatcherResult {
  matcher_type: MatcherType;
  target: MatchTarget;
  matched: boolean;
  evidence: string | null;
}

export interface ValidationReport {
  input_summary: string;
  rules_evaluated: number;
  rules_matched: number;
  results: MatchResult[];
  highest_severity: MatchSeverity | null;
  passed: boolean;           // true if no high/critical matches
  evaluated_at: string;
}

// ══════════════════════════════════════════════════
//  MATCHER ENGINE
// ══════════════════════════════════════════════════

function getTargetContent(input: MatchInput, target: MatchTarget): string {
  switch (target) {
    case "status_code": return String(input.status_code ?? "");
    case "body": return input.body ?? "";
    case "headers": return input.headers ? JSON.stringify(input.headers) : "";
    case "combined": return [
      String(input.status_code ?? ""),
      input.body ?? "",
      input.headers ? JSON.stringify(input.headers) : "",
    ].join("\n");
  }
}

function executeMatcher(matcher: Matcher, input: MatchInput): MatcherResult {
  const content = getTargetContent(input, matcher.target);
  let matched = false;
  let evidence: string | null = null;

  switch (matcher.type) {
    case "status": {
      const codes = Array.isArray(matcher.value) 
        ? matcher.value.map(Number) 
        : [Number(matcher.value)];
      matched = codes.includes(input.status_code ?? 0);
      if (matched) evidence = `status=${input.status_code}`;
      break;
    }
    case "word": {
      const words = Array.isArray(matcher.value) ? matcher.value : [String(matcher.value)];
      const haystack = matcher.case_sensitive ? content : content.toLowerCase();
      for (const word of words) {
        const needle = matcher.case_sensitive ? word : word.toLowerCase();
        if (haystack.includes(needle)) {
          matched = true;
          // Extract context around the match
          const idx = haystack.indexOf(needle);
          evidence = content.substring(Math.max(0, idx - 30), idx + needle.length + 30);
          break;
        }
      }
      break;
    }
    case "regex": {
      const flags = matcher.case_sensitive ? "g" : "gi";
      const re = new RegExp(String(matcher.value), flags);
      const m = re.exec(content);
      if (m) {
        matched = true;
        evidence = m[0];
      }
      break;
    }
    case "json_path": {
      // Simple dot-path extraction from body
      try {
        const obj = JSON.parse(input.body ?? "{}");
        const path = String(matcher.value).split(".");
        let val: any = obj;
        for (const key of path) { val = val?.[key]; }
        matched = val !== undefined && val !== null;
        if (matched) evidence = JSON.stringify(val).slice(0, 200);
      } catch { matched = false; }
      break;
    }
  }

  // Apply negation
  if (matcher.negative) matched = !matched;

  return { matcher_type: matcher.type, target: matcher.target, matched, evidence: matched ? evidence : null };
}

export function evaluateRule(rule: ValidationRule, input: MatchInput): MatchResult {
  if (!rule.enabled) {
    return { rule_id: rule.id, rule_name: rule.name, matched: false, severity: rule.severity, evidence: [], matcher_results: [] };
  }

  const matcherResults = rule.matchers.map(m => executeMatcher(m, input));
  
  const matched = rule.logic === "and"
    ? matcherResults.every(r => r.matched)
    : matcherResults.some(r => r.matched);

  const evidence = rule.extract_evidence
    ? matcherResults.filter(r => r.evidence).map(r => r.evidence!)
    : [];

  return { rule_id: rule.id, rule_name: rule.name, matched, severity: rule.severity, evidence, matcher_results: matcherResults };
}

const SEVERITY_ORDER: Record<MatchSeverity, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };

/**
 * Evaluate security matcher rules against input.
 * Renamed from evaluateRules to avoid collision with prevention-evaluator.ts
 * which has its own evaluateRules(ActiveRule[], PipelineRuleContext) for
 * pipeline guardrails (different domain, different signature).
 */
export function evaluateSecurityRules(rules: ValidationRule[], input: MatchInput): ValidationReport {
  const results = rules.map(r => evaluateRule(r, input));
  const matchedResults = results.filter(r => r.matched);
  
  let highest: MatchSeverity | null = null;
  for (const r of matchedResults) {
    if (!highest || SEVERITY_ORDER[r.severity] > SEVERITY_ORDER[highest]) {
      highest = r.severity;
    }
  }

  const passed = !highest || SEVERITY_ORDER[highest] < SEVERITY_ORDER["high"];

  return {
    input_summary: `status=${input.status_code ?? "?"}, body_length=${input.body?.length ?? 0}`,
    rules_evaluated: rules.length,
    rules_matched: matchedResults.length,
    results,
    highest_severity: highest,
    passed,
    evaluated_at: new Date().toISOString(),
  };
}

// evaluateRules alias removed in IH-4 — all consumers migrated to evaluateSecurityRules

// ══════════════════════════════════════════════════
//  STRUCTURED OBSERVABILITY HELPER
// ══════════════════════════════════════════════════

export interface MatcherLogEntry {
  function_name: string;
  report: ValidationReport;
  matched_rule_ids: string[];
  highest_severity: MatchSeverity | null;
  evidence_summary: string[];
}

/**
 * Produce a structured log entry from a matcher report.
 * Use with pipelineLog or audit logging for consistent observability.
 */
export function buildMatcherLogEntry(functionName: string, report: ValidationReport): MatcherLogEntry {
  const matchedRules = report.results.filter(r => r.matched);
  return {
    function_name: functionName,
    report,
    matched_rule_ids: matchedRules.map(r => r.rule_id),
    highest_severity: report.highest_severity,
    evidence_summary: matchedRules.flatMap(r => r.evidence).slice(0, 10),
  };
}

// ══════════════════════════════════════════════════
//  BUILT-IN RULES — Pipeline & Deploy Security
// ══════════════════════════════════════════════════

export const PIPELINE_SECURITY_RULES: ValidationRule[] = [
  {
    id: "SEC-001", name: "Server Error Detection", description: "Detects 5xx server errors in responses",
    severity: "high", logic: "or", extract_evidence: true, tags: ["error", "server"], enabled: true,
    matchers: [
      { type: "status", target: "status_code", value: ["500", "502", "503", "504"], negative: false, case_sensitive: false },
    ],
  },
  {
    id: "SEC-002", name: "Auth Failure Detection", description: "Detects authentication failures",
    severity: "high", logic: "or", extract_evidence: true, tags: ["auth", "security"], enabled: true,
    matchers: [
      { type: "status", target: "status_code", value: ["401", "403"], negative: false, case_sensitive: false },
      { type: "word", target: "body", value: ["unauthorized", "forbidden", "access denied"], negative: false, case_sensitive: false },
    ],
  },
  {
    id: "SEC-003", name: "Sensitive Data Leak", description: "Detects potential secrets in responses",
    severity: "critical", logic: "or", extract_evidence: true, tags: ["leak", "security"], enabled: true,
    matchers: [
      { type: "regex", target: "body", value: "(?:sk_live_|pk_live_|ghp_|gho_|AKIA[A-Z0-9]{16})", negative: false, case_sensitive: true },
      { type: "regex", target: "body", value: "(?:password|secret|api_key)\\s*[:=]\\s*[\"'][^\"']{8,}", negative: false, case_sensitive: false },
    ],
  },
  {
    id: "SEC-004", name: "Build Failure Indicators", description: "Detects common build failure patterns",
    severity: "medium", logic: "or", extract_evidence: true, tags: ["build", "deploy"], enabled: true,
    matchers: [
      { type: "word", target: "body", value: ["ENOENT", "MODULE_NOT_FOUND", "Cannot find module", "SyntaxError"], negative: false, case_sensitive: false },
      { type: "regex", target: "body", value: "error TS\\d{4}:", negative: false, case_sensitive: false },
    ],
  },
  {
    id: "SEC-005", name: "Cross-Tenant Inference", description: "Detects error messages that may leak tenant info",
    severity: "high", logic: "or", extract_evidence: true, tags: ["isolation", "security"], enabled: true,
    matchers: [
      { type: "regex", target: "body", value: "organization.*(not found|does not exist|invalid)", negative: false, case_sensitive: false },
      { type: "regex", target: "body", value: "foreign key.*violat", negative: false, case_sensitive: false },
    ],
  },
  {
    id: "DEPLOY-001", name: "Vercel Deploy Error", description: "Detects Vercel-specific deployment failures",
    severity: "high", logic: "or", extract_evidence: true, tags: ["deploy", "vercel"], enabled: true,
    matchers: [
      { type: "word", target: "body", value: ["VERCEL_DEPLOY_FAILED", "VERCEL_PROJECT_CREATE_FAILED", "VERCEL_EXCEPTION"], negative: false, case_sensitive: false },
    ],
  },
  {
    id: "DEPLOY-002", name: "Health Check Failure", description: "Post-deploy health check failed",
    severity: "medium", logic: "and", extract_evidence: true, tags: ["deploy", "health"], enabled: true,
    matchers: [
      { type: "word", target: "body", value: ["unhealthy"], negative: false, case_sensitive: false },
    ],
  },
];
