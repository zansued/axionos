import { ReactNode } from "react";
import { useRoleBasedExperience } from "@/hooks/useRoleBasedExperience";
import { canAccessRoute } from "@/lib/permissions";
import { AccessDenied } from "@/components/AccessDenied";
import { AppLayout } from "@/components/AppLayout";
import { useLocation } from "react-router-dom";

interface SurfaceGuardProps {
  surface: "workspace" | "platform";
  children: ReactNode;
}

export function SurfaceGuard({ surface, children }: SurfaceGuardProps) {
  const { canonicalRole } = useRoleBasedExperience();
  const location = useLocation();
  const allowed = canAccessRoute(canonicalRole, location.pathname);

  if (!allowed) {
    return (
      <AppLayout>
        <AccessDenied surface={surface} />
      </AppLayout>
    );
  }

  return <>{children}</>;
}
