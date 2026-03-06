// Agent OS — Default Stage Policies
// Defines the cognitive pipeline flow and rollback rules.

import type { StagePolicy } from "./types.ts";

export function createDefaultPolicies(): StagePolicy[] {
  return [
    {
      stage: "perception",
      requiredTypes: ["perception"],
      nextOnSuccess: "design",
      nextOnFailure: "done",
    },
    {
      stage: "design",
      requiredTypes: ["design"],
      nextOnSuccess: "build",
      nextOnFailure: "done",
    },
    {
      stage: "build",
      requiredTypes: ["build"],
      nextOnSuccess: "validation",
      nextOnFailure: "done",
    },
    {
      stage: "validation",
      requiredTypes: ["validation"],
      minSuccessScore: 0.75,
      nextOnSuccess: "evolution",
      nextOnFailure: "design", // rollback to design on failed validation
    },
    {
      stage: "evolution",
      requiredTypes: ["evolution"],
      nextOnSuccess: "done",
      nextOnFailure: "done",
    },
  ];
}
