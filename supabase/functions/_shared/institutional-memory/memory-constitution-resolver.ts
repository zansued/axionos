/**
 * Memory Constitution Resolver — Sprint 103
 * Resolves the active constitution and its default principles.
 */

export interface ConstitutionRecord {
  id: string;
  constitution_code: string;
  constitution_name: string;
  constitution_scope: string;
  constitution_status: string;
  constitutional_principles: string;
  default_retention_policy: Record<string, unknown>;
  default_reconstruction_policy: Record<string, unknown>;
}

export interface ResolvedConstitution {
  constitution: ConstitutionRecord | null;
  principles: string[];
  default_retention: Record<string, unknown>;
  default_reconstruction: Record<string, unknown>;
  status: "active" | "no_constitution";
}

export function resolveActiveConstitution(constitutions: ConstitutionRecord[]): ResolvedConstitution {
  const active = constitutions.find((c) => c.constitution_status === "active");
  if (!active) {
    return {
      constitution: null,
      principles: [],
      default_retention: {},
      default_reconstruction: {},
      status: "no_constitution",
    };
  }

  const principles = active.constitutional_principles
    .split("\n")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return {
    constitution: active,
    principles,
    default_retention: active.default_retention_policy,
    default_reconstruction: active.default_reconstruction_policy,
    status: "active",
  };
}
