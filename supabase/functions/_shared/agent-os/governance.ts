/**
 * Agent Governance Layer — v1.1
 *
 * Control, trust, approval and compliance framework for all agent operations.
 *
 * Design principles:
 *  - Infrastructure-agnostic: no DB / identity provider dependency in contracts
 *  - Decision-first: every governance evaluation yields a deterministic GovernanceDecision
 *  - Auditable: every decision produces an AuditRecord
 *  - Override-safe: controlled escape hatches with mandatory justification
 */

// ─── Trust ───────────────────────────────────────────────────

export type AgentTrustLevel =
  | "trusted"
  | "certified"
  | "experimental"
  | "restricted"
  | "deprecated"
  | "blocked";

export const TRUST_LEVEL_RANK: Record<AgentTrustLevel, number> = {
  blocked: 0,
  deprecated: 1,
  restricted: 2,
  experimental: 3,
  certified: 4,
  trusted: 5,
};

export interface TrustProfile {
  agent_id: string;
  level: AgentTrustLevel;
  certified_capabilities: string[];
  restricted_capabilities: string[];
  trust_score: number; // 0-1
  last_evaluated_at: string;
  evaluation_reason: string;
  promotion_eligible: boolean;
  demotion_risk: boolean;
}

// ─── Risk ────────────────────────────────────────────────────

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskClassification {
  level: RiskLevel;
  factors: RiskFactor[];
  computed_at: string;
  overall_score: number; // 0-1
}

export interface RiskFactor {
  name: string;
  weight: number;
  value: number;
  description: string;
}

// ─── Autonomy ────────────────────────────────────────────────

export interface AutonomyLimit {
  max_autonomous_steps: number;
  max_cost_usd_without_approval: number;
  max_external_tool_calls: number;
  allow_production_writes: boolean;
  allow_external_communications: boolean;
  require_human_approval_for: SensitiveAction[];
  max_tokens_per_run: number;
}

export type SensitiveAction =
  | "publish_content"
  | "send_external_communication"
  | "write_production_data"
  | "execute_code_production"
  | "use_restricted_tool"
  | "delete_data"
  | "modify_infrastructure"
  | "access_sensitive_data"
  | "financial_transaction";

export const DEFAULT_AUTONOMY_LIMIT: AutonomyLimit = {
  max_autonomous_steps: 50,
  max_cost_usd_without_approval: 5.0,
  max_external_tool_calls: 20,
  allow_production_writes: false,
  allow_external_communications: false,
  require_human_approval_for: [
    "publish_content",
    "write_production_data",
    "execute_code_production",
    "delete_data",
    "modify_infrastructure",
  ],
  max_tokens_per_run: 500_000,
};

// ─── Access Control ──────────────────────────────────────────

export type AccessScopeLevel =
  | "read_only"
  | "write_limited"
  | "write_full"
  | "tool_restricted"
  | "environment_restricted";

export interface AccessScope {
  level: AccessScopeLevel;
  allowed_environments: string[];
  allowed_tools: string[];
  denied_tools: string[];
  allowed_capabilities: string[];
  denied_capabilities: string[];
  data_classifications_allowed: string[];
}

export interface AccessControlEntry {
  agent_id: string;
  scope: AccessScope;
  granted_by: string;
  granted_at: string;
  expires_at?: string;
  reason: string;
}

// ─── Governance Rules ────────────────────────────────────────

export interface GovernanceRule {
  rule_id: string;
  name: string;
  description: string;
  category: GovernanceRuleCategory;
  severity: RiskLevel;
  condition: GovernanceCondition;
  action: GovernanceAction;
  enabled: boolean;
  priority: number;
  applies_to: GovernanceScope;
}

export type GovernanceRuleCategory =
  | "trust"
  | "autonomy"
  | "access_control"
  | "compliance"
  | "cost"
  | "safety"
  | "data_protection";

export interface GovernanceCondition {
  field: string;
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "in" | "not_in" | "contains" | "matches";
  value: unknown;
  logical_group?: "and" | "or";
}

export interface GovernanceAction {
  type: GovernanceActionType;
  params?: Record<string, unknown>;
}

export type GovernanceActionType =
  | "allow"
  | "deny"
  | "require_approval"
  | "warn"
  | "downgrade_autonomy"
  | "restrict_tools"
  | "restrict_environment"
  | "audit_only"
  | "escalate";

export interface GovernanceScope {
  environments?: string[];
  agent_trust_levels?: AgentTrustLevel[];
  capability_ids?: string[];
  organization_ids?: string[];
}

// ─── Governance Profile ──────────────────────────────────────

export interface GovernanceProfile {
  agent_id: string;
  trust: TrustProfile;
  autonomy: AutonomyLimit;
  access: AccessScope;
  risk: RiskClassification;
  applicable_rules: string[]; // rule_ids
  last_evaluated_at: string;
}

