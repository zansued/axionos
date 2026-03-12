/**
 * Governance Change Application Tracking — Domain Types & Mock Data
 * Sprint 163 — Downstream application lifecycle tracking for governance-approved changes.
 */

// ── Application Status ─────────────────────────────────────────────────────

export type ApplicationStatus =
  | "pending_downstream_start"
  | "in_progress"
  | "partially_applied"
  | "awaiting_validation"
  | "stable"
  | "completed"
  | "blocked"
  | "drift_detected"
  | "rollback_in_progress"
  | "rolled_back"
  | "escalated_to_governance";

export interface ApplicationStatusDef {
  key: ApplicationStatus;
  label: string;
  color: string;
  terminal: boolean;
}

export const APPLICATION_STATUS_DEFS: Record<ApplicationStatus, ApplicationStatusDef> = {
  pending_downstream_start: { key: "pending_downstream_start", label: "Pending Start", color: "text-muted-foreground", terminal: false },
  in_progress:             { key: "in_progress", label: "In Progress", color: "text-blue-400", terminal: false },
  partially_applied:       { key: "partially_applied", label: "Partially Applied", color: "text-yellow-500", terminal: false },
  awaiting_validation:     { key: "awaiting_validation", label: "Awaiting Validation", color: "text-amber-400", terminal: false },
  stable:                  { key: "stable", label: "Stable", color: "text-emerald-400", terminal: false },
  completed:               { key: "completed", label: "Completed", color: "text-emerald-500", terminal: true },
  blocked:                 { key: "blocked", label: "Blocked", color: "text-destructive", terminal: false },
  drift_detected:          { key: "drift_detected", label: "Drift Detected", color: "text-orange-500", terminal: false },
  rollback_in_progress:    { key: "rollback_in_progress", label: "Rollback In Progress", color: "text-red-400", terminal: false },
  rolled_back:             { key: "rolled_back", label: "Rolled Back", color: "text-red-500", terminal: true },
  escalated_to_governance: { key: "escalated_to_governance", label: "Escalated", color: "text-purple-400", terminal: false },
};

// ── Scope Compliance ────────────────────────────────────────────────────────

export type ScopeComplianceStatus = "in_scope" | "minor_drift" | "material_drift" | "constraint_missing" | "validation_missing";

export const SCOPE_COMPLIANCE_LABELS: Record<ScopeComplianceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  in_scope:           { label: "In Scope", variant: "default" },
  minor_drift:        { label: "Minor Drift", variant: "secondary" },
  material_drift:     { label: "Material Drift", variant: "destructive" },
  constraint_missing: { label: "Constraint Missing", variant: "destructive" },
  validation_missing: { label: "Validation Missing", variant: "outline" },
};

// ── Sub-types ───────────────────────────────────────────────────────────────

export interface TimelineEvent {
  timestamp: string;
  eventType: string;
  actor: string;
  summary: string;
  status: string;
}

export interface OutcomeObservation {
  metricKey: string;
  label: string;
  expectedEffect: string;
  observedEffect: string;
  status: "positive" | "neutral" | "negative" | "unknown";
  confidence: number;
  summary: string;
}

export interface ApplicationAlert {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  type: string;
  detectedAt: string;
  summary: string;
  affectedSubsystem: string;
  recommendedAction: string;
}

export interface ConstraintCheck {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail" | "pending";
  required: boolean;
  message: string;
}

export interface AuditEntry {
  timestamp: string;
  actor: string;
  eventType: string;
  statusChange?: string;
  summary: string;
  linkedRef?: string;
}

export interface FollowUpAction {
  id: string;
  type: string;
  label: string;
  status: "available" | "triggered" | "completed";
  linkedProposalId?: string;
}

// ── Main Domain Object ─────────────────────────────────────────────────────

