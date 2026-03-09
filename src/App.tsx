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
import Planning from "./pages/Planning";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Convenience wrappers
const W = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><SurfaceGuard surface="workspace">{children}</SurfaceGuard></ProtectedRoute>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><SurfaceGuard surface="platform">{children}</SurfaceGuard></ProtectedRoute>
);

const App = () => (
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
                        {/* ── Auth ── */}
                        <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />

                        {/* ── Product surface (all roles) ── */}
                        <Route path="/"           element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/journey"    element={<ProtectedRoute><Journey /></ProtectedRoute>} />
                        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                        <Route path="/initiatives"element={<ProtectedRoute><Initiatives /></ProtectedRoute>} />
                        <Route path="/code"       element={<ProtectedRoute><CodeExplorer /></ProtectedRoute>} />
                        <Route path="/squads"     element={<ProtectedRoute><Squads /></ProtectedRoute>} />
                        <Route path="/stories"    element={<ProtectedRoute><Stories /></ProtectedRoute>} />
                        <Route path="/kanban"     element={<ProtectedRoute><Kanban /></ProtectedRoute>} />
                        <Route path="/workspace"  element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
                        <Route path="/artifacts"  element={<ProtectedRoute><Artifacts /></ProtectedRoute>} />
                        <Route path="/delivery"   element={<ProtectedRoute><Delivery /></ProtectedRoute>} />
                        <Route path="/planning"   element={<Navigate to="/initiatives" replace />} />

                        {/* ── Workspace surface ── */}
                        <Route path="/adoption"                element={<W><AdoptionIntelligence /></W>} />
                        <Route path="/intelligence-memory"    element={<W><IntelligenceMemory /></W>} />
                        <Route path="/playbooks"              element={<W><Playbooks /></W>} />
                        <Route path="/bounded-operations"     element={<W><BoundedOperations /></W>} />
                        <Route path="/decision-engine"        element={<W><DecisionEngine /></W>} />
                        <Route path="/doctrine-adaptation"    element={<W><DoctrineAdaptation /></W>} />
                        <Route path="/institutional-conflicts" element={<W><InstitutionalConflicts /></W>} />
                        <Route path="/federated-boundaries"    element={<W><FederatedBoundaries /></W>} />
                        <Route path="/resilience-continuity"   element={<W><ResilienceContinuity /></W>} />
                        <Route path="/memory-constitution"     element={<W><InstitutionalMemoryConstitution /></W>} />
                        <Route path="/decision-rights"         element={<W><SovereignDecisionRights /></W>} />
                        <Route path="/dependency-sovereignty"  element={<W><DependencySovereignty /></W>} />
                        <Route path="/strategic-succession"    element={<W><StrategicSuccession /></W>} />
                        <Route path="/improvement-ledger"      element={<W><ImprovementLedger /></W>} />
                        <Route path="/improvement-candidates"  element={<W><ImprovementCandidates /></W>} />
                        <Route path="/improvement-benchmarks"  element={<W><ImprovementBenchmarks /></W>} />
                        <Route path="/capability-registry"     element={<W><CapabilityRegistry /></W>} />
                        <Route path="/capability-governance"   element={<W><CapabilityGovernance /></W>} />
                        <Route path="/delivery-outcomes"       element={<W><DeliveryOutcomes /></W>} />
                        <Route path="/post-deploy-feedback"    element={<W><PostDeployFeedback /></W>} />
                        <Route path="/extensions"              element={<W><Extensions /></W>} />
                        <Route path="/audit"                   element={<W><AuditLogs /></W>} />
                        <Route path="/connections"             element={<W><Connections /></W>} />
                        <Route path="/billing"                 element={<W><Billing /></W>} />
                        <Route path="/org"                     element={<W><OrgSettings /></W>} />

                        {/* ── Platform surface ── */}
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
);

export default App;
