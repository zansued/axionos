/**
 * Doctrine Boundary Guard
 * Prevents undue flexibilization of immutable doctrines.
 * Applies hard blocks when necessary.
 */

import { DoctrineRecord } from "./doctrine-core-loader.ts";
import { AdaptationRule } from "./doctrine-adaptation-engine.ts";

export interface BoundaryCheckResult {
  allowed: boolean;
  reason: string;
  violations: string[];
}

export function checkBoundaries(
  doctrine: DoctrineRecord,
  rules: AdaptationRule[]
): BoundaryCheckResult {
  const violations: string[] = [];

  // Strict doctrines cannot have permissive rules
  if (doctrine.immutability_level === "strict") {
    const permissive = rules.filter((r) => r.adaptation_type === "permissive");
    if (permissive.length > 0) {
      violations.push(
        `${permissive.length} permissive rule(s) target a strictly immutable doctrine ("${doctrine.doctrine_name}"). This is forbidden.`
      );
    }
  }

  // Bounded doctrines: check boundary conditions are defined
  if (doctrine.immutability_level === "bounded") {
    const unbounded = rules.filter(
      (r) =>
        r.adaptation_type === "permissive" &&
        (!r.boundary_conditions || Object.keys(r.boundary_conditions).length === 0)
    );
    if (unbounded.length > 0) {
      violations.push(
        `${unbounded.length} permissive rule(s) on bounded doctrine "${doctrine.doctrine_name}" lack boundary conditions. Boundaries are required for bounded doctrines.`
      );
    }
  }

  // Core scope doctrines cannot be locally overridden
  if (doctrine.doctrine_scope === "core") {
    const localOverrides = rules.filter(
      (r) => r.adaptation_type === "permissive" || r.adaptation_type === "sequencing"
    );
    if (localOverrides.length > 0) {
      violations.push(
        `Core-scoped doctrine "${doctrine.doctrine_name}" has ${localOverrides.length} local override attempt(s). Core doctrines cannot be permissively overridden.`
      );
    }
  }

  return {
    allowed: violations.length === 0,
    reason: violations.length === 0
      ? "All boundary checks passed."
      : `${violations.length} boundary violation(s) detected.`,
    violations,
  };
}