export interface ChangeApplication {
  applicationId: string;
  sourceProposalId: string;
  governanceDecisionRef: string;
  handoffId: string;
  proposalType: string;
  changeTitle: string;
  targetWorkflow: string;
  targetSubsystem: string;
  applicationStatus: ApplicationStatus;
  currentPhase: string;
  riskLevel: "critical" | "high" | "medium" | "low";
  scopeComplianceStatus: ScopeComplianceStatus;
  approvedScope: string;
  observedScope: string;
  constraints: string[];
  constraintChecks: ConstraintCheck[];
  monitoringRequirements: string[];
  validationRequirements: string[];
  rollbackExpectations: string;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  trackingOwner: string;
  timelineEvents: TimelineEvent[];
  outcomeObservations: OutcomeObservation[];
  alerts: ApplicationAlert[];
  auditHistory: AuditEntry[];
  followUpActions: FollowUpAction[];
  linkedEscalations: string[];
  linkedFollowUpProposalIds: string[];
}

// ── Overview ────────────────────────────────────────────────────────────────

export interface ApplicationOverview {
  activeApplications: number;
  completedApplications: number;
  blockedApplications: number;
  driftAlerts: number;
  rolledBack: number;
  governanceAttention: number;
  avgHandoffToCompletionHours: number;
  oldestActiveApplication: string;
  highRiskInProgress: number;
}

// ── Mock Data ───────────────────────────────────────────────────────────────

const now = new Date();
const h = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3600000).toISOString();

