import { Route } from "react-router-dom";
import { ProtectedRoute } from "./guards";
import {
  Initiatives, Stories, Kanban, CodeExplorer, Artifacts, Projects, ProjectDetail,
  Agents, Squads, Journey, Onboarding, Workspace, Delivery, Pipelines, Runtime,
  OrgSettings, SystemHealthDashboard, Connections,
  AgentDetailPage, AgentPerformancePage, AgentMemoryPage, AgentPoliciesPage,
  PipelineDetailPage, ExecutionHistoryPage, RepairLoopPage, PreflightValidationPage,
  PublishQueuePage, RuntimeStatusPage, ErrorsAlertsPage, ValidationAnalyticsPage,
  ThroughputMetricsPage, LogsExplorerPage,
  UserSettingsPage, RolesAccessPage, ApiIntegrationsPage, EnvironmentControlsPage,
  ModesOverviewPage, SurfaceModesPage, StrategyModesPage, RuntimeModesPage,
  Dashboard,
} from "./lazy-pages";

export function BuilderRoutes() {
  return (
    <>
      {/* Dashboard */}
      <Route path="/builder/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

      {/* Projects */}
      <Route path="/builder/projects" element={<ProtectedRoute><Initiatives /></ProtectedRoute>} />
      <Route path="/builder/stories" element={<ProtectedRoute><Stories /></ProtectedRoute>} />
      <Route path="/builder/kanban" element={<ProtectedRoute><Kanban /></ProtectedRoute>} />
      <Route path="/builder/code" element={<ProtectedRoute><CodeExplorer /></ProtectedRoute>} />
      <Route path="/builder/artifacts" element={<ProtectedRoute><Artifacts /></ProtectedRoute>} />
      <Route path="/builder/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />

      {/* Agents */}
      <Route path="/builder/agents" element={<ProtectedRoute><Agents /></ProtectedRoute>} />
      <Route path="/builder/agent-detail" element={<ProtectedRoute><AgentDetailPage /></ProtectedRoute>} />
      <Route path="/builder/agent-performance" element={<ProtectedRoute><AgentPerformancePage /></ProtectedRoute>} />
      <Route path="/builder/agent-memory" element={<ProtectedRoute><AgentMemoryPage /></ProtectedRoute>} />
      <Route path="/builder/agent-policies" element={<ProtectedRoute><AgentPoliciesPage /></ProtectedRoute>} />

      {/* Pipelines */}
      <Route path="/builder/pipelines" element={<ProtectedRoute><Delivery /></ProtectedRoute>} />
      <Route path="/builder/pipeline-detail" element={<ProtectedRoute><PipelineDetailPage /></ProtectedRoute>} />
      <Route path="/builder/execution-history" element={<ProtectedRoute><ExecutionHistoryPage /></ProtectedRoute>} />
      <Route path="/builder/repair-loop" element={<ProtectedRoute><RepairLoopPage /></ProtectedRoute>} />
      <Route path="/builder/preflight-validation" element={<ProtectedRoute><PreflightValidationPage /></ProtectedRoute>} />
      <Route path="/builder/publish-queue" element={<ProtectedRoute><PublishQueuePage /></ProtectedRoute>} />

      {/* Runtime */}
      <Route path="/builder/runtime" element={<ProtectedRoute><Runtime /></ProtectedRoute>} />
      <Route path="/builder/runtime-status" element={<ProtectedRoute><RuntimeStatusPage /></ProtectedRoute>} />

      {/* Execution Observability */}
      <Route path="/builder/execution-observability" element={<ProtectedRoute><SystemHealthDashboard /></ProtectedRoute>} />
      <Route path="/builder/errors-alerts" element={<ProtectedRoute><ErrorsAlertsPage /></ProtectedRoute>} />
      <Route path="/builder/validation-analytics" element={<ProtectedRoute><ValidationAnalyticsPage /></ProtectedRoute>} />
      <Route path="/builder/throughput-metrics" element={<ProtectedRoute><ThroughputMetricsPage /></ProtectedRoute>} />
      <Route path="/builder/logs-explorer" element={<ProtectedRoute><LogsExplorerPage /></ProtectedRoute>} />

      {/* Settings & Connections */}
      <Route path="/builder/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
      <Route path="/builder/settings" element={<ProtectedRoute><OrgSettings /></ProtectedRoute>} />
      <Route path="/builder/user-settings" element={<ProtectedRoute><UserSettingsPage /></ProtectedRoute>} />
      <Route path="/builder/roles-access" element={<ProtectedRoute><RolesAccessPage /></ProtectedRoute>} />
      <Route path="/builder/api-integrations" element={<ProtectedRoute><ApiIntegrationsPage /></ProtectedRoute>} />
      <Route path="/builder/environment-controls" element={<ProtectedRoute><EnvironmentControlsPage /></ProtectedRoute>} />

      {/* Other */}
      <Route path="/builder/journey" element={<ProtectedRoute><Journey /></ProtectedRoute>} />
      <Route path="/builder/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/builder/squads" element={<ProtectedRoute><Squads /></ProtectedRoute>} />
      <Route path="/builder/workspace" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />

      {/* Modes */}
      <Route path="/builder/modes" element={<ProtectedRoute><ModesOverviewPage /></ProtectedRoute>} />
      <Route path="/builder/surface-modes" element={<ProtectedRoute><SurfaceModesPage /></ProtectedRoute>} />
      <Route path="/builder/strategy-modes" element={<ProtectedRoute><StrategyModesPage /></ProtectedRoute>} />
      <Route path="/builder/runtime-modes" element={<ProtectedRoute><RuntimeModesPage /></ProtectedRoute>} />
    </>
  );
}
