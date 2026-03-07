/**
 * Prompt Lineage View — Sprint 22
 *
 * Preserves and exposes the lineage of prompt variant promotions.
 * Enables explainability: who was control, who replaced whom, and why.
 */

export interface LineageEntry {
  variantId: string;
  variantName: string;
  stageKey: string;
  status: string;
  promotedAt: string | null;
  retiredAt: string | null;
  promotionReason: Record<string, unknown> | null;
  rollbackReason: Record<string, unknown> | null;
  wasRolledBack: boolean;
}

export interface ControlLineage {
  stageKey: string;
  currentControl: LineageEntry | null;
  history: LineageEntry[];
}

/**
 * Build a lineage view from promotions and rollback data.
 */
export function buildControlLineage(
  stageKey: string,
  variants: Array<{
    id: string;
    variant_name: string;
    stage_key: string;
    status: string;
  }>,
  promotions: Array<{
    promoted_variant_id: string;
    previous_control_variant_id: string | null;
    promotion_reason: Record<string, unknown>;
    created_at: string;
  }>,
  rollbacks: Array<{
    rolled_back_variant_id: string;
    restored_control_variant_id: string;
    rollback_reason: Record<string, unknown>;
    created_at: string;
  }>,
): ControlLineage {
  const variantMap = new Map(variants.map((v) => [v.id, v]));
  const history: LineageEntry[] = [];

  // Build history from promotions (oldest first)
  const sortedPromotions = [...promotions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  for (const promo of sortedPromotions) {
    const variant = variantMap.get(promo.promoted_variant_id);
    if (!variant) continue;

    const wasRolledBack = rollbacks.some(
      (rb) => rb.rolled_back_variant_id === promo.promoted_variant_id,
    );

    const rollback = rollbacks.find(
      (rb) => rb.rolled_back_variant_id === promo.promoted_variant_id,
    );

    history.push({
      variantId: variant.id,
      variantName: variant.variant_name,
      stageKey: variant.stage_key,
      status: variant.status,
      promotedAt: promo.created_at,
      retiredAt: rollback?.created_at ?? null,
      promotionReason: promo.promotion_reason,
      rollbackReason: rollback?.rollback_reason as Record<string, unknown> ?? null,
      wasRolledBack,
    });
  }

  // Current control is the variant with status active_control
  const currentControlVariant = variants.find(
    (v) => v.stage_key === stageKey && v.status === "active_control",
  );

  const currentControl = currentControlVariant
    ? {
        variantId: currentControlVariant.id,
        variantName: currentControlVariant.variant_name,
        stageKey: currentControlVariant.stage_key,
        status: currentControlVariant.status,
        promotedAt: sortedPromotions.find(
          (p) => p.promoted_variant_id === currentControlVariant.id,
        )?.created_at ?? null,
        retiredAt: null,
        promotionReason: sortedPromotions.find(
          (p) => p.promoted_variant_id === currentControlVariant.id,
        )?.promotion_reason ?? null,
        rollbackReason: null,
        wasRolledBack: false,
      }
    : null;

  return { stageKey, currentControl, history };
}
