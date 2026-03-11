import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OrgProvider } from "@/contexts/OrgContext";
import { PipelineProvider } from "@/contexts/PipelineContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { OnboardingProvider } from "@/components/OnboardingGuide";
import { I18nProvider } from "@/contexts/I18nContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcutsManager } from "@/components/KeyboardShortcutsManager";
import { SurfaceGuard } from "@/components/SurfaceGuard";

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
  if (user) return <Navigate to="/initiatives" replace />;
  return <>{children}</>;
}

// Surface guard wrappers
const W = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><SurfaceGuard surface="workspace">{children}</SurfaceGuard></ProtectedRoute>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><SurfaceGuard surface="platform">{children}</SurfaceGuard></ProtectedRoute>
);

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
                      <OnboardingProvider>
                        <CommandPalette />
                        <KeyboardShortcutsManager />
                        <Routes>
                          {/* ══════════════════════════════════════════════
                              AUTH
                              ══════════════════════════════════════════════ */}
                          <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />

                          {/* ══════════════════════════════════════════════
                              DASHBOARD (public landing / authenticated dashboard)
                              ══════════════════════════════════════════════ */}
                          <Route path="/" element={<Dashboard />} />

                          {/* ══════════════════════════════════════════════
                              PRODUCT SURFACE — All authenticated users
                              ══════════════════════════════════════════════ */}

                          {/* Projects */}
                          <Route path="/initiatives"     element={<ProtectedRoute><Initiatives /></ProtectedRoute>} />
                          <Route path="/stories"         element={<ProtectedRoute><Stories /></ProtectedRoute>} />
                          <Route path="/kanban"          element={<ProtectedRoute><Kanban /></ProtectedRoute>} />
                          <Route path="/code"            element={<ProtectedRoute><CodeExplorer /></ProtectedRoute>} />
                          <Route path="/artifacts"       element={<ProtectedRoute><Artifacts /></ProtectedRoute>} />
                          <Route path="/runtime-status"  element={<ProtectedRoute><RuntimeStatusPage /></ProtectedRoute>} />

                          {/* Pipelines */}
                          <Route path="/delivery"              element={<ProtectedRoute><Delivery /></ProtectedRoute>} />
                          <Route path="/pipeline-detail"       element={<ProtectedRoute><PipelineDetailPage /></ProtectedRoute>} />
                          <Route path="/execution-history"     element={<ProtectedRoute><ExecutionHistoryPage /></ProtectedRoute>} />
                          <Route path="/repair-loop"           element={<ProtectedRoute><RepairLoopPage /></ProtectedRoute>} />
                          <Route path="/preflight-validation"  element={<ProtectedRoute><PreflightValidationPage /></ProtectedRoute>} />
                          <Route path="/publish-queue"         element={<ProtectedRoute><PublishQueuePage /></ProtectedRoute>} />

                          {/* Observability */}
                          <Route path="/errors-alerts"         element={<ProtectedRoute><ErrorsAlertsPage /></ProtectedRoute>} />
                          <Route path="/validation-analytics"  element={<ProtectedRoute><ValidationAnalyticsPage /></ProtectedRoute>} />
                          <Route path="/throughput-metrics"    element={<ProtectedRoute><ThroughputMetricsPage /></ProtectedRoute>} />
                          <Route path="/logs-explorer"         element={<ProtectedRoute><LogsExplorerPage /></ProtectedRoute>} />

                          {/* Governance */}
                          <Route path="/governance-overview"   element={<ProtectedRoute><GovernanceOverviewPage /></ProtectedRoute>} />
                          <Route path="/pending-approvals"     element={<ProtectedRoute><PendingApprovalsPage /></ProtectedRoute>} />
                          <Route path="/policy-controls"       element={<ProtectedRoute><PolicyControlsPage /></ProtectedRoute>} />

                          {/* Agents (blueprint sub-pages) */}
                          <Route path="/agent-detail"          element={<ProtectedRoute><AgentDetailPage /></ProtectedRoute>} />
                          <Route path="/agent-performance"     element={<ProtectedRoute><AgentPerformancePage /></ProtectedRoute>} />
                          <Route path="/agent-memory"          element={<ProtectedRoute><AgentMemoryPage /></ProtectedRoute>} />
                          <Route path="/agent-policies"        element={<ProtectedRoute><AgentPoliciesPage /></ProtectedRoute>} />

                          {/* Modes */}
                          <Route path="/modes"                 element={<ProtectedRoute><ModesOverviewPage /></ProtectedRoute>} />
                          <Route path="/surface-modes"         element={<ProtectedRoute><SurfaceModesPage /></ProtectedRoute>} />
                          <Route path="/strategy-modes"        element={<ProtectedRoute><StrategyModesPage /></ProtectedRoute>} />
                          <Route path="/runtime-modes"         element={<ProtectedRoute><RuntimeModesPage /></ProtectedRoute>} />

                          {/* Settings */}
                          <Route path="/user-settings"         element={<ProtectedRoute><UserSettingsPage /></ProtectedRoute>} />
                          <Route path="/roles-access"          element={<ProtectedRoute><RolesAccessPage /></ProtectedRoute>} />
                          <Route path="/api-integrations"      element={<ProtectedRoute><ApiIntegrationsPage /></ProtectedRoute>} />
                          <Route path="/environment-controls"  element={<ProtectedRoute><EnvironmentControlsPage /></ProtectedRoute>} />

                          {/* Other product routes */}
                          <Route path="/journey"       element={<ProtectedRoute><Journey /></ProtectedRoute>} />
                          <Route path="/onboarding"    element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                          <Route path="/squads"        element={<ProtectedRoute><Squads /></ProtectedRoute>} />
                          <Route path="/workspace"     element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
                          <Route path="/planning"      element={<Navigate to="/initiatives" replace />} />
                          <Route path="/projects"      element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                          <Route path="/project/:id"   element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
                          <Route path="/pipelines"     element={<ProtectedRoute><Pipelines /></ProtectedRoute>} />
                          <Route path="/governance"    element={<ProtectedRoute><Governance /></ProtectedRoute>} />
                          <Route path="/modes"         element={<ProtectedRoute><Modes /></ProtectedRoute>} />
                          <Route path="/settings"              element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                          <Route path="/runtime"               element={<ProtectedRoute><Runtime /></ProtectedRoute>} />
                          <Route path="/system-intelligence"   element={<ProtectedRoute><SystemIntelligence /></ProtectedRoute>} />

                          {/* ══════════════════════════════════════════════
                              WORKSPACE SURFACE — tenant_owner+
                              ══════════════════════════════════════════════ */}
                          <Route path="/adoption"                 element={<W><AdoptionIntelligence /></W>} />
                          <Route path="/intelligence-memory"      element={<W><IntelligenceMemory /></W>} />
                          <Route path="/playbooks"                element={<W><Playbooks /></W>} />
                          <Route path="/bounded-operations"       element={<W><BoundedOperations /></W>} />
                          <Route path="/decision-engine"          element={<W><DecisionEngine /></W>} />
                          <Route path="/doctrine-adaptation"      element={<W><DoctrineAdaptation /></W>} />
                          <Route path="/institutional-conflicts"  element={<W><InstitutionalConflicts /></W>} />
                          <Route path="/federated-boundaries"     element={<W><FederatedBoundaries /></W>} />
                          <Route path="/resilience-continuity"    element={<W><ResilienceContinuity /></W>} />
                          <Route path="/memory-constitution"      element={<W><InstitutionalMemoryConstitution /></W>} />
                          <Route path="/decision-rights"          element={<W><SovereignDecisionRights /></W>} />
                          <Route path="/dependency-sovereignty"   element={<W><DependencySovereignty /></W>} />
                          <Route path="/strategic-succession"     element={<W><StrategicSuccession /></W>} />
                          <Route path="/multi-horizon-alignment"  element={<W><MultiHorizonAlignment /></W>} />
                          <Route path="/tradeoff-arbitration"     element={<W><TradeoffArbitration /></W>} />
                          <Route path="/mission-integrity"        element={<W><MissionIntegrity /></W>} />
                          <Route path="/continuity-simulation"    element={<W><ContinuitySimulation /></W>} />
                          <Route path="/improvement-ledger"       element={<W><ImprovementLedger /></W>} />
                          <Route path="/improvement-candidates"   element={<W><ImprovementCandidates /></W>} />
                          <Route path="/improvement-benchmarks"   element={<W><ImprovementBenchmarks /></W>} />
                          <Route path="/capability-registry"      element={<W><CapabilityRegistry /></W>} />
                          <Route path="/capability-governance"    element={<W><CapabilityGovernance /></W>} />
                          <Route path="/delivery-outcomes"        element={<W><DeliveryOutcomes /></W>} />
                          <Route path="/post-deploy-feedback"     element={<W><PostDeployFeedback /></W>} />
                          <Route path="/extensions"               element={<W><Extensions /></W>} />
                          <Route path="/audit"                    element={<W><AuditLogs /></W>} />
                          <Route path="/connections"              element={<W><Connections /></W>} />
                          <Route path="/billing"                  element={<W><Billing /></W>} />
                          <Route path="/org"                      element={<W><OrgSettings /></W>} />

                          {/* ══════════════════════════════════════════════
                              PLATFORM SURFACE — platform_reviewer+
                              ══════════════════════════════════════════════ */}
                          <Route path="/agents"                    element={<P><Agents /></P>} />
                          <Route path="/agent-routing"             element={<P><AgentRouting /></P>} />
                          <Route path="/agent-debates"             element={<P><AgentDebates /></P>} />
                          <Route path="/working-memory"            element={<P><WorkingMemory /></P>} />
                          <Route path="/swarm-execution"           element={<P><SwarmExecution /></P>} />
                          <Route path="/pilot-marketplace"         element={<P><PilotMarketplace /></P>} />
                          <Route path="/marketplace-outcomes"      element={<P><MarketplaceOutcomes /></P>} />
                          <Route path="/meta-agents"               element={<P><MetaAgents /></P>} />
                          <Route path="/meta-artifacts"            element={<P><MetaArtifacts /></P>} />
                          <Route path="/calibration"               element={<P><Calibration /></P>} />
                          <Route path="/prompt-optimization"       element={<P><PromptOptimization /></P>} />
                          <Route path="/observability"             element={<P><Observability /></P>} />
                          <Route path="/distributed-jobs"          element={<P><DistributedJobs /></P>} />
                          <Route path="/cross-region-recovery"     element={<P><CrossRegionRecovery /></P>} />
                          <Route path="/tenant-runtime"            element={<P><TenantRuntime /></P>} />
                          <Route path="/large-scale-orchestration" element={<P><LargeScaleOrchestration /></P>} />
                          <Route path="/delivery-tuning"           element={<P><DeliveryTuning /></P>} />
                          <Route path="/outcome-assurance"         element={<P><OutcomeAssurance /></P>} />
                          <Route path="/architecture-hypotheses"   element={<P><ArchitectureHypotheses /></P>} />
                          <Route path="/research-sandbox"          element={<P><ResearchSandbox /></P>} />
                          <Route path="/research-patterns"         element={<P><ResearchPatterns /></P>} />
                          <Route path="/architecture-promotion"    element={<P><ArchitecturePromotion /></P>} />
                          <Route path="/ai-routing-policy"         element={<P><AIRoutingPolicy /></P>} />
                          <Route path="/evolution-governance"      element={<P><EvolutionProposalGovernance /></P>} />
                          <Route path="/mutation-control"          element={<P><ArchitecturalMutationControl /></P>} />
                          <Route path="/reflective-validation"     element={<P><ReflectiveValidationAudit /></P>} />
                          <Route path="/kernel-integrity"          element={<P><KernelIntegrityGuard /></P>} />
                          <Route path="/canon-governance"          element={<P><CanonGovernanceDashboard /></P>} />
                          <Route path="/pattern-library"           element={<P><PatternLibraryDashboard /></P>} />
                          <Route path="/failure-memory"            element={<P><FailureMemoryDashboard /></P>} />
                          <Route path="/external-knowledge"        element={<P><ExternalKnowledgeDashboard /></P>} />
                          <Route path="/runtime-feedback"          element={<P><RuntimeFeedbackDashboard /></P>} />
                          <Route path="/tenant-doctrine"           element={<P><TenantDoctrineDashboard /></P>} />
                          <Route path="/autonomy-posture"          element={<P><AutonomyPostureDashboard /></P>} />
                          <Route path="/compounding-advantage"     element={<P><CompoundingAdvantageDashboard /></P>} />
                          <Route path="/runtime-harness"           element={<P><RuntimeValidationHarness /></P>} />
                          <Route path="/learning-signals"          element={<P><LearningSignalsDashboard /></P>} />
                          <Route path="/canon-evolution"           element={<P><CanonEvolutionDashboard /></P>} />
                          <Route path="/pattern-distillation"      element={<P><PatternDistillationDashboard /></P>} />
                          <Route path="/canon-reuse"               element={<P><CanonReuseImpactDashboard /></P>} />
                          <Route path="/canon-intelligence"        element={<P><CanonIntelligenceDashboard /></P>} />
                          <Route path="/security-intelligence"     element={<P><SecurityIntelligenceDashboard /></P>} />
                          <Route path="/red-team-simulation"       element={<P><RedTeamSimulationDashboard /></P>} />
                          <Route path="/blue-team-defense"        element={<P><BlueTeamDefenseDashboard /></P>} />
                          <Route path="/operational-posture"       element={<P><OperationalPostureDashboard /></P>} />
                          <Route path="/attention-allocation"      element={<P><AttentionAllocationDashboard /></P>} />
                          <Route path="/adaptive-routing"          element={<P><AdaptiveRoutingDashboard /></P>} />
                          <Route path="/operational-cycles"        element={<P><OperationalCyclesDashboard /></P>} />
                          <Route path="/operational-loops"         element={<P><OperationalLoopsDashboard /></P>} />
                          <Route path="/system-health"             element={<P><SystemHealthDashboard /></P>} />
                          <Route path="/organism-memory"           element={<P><OrganismMemoryDashboard /></P>} />
                          <Route path="/organism-console"          element={<P><OrganismConsoleDashboard /></P>} />

                          {/* ══════════════════════════════════════════════
                              CATCH-ALL
                              ══════════════════════════════════════════════ */}
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </OnboardingProvider>
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