// ─── Approval Workflow ───────────────────────────────────────

export interface ApprovalRequirement {
  requirement_id: string;
  action: SensitiveAction;
  min_approver_role: string;
  required_approvals: number;
  timeout_hours: number;
  auto_deny_on_timeout: boolean;
  escalation_path?: string[];
  context_required: boolean;
}

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "denied"
  | "expired"
  | "escalated"
  | "cancelled";

export interface ApprovalRequest {
  request_id: string;
  run_id: string;
  agent_id: string;
  action: SensitiveAction;
  context: Record<string, unknown>;
  justification: string;
  risk_level: RiskLevel;
  requested_at: string;
  requested_by: string;
  requirement: ApprovalRequirement;
}

export interface ApprovalDecision {
  request_id: string;
  status: ApprovalStatus;
  decided_by: string;
  decided_at: string;
  comment?: string;
  conditions?: string[];
  valid_until?: string;
}

// ─── Compliance ──────────────────────────────────────────────

export interface ComplianceConstraint {
  constraint_id: string;
  name: string;
  description: string;
  category: ComplianceCategory;
  enforcement: "strict" | "advisory";
  applies_to: GovernanceScope;
  rules: GovernanceRule[];
}

export type ComplianceCategory =
  | "data_protection"
  | "retention"
  | "access"
  | "environment"
  | "tool_usage"
  | "cost"
  | "regulatory"
  | "organizational";

export interface ComplianceEvaluationResult {
  compliant: boolean;
  constraint_id: string;
  violations: ComplianceViolation[];
  warnings: string[];
  evaluated_at: string;
}

export interface ComplianceViolation {
  constraint_id: string;
  rule_id: string;
  severity: RiskLevel;
  description: string;
  remediation?: string;
}

// ─── Audit ───────────────────────────────────────────────────

export interface AuditRecord {
  audit_id: string;
  timestamp: string;
  run_id?: string;
  agent_id?: string;
  action_type: string;
  action_detail: string;
  requester_id: string;
  governance_rule_id?: string;
  approval_required: boolean;
  approval_decision?: ApprovalStatus;
  override_applied: boolean;
  override_id?: string;
  final_decision: GovernanceVerdict;
  risk_level: RiskLevel;
  metadata: Record<string, unknown>;
}

// ─── Override ────────────────────────────────────────────────

export interface OverrideRequest {
  override_id: string;
  rule_id: string;
  reason: string;
  requested_by: string;
  requested_at: string;
  scope: OverrideScope;
  expires_at: string;
  risk_acknowledgement: boolean;
}

export interface OverrideScope {
  run_ids?: string[];
  agent_ids?: string[];
  capability_ids?: string[];
  environment?: string;
  max_uses?: number;
}

export interface OverrideDecision {
  override_id: string;
  approved: boolean;
  decided_by: string;
  decided_at: string;
  comment?: string;
  conditions?: string[];
}

export interface ActiveOverride {
  override_id: string;
  rule_id: string;
  decision: OverrideDecision;
  scope: OverrideScope;
  expires_at: string;
  uses_remaining?: number;
  active: boolean;
}

// ─── Governance Evaluation & Decision ────────────────────────

export type GovernanceVerdict = "allow" | "deny" | "require_approval" | "allow_with_restrictions";

export interface GovernanceEvaluation {
  run_id: string;
  agent_id: string;
  action: string;
  trust_level: AgentTrustLevel;
  risk: RiskClassification;
  autonomy_check: AutonomyCheckResult;
  access_check: AccessCheckResult;
  compliance_results: ComplianceEvaluationResult[];
  applicable_overrides: ActiveOverride[];
  rules_evaluated: GovernanceRuleEvaluation[];
}

export interface GovernanceRuleEvaluation {
  rule_id: string;
  matched: boolean;
  action: GovernanceActionType;
  reason: string;
}

export interface AutonomyCheckResult {
  within_limits: boolean;
  violations: string[];
  current_step_count: number;
  current_cost_usd: number;
  current_tool_calls: number;
}

export interface AccessCheckResult {
  granted: boolean;
  scope: AccessScopeLevel;
  denied_reasons: string[];
}

export interface GovernanceDecision {
  evaluation: GovernanceEvaluation;
  verdict: GovernanceVerdict;
  restrictions?: GovernanceRestriction[];
  approval_required?: ApprovalRequirement;
  audit_record: AuditRecord;
  decided_at: string;
}

export interface GovernanceRestriction {
  type: "tool_deny" | "environment_deny" | "cost_cap" | "step_cap" | "read_only";
  value: unknown;
  reason: string;
}

// ─── Core Interfaces ─────────────────────────────────────────

