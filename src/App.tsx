import { ErrorBoundary } from "@/components/ErrorBoundary";
// Build trigger: env reload
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OrgProvider } from "@/contexts/OrgContext";
import { PipelineProvider } from "@/contexts/PipelineContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { OnboardingProvider } from "@/components/OnboardingGuide";
import { I18nProvider } from "@/contexts/I18nContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ModeProvider } from "@/contexts/ModeContext";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcutsManager } from "@/components/KeyboardShortcutsManager";
import { SurfaceGuard } from "@/components/SurfaceGuard";
import { useEffect } from "react";

import ApprovalQueue from "./pages/ApprovalQueue";
import ActionCenter from "./pages/ActionCenter";
// ─── Existing Page Imports ──────────────────────────────────────────────────
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Initiatives from "./pages/Initiatives";
import CodeExplorer from "./pages/CodeExplorer";
import Squads from "./pages/Squads";
import Agents from "./pages/Agents";
import Stories from "./pages/Stories";
import Kanban from "./pages/Kanban";
import AuditLogs from "./pages/AuditLogs";
import Observability from "./pages/Observability";
import Workspace from "./pages/Workspace";
import Artifacts from "./pages/Artifacts";
import Delivery from "./pages/Delivery";
import OrgSettings from "./pages/OrgSettings";
import Billing from "./pages/Billing";
import Connections from "./pages/Connections";
import MetaAgents from "./pages/MetaAgents";
import MetaArtifacts from "./pages/MetaArtifacts";
import Calibration from "./pages/Calibration";
import PromptOptimization from "./pages/PromptOptimization";
import Journey from "./pages/Journey";
import Onboarding from "./pages/Onboarding";
import AdoptionIntelligence from "./pages/AdoptionIntelligence";
import Extensions from "./pages/Extensions";
import ImprovementLedger from "./pages/ImprovementLedger";
import ImprovementCandidates from "./pages/ImprovementCandidates";
import ImprovementBenchmarks from "./pages/ImprovementBenchmarks";
import AgentRouting from "./pages/AgentRouting";
import AgentDebates from "./pages/AgentDebates";
import WorkingMemory from "./pages/WorkingMemory";
import SwarmExecution from "./pages/SwarmExecution";
import CapabilityRegistry from "./pages/CapabilityRegistry";
import CapabilityGovernance from "./pages/CapabilityGovernance";
import PilotMarketplace from "./pages/PilotMarketplace";
import MarketplaceOutcomes from "./pages/MarketplaceOutcomes";
import DeliveryOutcomes from "./pages/DeliveryOutcomes";
import PostDeployFeedback from "./pages/PostDeployFeedback";
import DeliveryTuning from "./pages/DeliveryTuning";
import OutcomeAssurance from "./pages/OutcomeAssurance";
import DistributedJobs from "./pages/DistributedJobs";
import CrossRegionRecovery from "./pages/CrossRegionRecovery";
import TenantRuntime from "./pages/TenantRuntime";
import LargeScaleOrchestration from "./pages/LargeScaleOrchestration";
import ArchitectureHypotheses from "./pages/ArchitectureHypotheses";
import ResearchSandbox from "./pages/ResearchSandbox";
import ResearchPatterns from "./pages/ResearchPatterns";
import ArchitecturePromotion from "./pages/ArchitecturePromotion";
import AIRoutingPolicy from "./pages/AIRoutingPolicy";
import IntelligenceMemory from "./pages/IntelligenceMemory";
import Playbooks from "./pages/Playbooks";
import BoundedOperations from "./pages/BoundedOperations";
import DecisionEngine from "./pages/DecisionEngine";
import DoctrineAdaptation from "./pages/DoctrineAdaptation";
import InstitutionalConflicts from "./pages/InstitutionalConflicts";
import FederatedBoundaries from "./pages/FederatedBoundaries";
import ResilienceContinuity from "./pages/ResilienceContinuity";
import InstitutionalMemoryConstitution from "./pages/InstitutionalMemoryConstitution";
import SovereignDecisionRights from "./pages/SovereignDecisionRights";
import DependencySovereignty from "./pages/DependencySovereignty";
import StrategicSuccession from "./pages/StrategicSuccession";
import MultiHorizonAlignment from "./pages/MultiHorizonAlignment";
import TradeoffArbitration from "./pages/TradeoffArbitration";
import MissionIntegrity from "./pages/MissionIntegrity";
import ContinuitySimulation from "./pages/ContinuitySimulation";
import EvolutionProposalGovernance from "./pages/EvolutionProposalGovernance";
import ArchitecturalMutationControl from "./pages/ArchitecturalMutationControl";
import ReflectiveValidationAudit from "./pages/ReflectiveValidationAudit";
import KernelIntegrityGuard from "./pages/KernelIntegrityGuard";
import CanonGovernanceDashboard from "./pages/CanonGovernanceDashboard";
import PatternLibraryDashboard from "./pages/PatternLibraryDashboard";
import FailureMemoryDashboard from "./pages/FailureMemoryDashboard";
import ExternalKnowledgeDashboard from "./pages/ExternalKnowledgeDashboard";
import RuntimeFeedbackDashboard from "./pages/RuntimeFeedbackDashboard";
import TenantDoctrineDashboard from "./pages/TenantDoctrineDashboard";
import AutonomyPostureDashboard from "./pages/AutonomyPostureDashboard";
import CompoundingAdvantageDashboard from "./pages/CompoundingAdvantageDashboard";
import RuntimeValidationHarness from "./pages/RuntimeValidationHarness";
import LearningSignalsDashboard from "./pages/LearningSignalsDashboard";
import CanonEvolutionDashboard from "./pages/CanonEvolutionDashboard";
import PatternDistillationDashboard from "./pages/PatternDistillationDashboard";
import CanonReuseImpactDashboard from "./pages/CanonReuseImpactDashboard";
import CanonIntelligenceDashboard from "./pages/CanonIntelligenceDashboard";
import SecurityIntelligenceDashboard from "./pages/SecurityIntelligenceDashboard";
import RedTeamSimulationDashboard from "./pages/RedTeamSimulationDashboard";
import BlueTeamDefenseDashboard from "./pages/BlueTeamDefenseDashboard";
import PurpleLearningDashboard from "./pages/PurpleLearningDashboard";
import SecurityWarRoom from "./pages/SecurityWarRoom";
import OperationalPostureDashboard from "./pages/OperationalPostureDashboard";
import AttentionAllocationDashboard from "./pages/AttentionAllocationDashboard";
import AdaptiveRoutingDashboard from "./pages/AdaptiveRoutingDashboard";
import OperationalCyclesDashboard from "./pages/OperationalCyclesDashboard";
import OperationalLoopsDashboard from "./pages/OperationalLoopsDashboard";
import SystemHealthDashboard from "./pages/SystemHealthDashboard";
import OrganismMemoryDashboard from "./pages/OrganismMemoryDashboard";
import OrganismConsoleDashboard from "./pages/OrganismConsoleDashboard";
import NotFound from "./pages/NotFound";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Pipelines from "./pages/Pipelines";
import Governance from "./pages/Governance";
import GovernanceInsights from "./pages/GovernanceInsights";
import GovernanceDecisions from "./pages/GovernanceDecisions";
import GovernanceExecutionHandoff from "./pages/GovernanceExecutionHandoff";
import GovernanceChangeApplicationTracking from "./pages/GovernanceChangeApplicationTracking";
import Modes from "./pages/Modes";
import SettingsPage from "./pages/Settings";
import Runtime from "./pages/Runtime";
import SystemIntelligence from "./pages/SystemIntelligence";