export const MOCK_APPLICATIONS: ChangeApplication[] = [
  {
    applicationId: "APP-001",
    sourceProposalId: "CEP-042",
    governanceDecisionRef: "GD-091",
    handoffId: "HO-078",
    proposalType: "canon_evolution",
    changeTitle: "Promote retry-with-backoff pattern to shared canon",
    targetWorkflow: "Canon Registry",
    targetSubsystem: "Canon Engine",
    applicationStatus: "in_progress",
    currentPhase: "Partial Rollout",
    riskLevel: "medium",
    scopeComplianceStatus: "in_scope",
    approvedScope: "Promote pattern P-112 to shared canon with version v2.1 constraints",
    observedScope: "Pattern P-112 promoted to shared canon, v2.1 constraints applied",
    constraints: ["Must not modify existing consumer contracts", "Rollback within 2h window", "Monitor error rate for 24h"],
    constraintChecks: [
      { key: "consumer_contracts", label: "Consumer contracts preserved", status: "pass", required: true, message: "No breaking changes detected" },
      { key: "rollback_window", label: "Rollback window active", status: "pass", required: true, message: "2h rollback window configured" },
      { key: "error_monitoring", label: "Error rate monitoring", status: "pass", required: true, message: "24h monitoring active" },
    ],
    monitoringRequirements: ["Error rate < 0.5% for 24h", "Canon usage quality score stable"],
    validationRequirements: ["Downstream consumer compatibility check", "Pattern versioning integrity"],
    rollbackExpectations: "Revert to pattern P-112 v2.0 via canon rollback API",
    startedAt: h(18),
    updatedAt: h(2),
    completedAt: null,
    trackingOwner: "Platform Team",
    timelineEvents: [
      { timestamp: h(18), eventType: "handoff_released", actor: "Governance Engine", summary: "Handoff HO-078 released to Canon Registry", status: "released" },
      { timestamp: h(17), eventType: "downstream_accepted", actor: "Canon Engine", summary: "Canon Engine acknowledged handoff", status: "accepted" },
      { timestamp: h(14), eventType: "application_started", actor: "Canon Engine", summary: "Pattern promotion initiated", status: "started" },
      { timestamp: h(6), eventType: "partial_rollout", actor: "Canon Engine", summary: "Pattern available to 40% of consumers", status: "in_progress" },
    ],
    outcomeObservations: [
      { metricKey: "error_rate", label: "Error Rate Delta", expectedEffect: "No increase", observedEffect: "-0.02% (improved)", status: "positive", confidence: 0.82, summary: "Error rate slightly improved after pattern promotion" },
      { metricKey: "canon_usage", label: "Canon Usage Quality", expectedEffect: "Stable or improved", observedEffect: "Stable at 94.2%", status: "positive", confidence: 0.78, summary: "No degradation observed" },
    ],
    alerts: [],
    auditHistory: [
      { timestamp: h(18), actor: "Governance Engine", eventType: "handoff_released", summary: "Handoff released for downstream application" },
      { timestamp: h(17), actor: "Canon Engine", eventType: "accepted", summary: "Downstream accepted the change package" },
      { timestamp: h(14), actor: "Canon Engine", eventType: "application_started", summary: "Started applying pattern promotion" },
      { timestamp: h(6), actor: "Canon Engine", eventType: "partial_rollout", summary: "Rolled out to 40% of consumers" },
    ],
    followUpActions: [
      { id: "fa-1", type: "monitor", label: "Continue 24h observation window", status: "available" },
      { id: "fa-2", type: "proposal", label: "Open follow-up canon refinement", status: "available" },
    ],
    linkedEscalations: [],
    linkedFollowUpProposalIds: [],
  },
  {
    applicationId: "APP-002",
    sourceProposalId: "PTU-019",
    governanceDecisionRef: "GD-088",
    handoffId: "HO-075",
    proposalType: "policy_tuning",
    changeTitle: "Adjust approval threshold for low-risk deploy actions",
    targetWorkflow: "Policy Engine",
    targetSubsystem: "Action Engine",
    applicationStatus: "drift_detected",
    currentPhase: "Validation Running",
    riskLevel: "high",
    scopeComplianceStatus: "minor_drift",
    approvedScope: "Lower approval threshold from 0.8 to 0.6 for deploy actions tagged low-risk",
    observedScope: "Threshold applied to all deploy actions including medium-risk (unintended)",
    constraints: ["Only affects low-risk tagged actions", "Must not lower threshold below 0.5", "Revert if approval bypass rate exceeds 15%"],
    constraintChecks: [
      { key: "risk_scope", label: "Risk scope limited to low-risk", status: "warn", required: true, message: "Medium-risk actions also affected — minor drift" },
      { key: "threshold_floor", label: "Threshold above 0.5", status: "pass", required: true, message: "Current threshold: 0.6" },
      { key: "bypass_rate", label: "Approval bypass rate < 15%", status: "pass", required: true, message: "Current bypass rate: 8.2%" },
    ],
    monitoringRequirements: ["Approval bypass rate tracked hourly", "Action failure rate post-deploy"],
    validationRequirements: ["Policy scope verification", "Risk tag accuracy check"],
    rollbackExpectations: "Revert threshold to 0.8 via policy config rollback",
    startedAt: h(42),
    updatedAt: h(1),
    completedAt: null,
    trackingOwner: "Governance Team",
    timelineEvents: [
      { timestamp: h(42), eventType: "handoff_released", actor: "Governance Engine", summary: "Handoff HO-075 released to Policy Engine", status: "released" },
      { timestamp: h(41), eventType: "downstream_accepted", actor: "Policy Engine", summary: "Policy Engine acknowledged handoff", status: "accepted" },
      { timestamp: h(38), eventType: "application_started", actor: "Policy Engine", summary: "Threshold adjustment applied", status: "started" },
      { timestamp: h(12), eventType: "validation_running", actor: "Policy Engine", summary: "Automated validation in progress", status: "validating" },
      { timestamp: h(1), eventType: "drift_detected", actor: "Scope Monitor", summary: "Medium-risk actions affected — not in approved scope", status: "drift" },
    ],
    outcomeObservations: [
      { metricKey: "approval_bypass", label: "Approval Bypass Rate", expectedEffect: "Moderate increase for low-risk only", observedEffect: "+12% across low+medium risk", status: "negative", confidence: 0.71, summary: "Bypass rate increase includes unintended medium-risk actions" },
      { metricKey: "deploy_failures", label: "Deploy Failure Rate", expectedEffect: "No change", observedEffect: "No significant change (+0.1%)", status: "neutral", confidence: 0.85, summary: "Deploy failure rate stable" },
    ],
    alerts: [
      { id: "alt-1", severity: "high", type: "scope_drift", detectedAt: h(1), summary: "Policy threshold change applied beyond approved scope — medium-risk actions affected", affectedSubsystem: "Action Engine", recommendedAction: "Review scope filter and consider constraining to low-risk only" },
    ],
    auditHistory: [
      { timestamp: h(42), actor: "Governance Engine", eventType: "handoff_released", summary: "Handoff released" },
      { timestamp: h(38), actor: "Policy Engine", eventType: "application_started", summary: "Threshold adjustment applied" },
      { timestamp: h(1), actor: "Scope Monitor", eventType: "drift_flagged", summary: "Drift detected: medium-risk scope inclusion", statusChange: "in_progress → drift_detected" },
    ],
    followUpActions: [
      { id: "fa-3", type: "escalate", label: "Escalate drift to Governance Decision Surface", status: "available" },
      { id: "fa-4", type: "proposal", label: "Open policy scope correction proposal", status: "available" },
    ],
    linkedEscalations: [],
    linkedFollowUpProposalIds: [],
  },
  {
    applicationId: "APP-003",
    sourceProposalId: "AST-007",
    governanceDecisionRef: "GD-085",
    handoffId: "HO-071",
    proposalType: "agent_selection_tuning",
    changeTitle: "Prefer DeepSeek for classification tasks under 2k tokens",
    targetWorkflow: "Agent Routing",
    targetSubsystem: "AgentOS Orchestrator",
    applicationStatus: "completed",
    currentPhase: "Completed",
    riskLevel: "low",
    scopeComplianceStatus: "in_scope",
    approvedScope: "Route classification tasks under 2k tokens to DeepSeek provider",
    observedScope: "Classification tasks under 2k tokens routed to DeepSeek",
    constraints: ["Fallback to GPT-5-mini if DeepSeek latency exceeds 3s", "Monitor accuracy for 48h"],
    constraintChecks: [
      { key: "fallback", label: "Fallback configured", status: "pass", required: true, message: "GPT-5-mini fallback active at 3s threshold" },
      { key: "accuracy_monitor", label: "48h accuracy monitoring", status: "pass", required: true, message: "Monitoring completed — accuracy stable" },
    ],
    monitoringRequirements: ["Classification accuracy ≥ 92%", "Latency p95 < 2s"],
    validationRequirements: ["A/B routing validation", "Cost reduction verification"],
    rollbackExpectations: "Revert routing rule to GPT-5-mini default",
    startedAt: h(120),
    updatedAt: h(72),
    completedAt: h(72),
    trackingOwner: "AI Ops Team",
    timelineEvents: [
      { timestamp: h(120), eventType: "handoff_released", actor: "Governance Engine", summary: "Handoff released", status: "released" },
      { timestamp: h(119), eventType: "downstream_accepted", actor: "AgentOS", summary: "AgentOS accepted routing change", status: "accepted" },
      { timestamp: h(116), eventType: "application_started", actor: "AgentOS", summary: "Routing rule applied", status: "started" },
      { timestamp: h(96), eventType: "stable_observation", actor: "AgentOS", summary: "24h stable observation — metrics within bounds", status: "stable" },
      { timestamp: h(72), eventType: "completed", actor: "Platform Team", summary: "Change application completed successfully", status: "completed" },
    ],
    outcomeObservations: [
      { metricKey: "accuracy", label: "Classification Accuracy", expectedEffect: "≥ 92%", observedEffect: "94.1%", status: "positive", confidence: 0.91, summary: "Accuracy exceeds target" },
      { metricKey: "cost", label: "Cost Reduction", expectedEffect: "~30% cost reduction", observedEffect: "34% reduction", status: "positive", confidence: 0.88, summary: "Cost savings above expectation" },
      { metricKey: "latency", label: "Latency p95", expectedEffect: "< 2s", observedEffect: "1.4s", status: "positive", confidence: 0.93, summary: "Well within latency bounds" },
    ],
    alerts: [],
    auditHistory: [
      { timestamp: h(120), actor: "Governance Engine", eventType: "handoff_released", summary: "Handoff released" },
      { timestamp: h(116), actor: "AgentOS", eventType: "application_started", summary: "Routing rule applied" },
      { timestamp: h(96), actor: "AgentOS", eventType: "stable", summary: "Observation window passed" },
      { timestamp: h(72), actor: "Platform Team", eventType: "completed", summary: "Application marked complete" },
    ],
    followUpActions: [],
    linkedEscalations: [],
    linkedFollowUpProposalIds: [],
  },
  {
    applicationId: "APP-004",
    sourceProposalId: "RTU-011",
    governanceDecisionRef: "GD-093",
    handoffId: "HO-081",
    proposalType: "readiness_tuning",
    changeTitle: "Require security scan gate for all high-risk deploys",
    targetWorkflow: "Readiness Engine",
    targetSubsystem: "Pipeline Orchestrator",
    applicationStatus: "blocked",
    currentPhase: "Awaiting Downstream Configuration",
    riskLevel: "high",
    scopeComplianceStatus: "validation_missing",
    approvedScope: "Add mandatory security scan gate to readiness checklist for high-risk deploy stages",
    observedScope: "Gate definition created but not yet wired to pipeline executor",
    constraints: ["Must not block existing low/medium-risk pipelines", "Gate timeout: 10min max", "Fallback: manual override with justification"],
    constraintChecks: [
      { key: "low_risk_unaffected", label: "Low/medium risk pipelines unaffected", status: "pending", required: true, message: "Not yet validated — pipeline config pending" },
      { key: "gate_timeout", label: "Gate timeout configured", status: "pass", required: true, message: "10min timeout set" },
      { key: "manual_override", label: "Manual override available", status: "fail", required: true, message: "Override mechanism not yet implemented" },
    ],
    monitoringRequirements: ["Pipeline throughput not degraded by > 5%", "Gate pass rate tracked"],
    validationRequirements: ["Pipeline integration test", "Override mechanism functional test"],
    rollbackExpectations: "Remove security scan gate from readiness checklist",
    startedAt: h(8),
    updatedAt: h(3),
    completedAt: null,
    trackingOwner: "Security Team",
    timelineEvents: [
      { timestamp: h(8), eventType: "handoff_released", actor: "Governance Engine", summary: "Handoff released to Readiness Engine", status: "released" },
      { timestamp: h(7), eventType: "downstream_accepted", actor: "Readiness Engine", summary: "Readiness Engine acknowledged", status: "accepted" },
      { timestamp: h(5), eventType: "application_started", actor: "Readiness Engine", summary: "Gate definition created", status: "started" },
      { timestamp: h(3), eventType: "blocked", actor: "Pipeline Orchestrator", summary: "Blocked — manual override mechanism not available", status: "blocked" },
    ],
    outcomeObservations: [],
    alerts: [
      { id: "alt-2", severity: "medium", type: "blocked_application", detectedAt: h(3), summary: "Application blocked — missing manual override implementation in pipeline executor", affectedSubsystem: "Pipeline Orchestrator", recommendedAction: "Coordinate with pipeline team to implement override mechanism" },
    ],
    auditHistory: [
      { timestamp: h(8), actor: "Governance Engine", eventType: "handoff_released", summary: "Handoff released" },
      { timestamp: h(5), actor: "Readiness Engine", eventType: "application_started", summary: "Gate definition created" },
      { timestamp: h(3), actor: "Pipeline Orchestrator", eventType: "blocked", summary: "Blocked due to missing override mechanism", statusChange: "in_progress → blocked" },
    ],
    followUpActions: [
      { id: "fa-5", type: "escalate", label: "Flag for Governance Review", status: "available" },
      { id: "fa-6", type: "note", label: "Record Intervention Note", status: "available" },
    ],
    linkedEscalations: [],
    linkedFollowUpProposalIds: [],
  },
  {
    applicationId: "APP-005",
    sourceProposalId: "CEP-038",
    governanceDecisionRef: "GD-082",
    handoffId: "HO-068",
    proposalType: "canon_evolution",
    changeTitle: "Deprecate legacy error-swallow anti-pattern",
    targetWorkflow: "Canon Registry",
    targetSubsystem: "Canon Engine",
    applicationStatus: "rolled_back",
    currentPhase: "Rolled Back",
    riskLevel: "medium",
    scopeComplianceStatus: "material_drift",
    approvedScope: "Mark pattern AP-007 as deprecated and block new adoptions",
    observedScope: "Pattern AP-007 blocked but 3 active consumers broken due to hard enforcement",
    constraints: ["Soft deprecation only — existing consumers must not be disrupted", "Migration guide published before enforcement"],
    constraintChecks: [
      { key: "soft_deprecation", label: "Soft deprecation enforced", status: "fail", required: true, message: "Hard enforcement applied — broke 3 active consumers" },
      { key: "migration_guide", label: "Migration guide published", status: "fail", required: true, message: "Guide not published before enforcement" },
    ],
    monitoringRequirements: ["Consumer breakage rate = 0 during deprecation"],
    validationRequirements: ["Consumer impact assessment completed"],
    rollbackExpectations: "Re-enable pattern AP-007 as active, remove deprecation flag",
    startedAt: h(96),
    updatedAt: h(60),
    completedAt: h(60),
    trackingOwner: "Platform Team",
    timelineEvents: [
      { timestamp: h(96), eventType: "handoff_released", actor: "Governance Engine", summary: "Handoff released", status: "released" },
      { timestamp: h(94), eventType: "application_started", actor: "Canon Engine", summary: "Deprecation flag set with enforcement", status: "started" },
      { timestamp: h(72), eventType: "drift_detected", actor: "Scope Monitor", summary: "Hard enforcement instead of soft — consumers broken", status: "drift" },
      { timestamp: h(65), eventType: "rollback_triggered", actor: "Platform Team", summary: "Rollback triggered due to consumer impact", status: "rollback" },
      { timestamp: h(60), eventType: "rolled_back", actor: "Canon Engine", summary: "Pattern re-enabled, deprecation removed", status: "rolled_back" },
    ],
    outcomeObservations: [
      { metricKey: "consumer_breakage", label: "Consumer Breakage", expectedEffect: "Zero breakage", observedEffect: "3 consumers broken", status: "negative", confidence: 0.95, summary: "Hard enforcement caused unexpected breakage" },
    ],
    alerts: [
      { id: "alt-3", severity: "critical", type: "constraint_violation", detectedAt: h(72), summary: "Hard enforcement violated soft-deprecation constraint — 3 consumers broken", affectedSubsystem: "Canon Engine", recommendedAction: "Review enforcement logic and republish with soft deprecation" },
    ],
    auditHistory: [
      { timestamp: h(96), actor: "Governance Engine", eventType: "handoff_released", summary: "Handoff released" },
      { timestamp: h(94), actor: "Canon Engine", eventType: "application_started", summary: "Deprecation applied" },
      { timestamp: h(72), actor: "Scope Monitor", eventType: "drift_flagged", summary: "Material drift: hard enforcement" },
      { timestamp: h(65), actor: "Platform Team", eventType: "rollback_triggered", summary: "Rollback initiated" },
      { timestamp: h(60), actor: "Canon Engine", eventType: "rolled_back", summary: "Pattern restored" },
    ],
    followUpActions: [
      { id: "fa-7", type: "proposal", label: "Open corrective canon proposal", status: "triggered", linkedProposalId: "CEP-045" },
      { id: "fa-8", type: "evidence", label: "Attach drift evidence to policy review", status: "completed" },
    ],
    linkedEscalations: ["ESC-012"],
    linkedFollowUpProposalIds: ["CEP-045"],
  },
];

export const MOCK_OVERVIEW: ApplicationOverview = {
  activeApplications: 3,
  completedApplications: 1,
  blockedApplications: 1,
  driftAlerts: 2,
  rolledBack: 1,
  governanceAttention: 2,
  avgHandoffToCompletionHours: 48,
  oldestActiveApplication: "APP-002 (42h ago)",
  highRiskInProgress: 2,
};
