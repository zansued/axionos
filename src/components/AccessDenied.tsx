// AccessDenied – enhanced restricted state with surface-specific theming.

import { Lock, Building2, Shield, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRoleBasedExperience } from "@/hooks/useRoleBasedExperience";
import { CANONICAL_ROLE_LABELS, CANONICAL_ROLE_BADGE_STYLES } from "@/lib/permissions";

const SURFACE_META: Record<
  "workspace" | "platform",
  {
    label: string;
    description: string;
    icon: React.ElementType;
    colorVar: string;
    requiredRoles: string;
  }
> = {
  workspace: {
    label: "Workspace Governance",
    description:
      "This area contains org-level analytics, delivery insights, capability management, and administrative tools for your tenant.",
    icon: Building2,
    colorVar: "--surface-workspace",
    requiredRoles: "Operator, Owner, or Admin",
  },
  platform: {
    label: "Platform Governance",
    description:
      "This area contains infrastructure controls, multi-tenant orchestration, and advanced AI pipeline tooling for platform administrators.",
    icon: Shield,
    colorVar: "--surface-platform",
    requiredRoles: "Platform Reviewer or Admin",
  },
};

interface AccessDeniedProps {
  surface: "workspace" | "platform";
}

export function AccessDenied({ surface }: AccessDeniedProps) {
  const navigate = useNavigate();
  const { canonicalRole } = useRoleBasedExperience();
  const roleLabel = CANONICAL_ROLE_LABELS[canonicalRole];
  const badgeClass = CANONICAL_ROLE_BADGE_STYLES[canonicalRole];
  const meta = SURFACE_META[surface];
  const SurfaceIcon = meta.icon;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 px-6 text-center">
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.08] blur-3xl"
          style={{ backgroundColor: `hsl(var(${meta.colorVar}))` }}
        />
      </div>

      {/* Icon */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative"
      >
        <div
          className="flex h-20 w-20 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `hsl(var(${meta.colorVar}) / 0.12)` }}
        >
          <SurfaceIcon
            className="h-10 w-10"
            style={{ color: `hsl(var(${meta.colorVar}))` }}
          />
        </div>
        <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted">
          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="max-w-md space-y-3"
      >
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
          {meta.label}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          Restricted Area
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {meta.description}
        </p>
      </motion.div>

      {/* Role info */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="rounded-lg border border-border bg-muted/30 px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <div className="text-left">
            <p className="text-xs text-muted-foreground">Your current role</p>
            <div className="mt-0.5 flex items-center gap-2">
              <Badge
                variant="outline"
                className={`px-2 py-0.5 text-[10px] ${badgeClass}`}
              >
                {roleLabel}
              </Badge>
            </div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-left">
            <p className="text-xs text-muted-foreground">Required roles</p>
            <p className="mt-0.5 text-xs font-medium">{meta.requiredRoles}</p>
          </div>
        </div>
      </motion.div>

      {/* Action */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Button
          onClick={() => navigate("/builder/dashboard")}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Return to Dashboard
        </Button>
      </motion.div>
    </div>
  );
}