// ─── Blueprint Placeholder Pages ────────────────────────────────────────────
import {
  RuntimeStatusPage,
  AgentDetailPage,
  AgentPerformancePage,
  AgentMemoryPage,
  AgentPoliciesPage,
  PipelineDetailPage,
  ExecutionHistoryPage,
  RepairLoopPage,
  PreflightValidationPage,
  PublishQueuePage,
  ErrorsAlertsPage,
  ValidationAnalyticsPage,
  ThroughputMetricsPage,
  LogsExplorerPage,
  GovernanceOverviewPage,
  PendingApprovalsPage,
  PolicyControlsPage,
  ModesOverviewPage,
  SurfaceModesPage,
  StrategyModesPage,
  RuntimeModesPage,
  UserSettingsPage,
  RolesAccessPage,
  EnvironmentControlsPage,
  ApiIntegrationsPage,
} from "./pages/blueprint";

// ─── Config ─────────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ─── Route Guards ───────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/builder/projects" replace />;
  return <>{children}</>;
}

// Surface guard wrappers
const W = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><SurfaceGuard surface="workspace">{children}</SurfaceGuard></ProtectedRoute>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><SurfaceGuard surface="platform">{children}</SurfaceGuard></ProtectedRoute>
);

// ─── Legacy Route Redirect (logs deprecation) ──────────────────────────────

function LegacyRedirect({ to }: { to: string }) {
  const location = useLocation();
  useEffect(() => {
    console.warn(`[AxionOS] Deprecated route accessed: ${location.pathname} → redirecting to ${to}`);
  }, [location.pathname, to]);
  return <Navigate to={to} replace />;
}

