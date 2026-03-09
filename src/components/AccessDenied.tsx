// AccessDenied – shown inside AppLayout when SurfaceGuard blocks a route.

import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRoleBasedExperience } from "@/hooks/useRoleBasedExperience";
import { CANONICAL_ROLE_LABELS, CANONICAL_ROLE_BADGE_STYLES } from "@/lib/permissions";

const SURFACE_META: Record<"workspace" | "platform", { label: string; description: string }> = {
  workspace: {
    label: "Workspace Governance",
    description:
      "Workspace Governance contains org-level analytics, delivery insights, capability management, and administration tools.",
  },
  platform: {
    label: "Platform Governance",
    description:
      "Platform Governance contains infrastructure controls, multi-tenant orchestration, and advanced AI pipeline tooling.",
  },
};

interface AccessDeniedProps {
  surface: "workspace" | "platform";
}

export function AccessDenied({ surface }: AccessDeniedProps) {
  const navigate = useNavigate();
  const { canonicalRole } = useRoleBasedExperience();
  const roleLabel  = CANONICAL_ROLE_LABELS[canonicalRole];
  const badgeClass = CANONICAL_ROLE_BADGE_STYLES[canonicalRole];
  const meta       = SURFACE_META[surface];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>

      <div className="space-y-2 max-w-md">
        <p className="text-xs font-mono text-muted-foreground/60 uppercase tracking-widest">
          {meta.label}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Restricted Area</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{meta.description}</p>
        <p className="text-muted-foreground text-sm">
          Your current role does not have access to this surface.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Your role:</span>
        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${badgeClass}`}>
          {roleLabel}
        </Badge>
      </div>

      <Button onClick={() => navigate("/")} variant="outline" size="sm">
        Return to Dashboard
      </Button>
    </div>
  );
}
