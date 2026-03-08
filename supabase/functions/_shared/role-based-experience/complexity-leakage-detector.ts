// Complexity Leakage Detector
// Detects when internal/system complexity is leaking into the wrong role surface.

import { RoleName } from "./role-experience-model-manager.ts";

export interface LeakageSignal {
  signal_type: string;
  surface_key: string;
  expected_role: RoleName;
  actual_role: RoleName;
  severity: "low" | "moderate" | "high";
  description: string;
}

/** Internal system surfaces that should NOT appear in default_user */
const INTERNAL_SURFACES = new Set([
  "meta-agents", "meta-artifacts", "calibration", "prompt-optimization",
  "observability", "audit", "connections", "billing", "settings",
]);

/** Operator-restricted surfaces */
const OPERATOR_RESTRICTED = new Set([
  "meta-agents", "meta-artifacts", "calibration", "prompt-optimization",
  "billing", "settings",
]);

export function detectLeakage(
  roleName: RoleName,
  exposedSurfaces: string[],
): LeakageSignal[] {
  const signals: LeakageSignal[] = [];

  if (roleName === "admin") return signals; // Admin sees everything — no leakage

  const restricted = roleName === "default_user" ? INTERNAL_SURFACES : OPERATOR_RESTRICTED;

  for (const surface of exposedSurfaces) {
    if (restricted.has(surface)) {
      signals.push({
        signal_type: "complexity_leakage",
        surface_key: surface,
        expected_role: "admin",
        actual_role: roleName,
        severity: roleName === "default_user" ? "high" : "moderate",
        description: `Surface "${surface}" is exposed to ${roleName} but should be restricted to ${roleName === "default_user" ? "operator/admin" : "admin"}.`,
      });
    }
  }

  return signals;
}

export function computeLeakageScore(roleName: RoleName, exposedSurfaces: string[]): number {
  const signals = detectLeakage(roleName, exposedSurfaces);
  if (signals.length === 0) return 0;
  const maxLeakage = roleName === "default_user" ? INTERNAL_SURFACES.size : OPERATOR_RESTRICTED.size;
  return Math.min(1, signals.length / Math.max(1, maxLeakage));
}
