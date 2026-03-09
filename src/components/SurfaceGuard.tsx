// SurfaceGuard – route-level permission gate for workspace and platform surfaces.
// Renders AccessDenied (inside AppLayout) when the user's canonical role lacks access.

import { ReactNode } from "react";
import { useRoleBasedExperience } from "@/hooks/useRoleBasedExperience";
import { canAccessSurface } from "@/lib/permissions";
import { AccessDenied } from "@/components/AccessDenied";
import { AppLayout } from "@/components/AppLayout";

interface SurfaceGuardProps {
  surface: "workspace" | "platform";
  children: ReactNode;
}

export function SurfaceGuard({ surface, children }: SurfaceGuardProps) {
  const { canonicalRole } = useRoleBasedExperience();
  const allowed = canAccessSurface(canonicalRole, surface);

  if (!allowed) {
    return (
      <AppLayout>
        <AccessDenied surface={surface} />
      </AppLayout>
    );
  }

  return <>{children}</>;
}