export interface IGovernanceRegistry {
  getProfile(agent_id: string): GovernanceProfile | undefined;
  setProfile(agent_id: string, profile: GovernanceProfile): void;
  addRule(rule: GovernanceRule): void;
  removeRule(rule_id: string): void;
  getRules(scope?: GovernanceScope): GovernanceRule[];
  addComplianceConstraint(constraint: ComplianceConstraint): void;
  getComplianceConstraints(scope?: GovernanceScope): ComplianceConstraint[];
}

export interface ITrustEvaluator {
  evaluate(agent_id: string, history: Record<string, unknown>): TrustProfile;
  promote(agent_id: string, reason: string): TrustProfile;
  demote(agent_id: string, reason: string): TrustProfile;
  block(agent_id: string, reason: string): void;
  getTrustLevel(agent_id: string): AgentTrustLevel;
}

export interface IAutonomyController {
  check(agent_id: string, context: Record<string, unknown>): AutonomyCheckResult;
  getLimits(agent_id: string): AutonomyLimit;
  setLimits(agent_id: string, limits: AutonomyLimit): void;
}

export interface IApprovalEngine {
  requestApproval(request: ApprovalRequest): Promise<string>; // returns request_id
  decide(decision: ApprovalDecision): Promise<void>;
  getStatus(request_id: string): ApprovalStatus;
  listPending(approver_id?: string): ApprovalRequest[];
  cancel(request_id: string, reason: string): void;
}

export interface IAccessControlManager {
  check(agent_id: string, action: string, environment: string): AccessCheckResult;
  grant(entry: AccessControlEntry): void;
  revoke(agent_id: string, reason: string): void;
  getScope(agent_id: string): AccessScope | undefined;
}

export interface IComplianceEvaluator {
  evaluate(agent_id: string, action: string, context: Record<string, unknown>): ComplianceEvaluationResult[];
  addConstraint(constraint: ComplianceConstraint): void;
  removeConstraint(constraint_id: string): void;
}

export interface IAuditLedger {
  record(entry: AuditRecord): void;
  query(filter: AuditQueryFilter): AuditRecord[];
  export(filter: AuditQueryFilter, format: "json" | "csv"): string;
}

export interface AuditQueryFilter {
  run_id?: string;
  agent_id?: string;
  action_type?: string;
  verdict?: GovernanceVerdict;
  risk_level?: RiskLevel;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export interface IOverrideManager {
  request(override: OverrideRequest): string; // returns override_id
  decide(decision: OverrideDecision): void;
  getActive(rule_id?: string): ActiveOverride[];
  revoke(override_id: string, reason: string): void;
  isOverridden(rule_id: string, context: Record<string, unknown>): boolean;
}

export interface IGovernanceLayer {
  evaluate(agent_id: string, action: string, context: Record<string, unknown>): Promise<GovernanceDecision>;
  getProfile(agent_id: string): GovernanceProfile | undefined;
  registry: IGovernanceRegistry;
  trust: ITrustEvaluator;
  autonomy: IAutonomyController;
  approval: IApprovalEngine;
  access: IAccessControlManager;
  compliance: IComplianceEvaluator;
  audit: IAuditLedger;
  overrides: IOverrideManager;
}

// ─── Events ──────────────────────────────────────────────────

export type GovernanceEventType =
  | "governance.evaluation_started"
  | "governance.evaluation_completed"
  | "governance.action_allowed"
  | "governance.action_denied"
  | "governance.approval_required"
  | "governance.approval_granted"
  | "governance.approval_denied"
  | "governance.approval_expired"
  | "governance.approval_escalated"
  | "governance.trust_promoted"
  | "governance.trust_demoted"
  | "governance.trust_blocked"
  | "governance.autonomy_limit_reached"
  | "governance.access_denied"
  | "governance.compliance_violation"
  | "governance.compliance_warning"
  | "governance.override_requested"
  | "governance.override_approved"
  | "governance.override_revoked"
  | "governance.audit_recorded"
  | "governance.risk_escalated";

// ─── Configuration ───────────────────────────────────────────

export interface GovernanceConfig {
  default_trust_level: AgentTrustLevel;
  default_autonomy: AutonomyLimit;
  default_access_scope: AccessScopeLevel;
  approval_timeout_hours: number;
  auto_deny_on_timeout: boolean;
  require_risk_acknowledgement_for_overrides: boolean;
  audit_retention_days: number;
  max_active_overrides_per_rule: number;
}

export const DEFAULT_GOVERNANCE_CONFIG: GovernanceConfig = {
  default_trust_level: "experimental",
  default_autonomy: DEFAULT_AUTONOMY_LIMIT,
  default_access_scope: "read_only",
  approval_timeout_hours: 24,
  auto_deny_on_timeout: true,
  require_risk_acknowledgement_for_overrides: true,
  audit_retention_days: 365,
  max_active_overrides_per_rule: 3,
};
