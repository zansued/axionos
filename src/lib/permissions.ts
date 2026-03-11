/**
 * permissions.ts
 * Single source of truth for role-based access control.
 * Derives navigation from the centralized route registry (routes.ts).
 *
 * Route namespaces:
 *   /builder/* — Builder Mode (product delivery)
 *   /owner/*   — Owner Mode (platform governance)
 */

import type { LucideIcon } from "lucide-react";
import {
  getSidebarRoutes,
  toNavItems,
  type NavItem,
} from "@/lib/routes";

// Re-export NavItem for consumers
export type { NavItem };

// ─── Canonical role types ──────────────────────────────────────────────────

export type CanonicalRole =
  | "end_user"
  | "operator"
  | "tenant_owner"
  | "platform_reviewer"
  | "platform_admin";

export function deriveCanonicalRole(orgRole: string | null): CanonicalRole {
  switch (orgRole) {
    case "owner":    return "tenant_owner";
    case "admin":    return "platform_admin";
    case "editor":   return "operator";
    case "reviewer": return "platform_reviewer";
    case "viewer":
    default:         return "end_user";
  }
}

// ─── Nav items derived from route registry ─────────────────────────────────

export const BUILDER_NAV: NavItem[] = toNavItems(getSidebarRoutes("builder"));
export const OWNER_NAV: NavItem[] = toNavItems(getSidebarRoutes("owner"));

// ─── Nav group builder ─────────────────────────────────────────────────────

export type NavGroups = {
  builder: NavItem[];
  owner:   NavItem[];
};

export function getNavGroups(role: CanonicalRole): NavGroups {
  switch (role) {
    case "end_user":
    case "operator":
      return { builder: BUILDER_NAV, owner: [] };
    case "tenant_owner":
    case "platform_reviewer":
    case "platform_admin":
      return { builder: BUILDER_NAV, owner: OWNER_NAV };
  }
}

// ─── Route access helpers ─────────────────────────────────────────────────

export function canAccessRoute(role: CanonicalRole, path: string): boolean {
  const normalized = path.split("?")[0].split("#")[0];
  if (normalized.startsWith("/builder")) return true;
  if (normalized.startsWith("/owner")) {
    switch (role) {
      case "tenant_owner":
      case "platform_reviewer":
      case "platform_admin":
        return true;
      default:
        return false;
    }
  }
  return true;
}

// ─── UI display helpers ───────────────────────────────────────────────────

export const CANONICAL_ROLE_LABELS: Record<CanonicalRole, string> = {
  end_user:          "Builder",
  operator:          "Operator",
  tenant_owner:      "Owner",
  platform_reviewer: "Reviewer",
  platform_admin:    "Admin",
};

export const CANONICAL_ROLE_BADGE_STYLES: Record<CanonicalRole, string> = {
  end_user:          "bg-primary/20 text-primary border-primary/30",
  operator:          "bg-accent/20 text-accent-foreground border-accent/30",
  tenant_owner:      "bg-secondary/50 text-secondary-foreground border-secondary",
  platform_reviewer: "bg-muted text-muted-foreground border-border",
  platform_admin:    "bg-destructive/20 text-destructive border-destructive/30",
};
