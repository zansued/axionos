import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OrgProvider } from "@/contexts/OrgContext";
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
import OrgSettings from "./pages/OrgSettings";
import Billing from "./pages/Billing";
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
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <OrgProvider>
            <Routes>
              <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
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
              <Route path="/org" element={<ProtectedRoute><OrgSettings /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </OrgProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
