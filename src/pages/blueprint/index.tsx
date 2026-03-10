/**
 * Blueprint placeholder pages — all screens defined in docs/UI_BLUEPRINT.md
 * that don't have full implementations yet.
 * Each exports a default component wrapped in AppLayout.
 */

import { AppLayout } from "@/components/AppLayout";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import {
  GitBranch, Bot, Cpu, Eye, Shield, Layers, Settings,
  Activity, AlertTriangle, BarChart3, Search, FileText,
  Scale, Clock, Lock, Key, Server, Gauge, type LucideIcon,
} from "lucide-react";

// ─── Helper to create wrapped placeholder pages ─────────────────────────────

function makePlaceholder(props: {
  title: string;
  description: string;
  icon?: LucideIcon;
  category?: string;
  plannedComponents?: string[];
  plannedActions?: string[];
}) {
  return function BlueprintPage() {
    return (
      <AppLayout>
        <PlaceholderPage {...props} />
      </AppLayout>
    );
  };
}

// ─── Projects ───────────────────────────────────────────────────────────────

export const RuntimeStatusPage = makePlaceholder({
  title: "Runtime Status",
  description: "Post-deploy monitoring with health metrics, logs, and rollback history.",
  icon: Activity,
  category: "Projects",
  plannedComponents: ["Health Metrics", "Log Viewer", "Rollback History", "Alert Feed"],
  plannedActions: ["Rollback", "Trigger Repair", "View Logs"],
});

// ─── Agents ──────────────────────────────────────────────────────────────────

export const AgentDetailPage = makePlaceholder({
  title: "Agent Detail",
  description: "Deep inspection of an individual agent's configuration, memory, and capabilities.",
  icon: Bot,
  category: "Agents",
  plannedComponents: ["Agent Config", "Memory Browser", "Capability List", "Performance Chart"],
  plannedActions: ["Edit Config", "Disable Agent", "Clear Memory"],
});

export const AgentPerformancePage = makePlaceholder({
  title: "Agent Performance",
  description: "Per-agent metrics: success rate, latency, cost, and task history.",
  icon: BarChart3,
  category: "Agents",
  plannedComponents: ["Success Rate Chart", "Latency Distribution", "Cost Breakdown", "Task History Table"],
  plannedActions: ["Optimize", "Compare Agents"],
});

export const AgentMemoryPage = makePlaceholder({
  title: "Agent Memory",
  description: "Agent knowledge base with memory entries and relevance scores.",
  icon: Bot,
  category: "Agents",
  plannedComponents: ["Memory Entries Table", "Relevance Scores", "Memory Timeline", "Export Panel"],
  plannedActions: ["Prune Stale", "Export Memory", "Search"],
});

export const AgentPoliciesPage = makePlaceholder({
  title: "Agent Policies",
  description: "Control rules and constraints governing agent behavior.",
  icon: Shield,
  category: "Agents",
  plannedComponents: ["Policy List", "Constraint Editor", "Enforcement Log"],
  plannedActions: ["Create Policy", "Edit Policy", "Test Policy"],
});

// ─── Pipelines ──────────────────────────────────────────────────────────────

export const PipelineDetailPage = makePlaceholder({
  title: "Pipeline Detail",
  description: "Execution view with stage visualization and logs.",
  icon: GitBranch,
  category: "Pipelines",
  plannedComponents: ["Stage Visualization", "Log Viewer", "Duration Chart", "Error Panel"],
  plannedActions: ["Retry Stage", "Cancel Run", "View Diff"],
});

export const ExecutionHistoryPage = makePlaceholder({
  title: "Execution History",
  description: "Past pipeline runs with status, duration, and cost data.",
  icon: Clock,
  category: "Pipelines",
  plannedComponents: ["Runs Table", "Status Filters", "Duration Chart", "Cost Summary"],
  plannedActions: ["Inspect Run", "Compare Runs", "Export"],
});

export const RepairLoopPage = makePlaceholder({
  title: "Repair Loop",
  description: "Auto-repair tracking with attempt logs and success rates.",
  icon: Activity,
  category: "Pipelines",
  plannedComponents: ["Repair Attempts", "Success Rate", "Repair Timeline", "Root Cause Panel"],
  plannedActions: ["Review Repair", "Approve Fix", "Manual Override"],
});

export const PreflightValidationPage = makePlaceholder({
  title: "Pre-flight Validation",
  description: "Deploy pre-checks with validation rules and results.",
  icon: Shield,
  category: "Pipelines",
  plannedComponents: ["Validation Rules", "Check Results", "Override Panel", "Fix Suggestions"],
  plannedActions: ["Run Checks", "Override Rule", "Fix Issue"],
});

export const PublishQueuePage = makePlaceholder({
  title: "Publish Queue",
  description: "Pending deployments with queue position and dependencies.",
  icon: GitBranch,
  category: "Pipelines",
  plannedComponents: ["Queue List", "Dependency Graph", "Priority Controls", "Status Timeline"],
  plannedActions: ["Promote", "Hold", "Remove"],
});

// ─── Observability ──────────────────────────────────────────────────────────

export const ErrorsAlertsPage = makePlaceholder({
  title: "Errors & Alerts",
  description: "Error tracking with stack traces, frequency, and severity data.",
  icon: AlertTriangle,
  category: "Observability",
  plannedComponents: ["Error List", "Stack Trace Viewer", "Frequency Chart", "Severity Filters"],
  plannedActions: ["Acknowledge", "Investigate", "Mute Alert"],
});

