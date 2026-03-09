/**
 * Simulation Constitution Resolver — Sprint 110
 * Resolves active continuity simulation constitution and horizon settings.
 */

export interface SimulationConstitution {
  id: string;
  constitution_code: string;
  constitution_name: string;
  scope: string;
  status: string;
  simulation_principles: string;
  default_horizon_settings: Record<string, unknown>;
}

export function resolveActiveConstitution(constitutions: SimulationConstitution[]): SimulationConstitution | null {
  return constitutions.find(c => c.status === "active") || constitutions[0] || null;
}

export function extractHorizonSettings(constitution: SimulationConstitution): Record<string, unknown> {
  return typeof constitution.default_horizon_settings === "object" && constitution.default_horizon_settings
    ? constitution.default_horizon_settings
    : {};
}