// ─── App ────────────────────────────────────────────────────────────────────

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <OrgProvider>
                  <PipelineProvider>
                    <WorkspaceProvider>
                      <ModeProvider>
                        <OnboardingProvider>
                          <CommandPalette />
                          <KeyboardShortcutsManager />
                          <Routes>
                            {/* ══════════════════════════════════════════════
                                AUTH & LANDING
                                ══════════════════════════════════════════════ */}
                            <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                            <Route path="/" element={<Dashboard />} />

                            {/* ══════════════════════════════════════════════
                                BUILDER MODE — /builder/*
                                ══════════════════════════════════════════════ */}

                            {/* Dashboard */}
                            <Route path="/builder/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

                            {/* Projects */}
                            <Route path="/builder/projects" element={<ProtectedRoute><Initiatives /></ProtectedRoute>} />
                            <Route path="/builder/stories" element={<ProtectedRoute><Stories /></ProtectedRoute>} />
                            <Route path="/builder/kanban" element={<ProtectedRoute><Kanban /></ProtectedRoute>} />
                            <Route path="/builder/code" element={<ProtectedRoute><CodeExplorer /></ProtectedRoute>} />
                            <Route path="/builder/artifacts" element={<ProtectedRoute><Artifacts /></ProtectedRoute>} />
                            <Route path="/builder/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                            <Route path="/builder/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />

                            {/* Agents */}
                            <Route path="/builder/agents" element={<ProtectedRoute><Agents /></ProtectedRoute>} />
                            <Route path="/builder/agent-detail" element={<ProtectedRoute><AgentDetailPage /></ProtectedRoute>} />
                            <Route path="/builder/agent-performance" element={<ProtectedRoute><AgentPerformancePage /></ProtectedRoute>} />
                            <Route path="/builder/agent-memory" element={<ProtectedRoute><AgentMemoryPage /></ProtectedRoute>} />
                            <Route path="/builder/agent-policies" element={<ProtectedRoute><AgentPoliciesPage /></ProtectedRoute>} />

                            {/* Pipelines */}
                            <Route path="/builder/pipelines" element={<ProtectedRoute><Delivery /></ProtectedRoute>} />
                            <Route path="/builder/pipelines" element={<ProtectedRoute><Pipelines /></ProtectedRoute>} />
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

                            {/* Builder governance sub-pages redirect to owner */}

                            {/* Settings */}
                            <Route path="/builder/settings" element={<ProtectedRoute><OrgSettings /></ProtectedRoute>} />
                            <Route path="/builder/user-settings" element={<ProtectedRoute><UserSettingsPage /></ProtectedRoute>} />
                            <Route path="/builder/roles-access" element={<ProtectedRoute><RolesAccessPage /></ProtectedRoute>} />
                            <Route path="/builder/api-integrations" element={<ProtectedRoute><ApiIntegrationsPage /></ProtectedRoute>} />
                            <Route path="/builder/environment-controls" element={<ProtectedRoute><EnvironmentControlsPage /></ProtectedRoute>} />

                            {/* Other builder routes */}
                            <Route path="/builder/journey" element={<ProtectedRoute><Journey /></ProtectedRoute>} />
                            <Route path="/builder/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                            <Route path="/builder/squads" element={<ProtectedRoute><Squads /></ProtectedRoute>} />
                            <Route path="/builder/workspace" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />

                            {/* Modes */}
                            <Route path="/builder/modes" element={<ProtectedRoute><ModesOverviewPage /></ProtectedRoute>} />
                            <Route path="/builder/surface-modes" element={<ProtectedRoute><SurfaceModesPage /></ProtectedRoute>} />
                            <Route path="/builder/strategy-modes" element={<ProtectedRoute><StrategyModesPage /></ProtectedRoute>} />
                            <Route path="/builder/runtime-modes" element={<ProtectedRoute><RuntimeModesPage /></ProtectedRoute>} />

                            {/* ══════════════════════════════════════════════
                                OWNER MODE — /owner/*
                                ══════════════════════════════════════════════ */}

                            {/* System Intelligence */}
                            <Route path="/owner/system-intelligence" element={<P><SystemIntelligence /></P>} />
                            <Route path="/owner/system-health" element={<P><SystemHealthDashboard /></P>} />
                            <Route path="/owner/adoption" element={<W><AdoptionIntelligence /></W>} />
                            <Route path="/owner/delivery-outcomes" element={<W><DeliveryOutcomes /></W>} />
                            <Route path="/owner/platform-observability" element={<P><Observability /></P>} />

                            {/* Institutional Memory */}
                            <Route path="/owner/pattern-library" element={<P><PatternLibraryDashboard /></P>} />
                            <Route path="/owner/canon-intelligence" element={<P><CanonIntelligenceDashboard /></P>} />
                            <Route path="/owner/security-war-room" element={<P><SecurityWarRoom /></P>} />
                            <Route path="/owner/security-intelligence" element={<P><SecurityIntelligenceDashboard /></P>} />
                            <Route path="/owner/red-team-simulation" element={<P><RedTeamSimulationDashboard /></P>} />
                            <Route path="/owner/blue-team-defense" element={<P><BlueTeamDefenseDashboard /></P>} />
                            <Route path="/owner/purple-learning" element={<P><PurpleLearningDashboard /></P>} />
                            <Route path="/owner/capabilities" element={<W><CapabilityRegistry /></W>} />

                            {/* Governance */}
                            <Route path="/owner/delivery-governance" element={<W><Governance /></W>} />
                            <Route path="/owner/governance-overview" element={<W><GovernanceOverviewPage /></W>} />
                            <Route path="/owner/pending-approvals" element={<W><ApprovalQueue /></W>} />
                            <Route path="/owner/policy-controls" element={<W><PolicyControlsPage /></W>} />
                            <Route path="/owner/action-center" element={<W><ActionCenter /></W>} />
                            <Route path="/owner/autonomy-posture" element={<P><AutonomyPostureDashboard /></P>} />
                            <Route path="/owner/agent-swarm" element={<P><SwarmExecution /></P>} />
                            <Route path="/owner/calibration" element={<P><Calibration /></P>} />
                            <Route path="/owner/settings" element={<W><OrgSettings /></W>} />

                            {/* Additional owner pages (not in main nav but accessible) */}
                            <Route path="/owner/intelligence-memory" element={<W><IntelligenceMemory /></W>} />
                            <Route path="/owner/playbooks" element={<W><Playbooks /></W>} />
                            <Route path="/owner/bounded-operations" element={<W><BoundedOperations /></W>} />
                            <Route path="/owner/decision-engine" element={<W><DecisionEngine /></W>} />
                            <Route path="/owner/doctrine-adaptation" element={<W><DoctrineAdaptation /></W>} />
                            <Route path="/owner/institutional-conflicts" element={<W><InstitutionalConflicts /></W>} />
                            <Route path="/owner/federated-boundaries" element={<W><FederatedBoundaries /></W>} />
                            <Route path="/owner/resilience-continuity" element={<W><ResilienceContinuity /></W>} />
                            <Route path="/owner/memory-constitution" element={<W><InstitutionalMemoryConstitution /></W>} />
                            <Route path="/owner/decision-rights" element={<W><SovereignDecisionRights /></W>} />
                            <Route path="/owner/dependency-sovereignty" element={<W><DependencySovereignty /></W>} />
                            <Route path="/owner/strategic-succession" element={<W><StrategicSuccession /></W>} />
                            <Route path="/owner/multi-horizon-alignment" element={<W><MultiHorizonAlignment /></W>} />
                            <Route path="/owner/tradeoff-arbitration" element={<W><TradeoffArbitration /></W>} />
                            <Route path="/owner/mission-integrity" element={<W><MissionIntegrity /></W>} />
                            <Route path="/owner/continuity-simulation" element={<W><ContinuitySimulation /></W>} />
                            <Route path="/owner/improvement-ledger" element={<W><ImprovementLedger /></W>} />
                            <Route path="/owner/improvement-candidates" element={<W><ImprovementCandidates /></W>} />
                            <Route path="/owner/improvement-benchmarks" element={<W><ImprovementBenchmarks /></W>} />
                            <Route path="/owner/capability-governance" element={<W><CapabilityGovernance /></W>} />
                            <Route path="/owner/post-deploy-feedback" element={<W><PostDeployFeedback /></W>} />
                            <Route path="/owner/extensions" element={<W><Extensions /></W>} />
                            <Route path="/owner/audit" element={<W><AuditLogs /></W>} />
                            <Route path="/owner/connections" element={<W><Connections /></W>} />
                            <Route path="/owner/billing" element={<W><Billing /></W>} />
                            <Route path="/owner/agent-routing" element={<P><AgentRouting /></P>} />
                            <Route path="/owner/agent-debates" element={<P><AgentDebates /></P>} />
                            <Route path="/owner/working-memory" element={<P><WorkingMemory /></P>} />
                            <Route path="/owner/pilot-marketplace" element={<P><PilotMarketplace /></P>} />
                            <Route path="/owner/marketplace-outcomes" element={<P><MarketplaceOutcomes /></P>} />
                            <Route path="/owner/meta-agents" element={<P><MetaAgents /></P>} />
                            <Route path="/owner/meta-artifacts" element={<P><MetaArtifacts /></P>} />
                            <Route path="/owner/prompt-optimization" element={<P><PromptOptimization /></P>} />
                            <Route path="/owner/distributed-jobs" element={<P><DistributedJobs /></P>} />
                            <Route path="/owner/cross-region-recovery" element={<P><CrossRegionRecovery /></P>} />
                            <Route path="/owner/tenant-runtime" element={<P><TenantRuntime /></P>} />
                            <Route path="/owner/large-scale-orchestration" element={<P><LargeScaleOrchestration /></P>} />
                            <Route path="/owner/delivery-tuning" element={<P><DeliveryTuning /></P>} />
                            <Route path="/owner/outcome-assurance" element={<P><OutcomeAssurance /></P>} />
                            <Route path="/owner/architecture-hypotheses" element={<P><ArchitectureHypotheses /></P>} />
                            <Route path="/owner/research-sandbox" element={<P><ResearchSandbox /></P>} />
                            <Route path="/owner/research-patterns" element={<P><ResearchPatterns /></P>} />
                            <Route path="/owner/architecture-promotion" element={<P><ArchitecturePromotion /></P>} />
                            <Route path="/owner/ai-routing-policy" element={<P><AIRoutingPolicy /></P>} />
                            <Route path="/owner/evolution-governance" element={<P><EvolutionProposalGovernance /></P>} />
                            <Route path="/owner/mutation-control" element={<P><ArchitecturalMutationControl /></P>} />
                            <Route path="/owner/reflective-validation" element={<P><ReflectiveValidationAudit /></P>} />
                            <Route path="/owner/kernel-integrity" element={<P><KernelIntegrityGuard /></P>} />
                            <Route path="/owner/canon-governance" element={<P><CanonGovernanceDashboard /></P>} />
                            <Route path="/owner/failure-memory" element={<P><FailureMemoryDashboard /></P>} />
                            <Route path="/owner/external-knowledge" element={<P><ExternalKnowledgeDashboard /></P>} />
                            <Route path="/owner/runtime-feedback" element={<P><RuntimeFeedbackDashboard /></P>} />
                            <Route path="/owner/tenant-doctrine" element={<P><TenantDoctrineDashboard /></P>} />
                            <Route path="/owner/compounding-advantage" element={<P><CompoundingAdvantageDashboard /></P>} />
                            <Route path="/owner/runtime-harness" element={<P><RuntimeValidationHarness /></P>} />
                            <Route path="/owner/learning-signals" element={<P><LearningSignalsDashboard /></P>} />
                            <Route path="/owner/canon-evolution" element={<P><CanonEvolutionDashboard /></P>} />
                            <Route path="/owner/pattern-distillation" element={<P><PatternDistillationDashboard /></P>} />
                            <Route path="/owner/canon-reuse" element={<P><CanonReuseImpactDashboard /></P>} />
                            <Route path="/owner/operational-posture" element={<P><OperationalPostureDashboard /></P>} />
                            <Route path="/owner/attention-allocation" element={<P><AttentionAllocationDashboard /></P>} />
                            <Route path="/owner/adaptive-routing" element={<P><AdaptiveRoutingDashboard /></P>} />
                            <Route path="/owner/operational-cycles" element={<P><OperationalCyclesDashboard /></P>} />
                            <Route path="/owner/operational-loops" element={<P><OperationalLoopsDashboard /></P>} />
                            <Route path="/owner/organism-memory" element={<P><OrganismMemoryDashboard /></P>} />
                            <Route path="/owner/organism-console" element={<P><OrganismConsoleDashboard /></P>} />
                            <Route path="/owner/governance-insights" element={<P><GovernanceInsights /></P>} />
                            <Route path="/owner/governance-decisions" element={<P><GovernanceDecisions /></P>} />
                            <Route path="/owner/governance-handoff" element={<P><GovernanceExecutionHandoff /></P>} />
                            <Route path="/owner/governance-application-tracking" element={<P><GovernanceChangeApplicationTracking /></P>} />

                            {/* ══════════════════════════════════════════════
                                LEGACY REDIRECTS (deprecated — log usage)
                                ══════════════════════════════════════════════ */}
                            {/* Internal renames */}
                            <Route path="/builder/initiatives" element={<LegacyRedirect to="/builder/projects" />} />
                            <Route path="/builder/delivery" element={<LegacyRedirect to="/builder/pipelines" />} />
                            <Route path="/builder/governance" element={<LegacyRedirect to="/owner/delivery-governance" />} />
                            <Route path="/builder/delivery-governance" element={<LegacyRedirect to="/owner/delivery-governance" />} />
                            <Route path="/builder/governance-overview" element={<LegacyRedirect to="/owner/governance-overview" />} />
                            <Route path="/builder/pending-approvals" element={<LegacyRedirect to="/owner/pending-approvals" />} />
                            <Route path="/builder/policy-controls" element={<LegacyRedirect to="/owner/policy-controls" />} />
                            <Route path="/builder/action-center" element={<LegacyRedirect to="/owner/action-center" />} />
                            <Route path="/builder/system-intelligence" element={<LegacyRedirect to="/owner/system-intelligence" />} />
                            <Route path="/builder/project/:id" element={<LegacyRedirect to="/builder/projects" />} />
                            <Route path="/initiatives" element={<LegacyRedirect to="/builder/projects" />} />
                            <Route path="/stories" element={<LegacyRedirect to="/builder/projects" />} />
                            <Route path="/kanban" element={<LegacyRedirect to="/builder/projects" />} />
                            <Route path="/code" element={<LegacyRedirect to="/builder/projects" />} />
                            <Route path="/artifacts" element={<LegacyRedirect to="/builder/projects" />} />
                            <Route path="/projects" element={<LegacyRedirect to="/builder/projects" />} />
                            <Route path="/project/:id" element={<LegacyRedirect to="/builder/projects" />} />
                            <Route path="/agents" element={<LegacyRedirect to="/builder/agents" />} />
                            <Route path="/delivery" element={<LegacyRedirect to="/builder/pipelines" />} />
                            <Route path="/pipelines" element={<LegacyRedirect to="/builder/pipelines" />} />
                            <Route path="/runtime" element={<LegacyRedirect to="/builder/runtime" />} />
                            <Route path="/runtime-status" element={<LegacyRedirect to="/builder/runtime-status" />} />
                            <Route path="/system-health" element={<LegacyRedirect to="/builder/execution-observability" />} />
                            <Route path="/system-intelligence" element={<LegacyRedirect to="/owner/system-intelligence" />} />
                            <Route path="/governance" element={<LegacyRedirect to="/owner/delivery-governance" />} />
                            <Route path="/org" element={<LegacyRedirect to="/builder/settings" />} />
                            <Route path="/settings" element={<LegacyRedirect to="/builder/settings" />} />
                            <Route path="/squads" element={<LegacyRedirect to="/builder/squads" />} />
                            <Route path="/workspace" element={<LegacyRedirect to="/builder/workspace" />} />
                            <Route path="/journey" element={<LegacyRedirect to="/builder/journey" />} />
                            <Route path="/onboarding" element={<LegacyRedirect to="/builder/onboarding" />} />
                            <Route path="/planning" element={<LegacyRedirect to="/builder/projects" />} />
                            <Route path="/pipeline-detail" element={<LegacyRedirect to="/builder/pipeline-detail" />} />
                            <Route path="/execution-history" element={<LegacyRedirect to="/builder/execution-history" />} />
                            <Route path="/repair-loop" element={<LegacyRedirect to="/builder/repair-loop" />} />
                            <Route path="/preflight-validation" element={<LegacyRedirect to="/builder/preflight-validation" />} />
                            <Route path="/publish-queue" element={<LegacyRedirect to="/builder/publish-queue" />} />
                            <Route path="/errors-alerts" element={<LegacyRedirect to="/builder/errors-alerts" />} />
                            <Route path="/validation-analytics" element={<LegacyRedirect to="/builder/validation-analytics" />} />
                            <Route path="/throughput-metrics" element={<LegacyRedirect to="/builder/throughput-metrics" />} />
                            <Route path="/logs-explorer" element={<LegacyRedirect to="/builder/logs-explorer" />} />
                            <Route path="/governance-overview" element={<LegacyRedirect to="/builder/governance-overview" />} />
                            <Route path="/pending-approvals" element={<LegacyRedirect to="/builder/pending-approvals" />} />
                            <Route path="/policy-controls" element={<LegacyRedirect to="/builder/policy-controls" />} />
                            <Route path="/agent-detail" element={<LegacyRedirect to="/builder/agent-detail" />} />
                            <Route path="/agent-performance" element={<LegacyRedirect to="/builder/agent-performance" />} />
                            <Route path="/agent-memory" element={<LegacyRedirect to="/builder/agent-memory" />} />
                            <Route path="/agent-policies" element={<LegacyRedirect to="/builder/agent-policies" />} />
                            <Route path="/modes" element={<LegacyRedirect to="/builder/modes" />} />
                            <Route path="/surface-modes" element={<LegacyRedirect to="/builder/surface-modes" />} />
                            <Route path="/strategy-modes" element={<LegacyRedirect to="/builder/strategy-modes" />} />
                            <Route path="/runtime-modes" element={<LegacyRedirect to="/builder/runtime-modes" />} />
                            <Route path="/user-settings" element={<LegacyRedirect to="/builder/user-settings" />} />
                            <Route path="/roles-access" element={<LegacyRedirect to="/builder/roles-access" />} />
                            <Route path="/api-integrations" element={<LegacyRedirect to="/builder/api-integrations" />} />
                            <Route path="/environment-controls" element={<LegacyRedirect to="/builder/environment-controls" />} />

                            {/* Owner legacy redirects */}
                            <Route path="/observability" element={<LegacyRedirect to="/owner/platform-observability" />} />
                            <Route path="/adoption" element={<LegacyRedirect to="/owner/adoption" />} />
                            <Route path="/delivery-outcomes" element={<LegacyRedirect to="/owner/delivery-outcomes" />} />
                            <Route path="/pattern-library" element={<LegacyRedirect to="/owner/pattern-library" />} />
                            <Route path="/canon-intelligence" element={<LegacyRedirect to="/owner/canon-intelligence" />} />
                            <Route path="/security-war-room" element={<LegacyRedirect to="/owner/security-war-room" />} />
                            <Route path="/security-intelligence" element={<LegacyRedirect to="/owner/security-intelligence" />} />
                            <Route path="/red-team-simulation" element={<LegacyRedirect to="/owner/red-team-simulation" />} />
                            <Route path="/blue-team-defense" element={<LegacyRedirect to="/owner/blue-team-defense" />} />
                            <Route path="/purple-learning" element={<LegacyRedirect to="/owner/purple-learning" />} />
                            <Route path="/capability-registry" element={<LegacyRedirect to="/owner/capabilities" />} />
                            <Route path="/autonomy-posture" element={<LegacyRedirect to="/owner/autonomy-posture" />} />
                            <Route path="/swarm-execution" element={<LegacyRedirect to="/owner/agent-swarm" />} />
                            <Route path="/calibration" element={<LegacyRedirect to="/owner/calibration" />} />
                            <Route path="/intelligence-memory" element={<LegacyRedirect to="/owner/intelligence-memory" />} />
                            <Route path="/playbooks" element={<LegacyRedirect to="/owner/playbooks" />} />
                            <Route path="/bounded-operations" element={<LegacyRedirect to="/owner/bounded-operations" />} />
                            <Route path="/decision-engine" element={<LegacyRedirect to="/owner/decision-engine" />} />
                            <Route path="/doctrine-adaptation" element={<LegacyRedirect to="/owner/doctrine-adaptation" />} />
                            <Route path="/institutional-conflicts" element={<LegacyRedirect to="/owner/institutional-conflicts" />} />
                            <Route path="/federated-boundaries" element={<LegacyRedirect to="/owner/federated-boundaries" />} />
                            <Route path="/resilience-continuity" element={<LegacyRedirect to="/owner/resilience-continuity" />} />
                            <Route path="/memory-constitution" element={<LegacyRedirect to="/owner/memory-constitution" />} />
                            <Route path="/decision-rights" element={<LegacyRedirect to="/owner/decision-rights" />} />
                            <Route path="/dependency-sovereignty" element={<LegacyRedirect to="/owner/dependency-sovereignty" />} />
                            <Route path="/strategic-succession" element={<LegacyRedirect to="/owner/strategic-succession" />} />
                            <Route path="/multi-horizon-alignment" element={<LegacyRedirect to="/owner/multi-horizon-alignment" />} />
                            <Route path="/tradeoff-arbitration" element={<LegacyRedirect to="/owner/tradeoff-arbitration" />} />
                            <Route path="/mission-integrity" element={<LegacyRedirect to="/owner/mission-integrity" />} />
                            <Route path="/continuity-simulation" element={<LegacyRedirect to="/owner/continuity-simulation" />} />
                            <Route path="/improvement-ledger" element={<LegacyRedirect to="/owner/improvement-ledger" />} />
                            <Route path="/improvement-candidates" element={<LegacyRedirect to="/owner/improvement-candidates" />} />
                            <Route path="/improvement-benchmarks" element={<LegacyRedirect to="/owner/improvement-benchmarks" />} />
                            <Route path="/capability-governance" element={<LegacyRedirect to="/owner/capability-governance" />} />
                            <Route path="/post-deploy-feedback" element={<LegacyRedirect to="/owner/post-deploy-feedback" />} />
                            <Route path="/extensions" element={<LegacyRedirect to="/owner/extensions" />} />
                            <Route path="/audit" element={<LegacyRedirect to="/owner/audit" />} />
                            <Route path="/connections" element={<LegacyRedirect to="/owner/connections" />} />
                            <Route path="/billing" element={<LegacyRedirect to="/owner/billing" />} />
                            <Route path="/agent-routing" element={<LegacyRedirect to="/owner/agent-routing" />} />
                            <Route path="/agent-debates" element={<LegacyRedirect to="/owner/agent-debates" />} />
                            <Route path="/working-memory" element={<LegacyRedirect to="/owner/working-memory" />} />
                            <Route path="/pilot-marketplace" element={<LegacyRedirect to="/owner/pilot-marketplace" />} />
                            <Route path="/marketplace-outcomes" element={<LegacyRedirect to="/owner/marketplace-outcomes" />} />
                            <Route path="/meta-agents" element={<LegacyRedirect to="/owner/meta-agents" />} />
                            <Route path="/meta-artifacts" element={<LegacyRedirect to="/owner/meta-artifacts" />} />
                            <Route path="/prompt-optimization" element={<LegacyRedirect to="/owner/prompt-optimization" />} />
                            <Route path="/distributed-jobs" element={<LegacyRedirect to="/owner/distributed-jobs" />} />
                            <Route path="/cross-region-recovery" element={<LegacyRedirect to="/owner/cross-region-recovery" />} />
                            <Route path="/tenant-runtime" element={<LegacyRedirect to="/owner/tenant-runtime" />} />
                            <Route path="/large-scale-orchestration" element={<LegacyRedirect to="/owner/large-scale-orchestration" />} />
                            <Route path="/delivery-tuning" element={<LegacyRedirect to="/owner/delivery-tuning" />} />
                            <Route path="/outcome-assurance" element={<LegacyRedirect to="/owner/outcome-assurance" />} />
                            <Route path="/architecture-hypotheses" element={<LegacyRedirect to="/owner/architecture-hypotheses" />} />
                            <Route path="/research-sandbox" element={<LegacyRedirect to="/owner/research-sandbox" />} />
                            <Route path="/research-patterns" element={<LegacyRedirect to="/owner/research-patterns" />} />
                            <Route path="/architecture-promotion" element={<LegacyRedirect to="/owner/architecture-promotion" />} />
                            <Route path="/ai-routing-policy" element={<LegacyRedirect to="/owner/ai-routing-policy" />} />
                            <Route path="/evolution-governance" element={<LegacyRedirect to="/owner/evolution-governance" />} />
                            <Route path="/mutation-control" element={<LegacyRedirect to="/owner/mutation-control" />} />
                            <Route path="/reflective-validation" element={<LegacyRedirect to="/owner/reflective-validation" />} />
                            <Route path="/kernel-integrity" element={<LegacyRedirect to="/owner/kernel-integrity" />} />
                            <Route path="/canon-governance" element={<LegacyRedirect to="/owner/canon-governance" />} />
                            <Route path="/failure-memory" element={<LegacyRedirect to="/owner/failure-memory" />} />
                            <Route path="/external-knowledge" element={<LegacyRedirect to="/owner/external-knowledge" />} />
                            <Route path="/runtime-feedback" element={<LegacyRedirect to="/owner/runtime-feedback" />} />
                            <Route path="/tenant-doctrine" element={<LegacyRedirect to="/owner/tenant-doctrine" />} />
                            <Route path="/compounding-advantage" element={<LegacyRedirect to="/owner/compounding-advantage" />} />
                            <Route path="/runtime-harness" element={<LegacyRedirect to="/owner/runtime-harness" />} />
                            <Route path="/learning-signals" element={<LegacyRedirect to="/owner/learning-signals" />} />
                            <Route path="/canon-evolution" element={<LegacyRedirect to="/owner/canon-evolution" />} />
                            <Route path="/pattern-distillation" element={<LegacyRedirect to="/owner/pattern-distillation" />} />
                            <Route path="/canon-reuse" element={<LegacyRedirect to="/owner/canon-reuse" />} />
                            <Route path="/operational-posture" element={<LegacyRedirect to="/owner/operational-posture" />} />
                            <Route path="/attention-allocation" element={<LegacyRedirect to="/owner/attention-allocation" />} />
                            <Route path="/adaptive-routing" element={<LegacyRedirect to="/owner/adaptive-routing" />} />
                            <Route path="/operational-cycles" element={<LegacyRedirect to="/owner/operational-cycles" />} />
                            <Route path="/operational-loops" element={<LegacyRedirect to="/owner/operational-loops" />} />
                            <Route path="/organism-memory" element={<LegacyRedirect to="/owner/organism-memory" />} />
                            <Route path="/organism-console" element={<LegacyRedirect to="/owner/organism-console" />} />

                            {/* ══════════════════════════════════════════════
                                CATCH-ALL
                                ══════════════════════════════════════════════ */}
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </OnboardingProvider>
                      </ModeProvider>
                    </WorkspaceProvider>
                  </PipelineProvider>
                </OrgProvider>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
