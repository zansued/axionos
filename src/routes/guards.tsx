import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SurfaceGuard } from "@/components/SurfaceGuard";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
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

export function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/builder/projects" replace />;
  return <>{children}</>;
}

/** Workspace surface guard */
export const W = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><SurfaceGuard surface="workspace">{children}</SurfaceGuard></ProtectedRoute>
);

/** Platform surface guard */
export const P = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><SurfaceGuard surface="platform">{children}</SurfaceGuard></ProtectedRoute>
);

/** Legacy route redirect with deprecation logging */
export function LegacyRedirect({ to }: { to: string }) {
  const location = useLocation();
  useEffect(() => {
    console.warn(`[AxionOS] Deprecated route accessed: ${location.pathname} → redirecting to ${to}`);
  }, [location.pathname, to]);
  return <Navigate to={to} replace />;
}