export const ValidationAnalyticsPage = makePlaceholder({
  title: "Validation Analytics",
  description: "Quality metrics with pass/fail rates and trend analysis.",
  icon: BarChart3,
  category: "Observability",
  plannedComponents: ["Pass/Fail Chart", "Trend Lines", "Stage Breakdown", "Rule Effectiveness"],
  plannedActions: ["Filter by Stage", "Export Report"],
});

export const ThroughputMetricsPage = makePlaceholder({
  title: "Throughput Metrics",
  description: "Performance data with requests/sec and processing time.",
  icon: Gauge,
  category: "Observability",
  plannedComponents: ["Throughput Chart", "Latency Distribution", "Bottleneck Detection", "Capacity Planning"],
  plannedActions: ["Set Thresholds", "Export Data"],
});

export const LogsExplorerPage = makePlaceholder({
  title: "Logs Explorer",
  description: "Searchable log viewer with filters and time-range selection.",
  icon: Search,
  category: "Observability",
  plannedComponents: ["Log Stream", "Search Bar", "Time Range Picker", "Level Filters", "Export"],
  plannedActions: ["Search", "Filter", "Export Logs"],
});

// ─── Governance ─────────────────────────────────────────────────────────────

export const GovernanceOverviewPage = makePlaceholder({
  title: "Governance Overview",
  description: "Policy status dashboard with active policies and compliance score.",
  icon: Shield,
  category: "Governance",
  plannedComponents: ["Compliance Score", "Active Policies", "Recent Decisions", "Risk Summary"],
  plannedActions: ["Review Policies", "Create Policy"],
});

export const PendingApprovalsPage = makePlaceholder({
  title: "Pending Approvals",
  description: "Action queue with approval requests and contextual information.",
  icon: Clock,
  category: "Governance",
  plannedComponents: ["Approval Queue", "Request Detail", "Impact Preview", "Decision History"],
  plannedActions: ["Approve", "Reject", "Defer", "Request Info"],
});

export const PolicyControlsPage = makePlaceholder({
  title: "Policy Controls",
  description: "Rule management with policy definitions and enforcement settings.",
  icon: Scale,
  category: "Governance",
  plannedComponents: ["Policy List", "Rule Editor", "Enforcement Toggle", "Version History"],
  plannedActions: ["Create Rule", "Edit Rule", "Disable Rule"],
});

// ─── Modes ──────────────────────────────────────────────────────────────────

export const ModesOverviewPage = makePlaceholder({
  title: "Modes Overview",
  description: "Active operational modes for surface, strategy, and runtime.",
  icon: Layers,
  category: "Modes",
  plannedComponents: ["Active Modes Panel", "Mode Comparison", "Impact Preview"],
  plannedActions: ["Switch Mode", "Preview Impact"],
});

export const SurfaceModesPage = makePlaceholder({
  title: "Surface Modes",
  description: "UI customization for builder and owner mode configurations.",
  icon: Layers,
  category: "Modes",
  plannedComponents: ["Mode Config", "Preview Panel", "Role Mapping"],
  plannedActions: ["Toggle Mode", "Configure"],
});

export const StrategyModesPage = makePlaceholder({
  title: "Strategy Modes",
  description: "Operational strategy postures: aggressive, balanced, conservative.",
  icon: Scale,
  category: "Modes",
  plannedComponents: ["Posture Selector", "Impact Preview", "Domain Overrides"],
  plannedActions: ["Set Posture", "Override Domain"],
});

export const RuntimeModesPage = makePlaceholder({
  title: "Runtime Modes",
  description: "Execution configuration for auto-repair, validation depth, and limits.",
  icon: Cpu,
  category: "Modes",
  plannedComponents: ["Auto-repair Toggle", "Validation Depth", "Resource Limits", "Timeout Config"],
  plannedActions: ["Adjust Settings", "Reset Defaults"],
});

// ─── Settings ───────────────────────────────────────────────────────────────

export const UserSettingsPage = makePlaceholder({
  title: "User Settings",
  description: "Personal configuration: profile, preferences, and theme.",
  icon: Settings,
  category: "Settings",
  plannedComponents: ["Profile Form", "Preferences Panel", "Theme Selector", "Notification Prefs"],
  plannedActions: ["Update Profile", "Change Theme"],
});

export const RolesAccessPage = makePlaceholder({
  title: "Roles & Access",
  description: "RBAC management with role definitions and permission assignments.",
  icon: Lock,
  category: "Settings",
  plannedComponents: ["Role List", "Permission Matrix", "User-Role Mapping", "Invite Panel"],
  plannedActions: ["Create Role", "Assign Role", "Invite User"],
});

export const EnvironmentControlsPage = makePlaceholder({
  title: "Environment Controls",
  description: "Runtime configuration with feature flags, limits, and quotas.",
  icon: Server,
  category: "Settings",
  plannedComponents: ["Feature Flags", "Resource Limits", "Quota Dashboard", "Config Editor"],
  plannedActions: ["Toggle Flag", "Set Limit", "Export Config"],
});

export const ApiIntegrationsPage = makePlaceholder({
  title: "API & Integrations",
  description: "External connections with API keys, webhooks, and connector management.",
  icon: Key,
  category: "Settings",
  plannedComponents: ["API Keys", "Webhook Config", "Connector List", "Usage Metrics"],
  plannedActions: ["Generate Key", "Add Webhook", "Connect Service"],
});
