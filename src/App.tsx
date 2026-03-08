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
                      <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                      <Route path="/journey" element={<ProtectedRoute><Journey /></ProtectedRoute>} />
                      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                      <Route path="/initiatives" element={<ProtectedRoute><Initiatives /></ProtectedRoute>} />
                      <Route path="/code" element={<ProtectedRoute><CodeExplorer /></ProtectedRoute>} />
                      <Route path="/squads" element={<ProtectedRoute><Squads /></ProtectedRoute>} />
                      <Route path="/agents" element={<ProtectedRoute><Agents /></ProtectedRoute>} />
                      <Route path="/stories" element={<ProtectedRoute><Stories /></ProtectedRoute>} />
                      <Route path="/kanban" element={<ProtectedRoute><Kanban /></ProtectedRoute>} />
                      <Route path="/audit" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
                      <Route path="/observability" element={<ProtectedRoute><Observability /></ProtectedRoute>} />
                      <Route path="/planning" element={<Navigate to="/initiatives" replace />} />
                      <Route path="/workspace" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
                      <Route path="/artifacts" element={<ProtectedRoute><Artifacts /></ProtectedRoute>} />
                      <Route path="/delivery" element={<ProtectedRoute><Delivery /></ProtectedRoute>} />
                      <Route path="/org" element={<ProtectedRoute><OrgSettings /></ProtectedRoute>} />
                      <Route path="/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
                      <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
                      <Route path="/meta-agents" element={<ProtectedRoute><MetaAgents /></ProtectedRoute>} />
                      <Route path="/meta-artifacts" element={<ProtectedRoute><MetaArtifacts /></ProtectedRoute>} />
                      <Route path="/calibration" element={<ProtectedRoute><Calibration /></ProtectedRoute>} />
                      <Route path="/prompt-optimization" element={<ProtectedRoute><PromptOptimization /></ProtectedRoute>} />
                      <Route path="/adoption" element={<ProtectedRoute><AdoptionIntelligence /></ProtectedRoute>} />
                      <Route path="/extensions" element={<ProtectedRoute><Extensions /></ProtectedRoute>} />
                      <Route path="/improvement-ledger" element={<ProtectedRoute><ImprovementLedger /></ProtectedRoute>} />
                      <Route path="/improvement-candidates" element={<ProtectedRoute><ImprovementCandidates /></ProtectedRoute>} />
                      <Route path="/improvement-benchmarks" element={<ProtectedRoute><ImprovementBenchmarks /></ProtectedRoute>} />
                      <Route path="/agent-routing" element={<ProtectedRoute><AgentRouting /></ProtectedRoute>} />
                      <Route path="/agent-debates" element={<ProtectedRoute><AgentDebates /></ProtectedRoute>} />
                      <Route path="/working-memory" element={<ProtectedRoute><WorkingMemory /></ProtectedRoute>} />
                      <Route path="/swarm-execution" element={<ProtectedRoute><SwarmExecution /></ProtectedRoute>} />
                      <Route path="/capability-registry" element={<ProtectedRoute><CapabilityRegistry /></ProtectedRoute>} />
                      <Route path="/capability-governance" element={<ProtectedRoute><CapabilityGovernance /></ProtectedRoute>} />
                      <Route path="/pilot-marketplace" element={<ProtectedRoute><PilotMarketplace /></ProtectedRoute>} />
                      <Route path="/marketplace-outcomes" element={<ProtectedRoute><MarketplaceOutcomes /></ProtectedRoute>} />
                      <Route path="/delivery-outcomes" element={<ProtectedRoute><DeliveryOutcomes /></ProtectedRoute>} />
                      <Route path="/post-deploy-feedback" element={<ProtectedRoute><PostDeployFeedback /></ProtectedRoute>} />
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
