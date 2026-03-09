/**
 * Memory Classification Engine — Sprint 103
 * Classifies memory objects by institutional importance and function.
 */

export interface MemoryClassRecord {
  id: string;
  class_code: string;
  class_name: string;
  class_type: string;
  retention_level: string;
  reconstruction_required: boolean;
  deletion_requires_review: boolean;
}

export interface ClassificationResult {
  class_code: string;
  class_type: string;
  retention_level: string;
  reconstruction_required: boolean;
  deletion_requires_review: boolean;
  classification_reason: string;
}

const CLASS_PRIORITY: Record<string, number> = {
  critical: 5,
  precedent: 4,
  reconstructable: 3,
  operational: 2,
  temporary: 1,
  disposable: 0,
};

export function classifyMemoryAsset(
  sourceType: string,
  precedentWeight: number,
  sensitivityLevel: string,
  classes: MemoryClassRecord[]
): ClassificationResult {
  // High precedent weight → precedent class
  if (precedentWeight >= 0.7) {
    const precedentClass = classes.find((c) => c.class_type === "precedent");
    if (precedentClass) {
      return {
        class_code: precedentClass.class_code,
        class_type: "precedent",
        retention_level: "permanent",
        reconstruction_required: true,
        deletion_requires_review: true,
        classification_reason: `High precedent weight (${precedentWeight}) — classified as protected institutional precedent.`,
      };
    }
  }

  // Critical sensitivity
  if (sensitivityLevel === "critical" || sensitivityLevel === "high") {
    const criticalClass = classes.find((c) => c.class_type === "critical");
    if (criticalClass) {
      return {
        class_code: criticalClass.class_code,
        class_type: "critical",
        retention_level: "permanent",
        reconstruction_required: true,
        deletion_requires_review: true,
        classification_reason: `Sensitivity level "${sensitivityLevel}" — classified as critical institutional memory.`,
      };
    }
  }

  // Source-based classification
  if (sourceType === "doctrine" || sourceType === "decision" || sourceType === "conflict_resolution") {
    const opClass = classes.find((c) => c.class_type === "operational") || classes.find((c) => c.class_type === "critical");
    if (opClass) {
      return {
        class_code: opClass.class_code,
        class_type: opClass.class_type,
        retention_level: opClass.retention_level,
        reconstruction_required: opClass.reconstruction_required,
        deletion_requires_review: opClass.deletion_requires_review,
        classification_reason: `Source type "${sourceType}" maps to ${opClass.class_type} memory class.`,
      };
    }
  }

  // Default: operational
  const defaultClass = classes.sort((a, b) => (CLASS_PRIORITY[a.class_type] || 0) - (CLASS_PRIORITY[b.class_type] || 0))[0];
  return {
    class_code: defaultClass?.class_code || "UNKNOWN",
    class_type: defaultClass?.class_type || "operational",
    retention_level: defaultClass?.retention_level || "bounded",
    reconstruction_required: false,
    deletion_requires_review: true,
    classification_reason: "Default classification applied — no specific rules matched.",
  };
}
