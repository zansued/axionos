/**
 * Memory Loss Detector — Sprint 103
 * Detects loss, decay, fragmentation, or broken lineage of important memory.
 */

export interface MemoryAssetSummary {
  id: string;
  memory_code: string;
  title: string;
  class_type: string;
  retention_level: string;
  current_status: string;
  precedent_weight: number;
  retention_deadline: string | null;
  source_ref: string;
}

export interface LossDetection {
  loss_type: string;
  severity: "low" | "moderate" | "high" | "critical";
  asset_code: string;
  summary: string;
  recoverability: "recoverable" | "partially_recoverable" | "unrecoverable";
}

export function detectMemoryLoss(assets: MemoryAssetSummary[]): LossDetection[] {
  const detections: LossDetection[] = [];
  const now = new Date();

  for (const asset of assets) {
    // Expired critical memory
    if (asset.retention_deadline) {
      const deadline = new Date(asset.retention_deadline);
      if (now > deadline && (asset.class_type === "critical" || asset.class_type === "precedent")) {
        detections.push({
          loss_type: "expiration_risk",
          severity: "critical",
          asset_code: asset.memory_code,
          summary: `Critical/precedent memory "${asset.title}" has passed its retention deadline without review.`,
          recoverability: "recoverable",
        });
      }
    }

    // Broken source reference
    if (!asset.source_ref || asset.source_ref === "") {
      if (asset.class_type !== "disposable" && asset.class_type !== "temporary") {
        detections.push({
          loss_type: "broken_lineage",
          severity: asset.class_type === "critical" ? "high" : "moderate",
          asset_code: asset.memory_code,
          summary: `Memory "${asset.title}" has no source reference — lineage is broken.`,
          recoverability: "partially_recoverable",
        });
      }
    }

    // Archived high-precedent memory
    if (asset.current_status === "archived" && asset.precedent_weight >= 0.7) {
      detections.push({
        loss_type: "precedent_archived",
        severity: "high",
        asset_code: asset.memory_code,
        summary: `High-precedent memory "${asset.title}" (weight: ${asset.precedent_weight}) is archived — may cause institutional amnesia.`,
        recoverability: "recoverable",
      });
    }

    // Expired without replacement
    if (asset.current_status === "expired" && asset.retention_level === "permanent") {
      detections.push({
        loss_type: "permanent_expired",
        severity: "critical",
        asset_code: asset.memory_code,
        summary: `Permanent-retention memory "${asset.title}" is marked as expired — governance violation.`,
        recoverability: "recoverable",
      });
    }
  }

  return detections;
}
