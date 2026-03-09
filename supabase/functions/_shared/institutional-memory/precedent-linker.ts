/**
 * Precedent Linker — Sprint 103
 * Links memory assets to doctrines, decisions, conflicts, incidents, and continuity records.
 */

export interface PrecedentLink {
  memory_asset_id: string;
  linked_entity_type: string;
  linked_entity_id: string;
  link_strength: number;
  link_reason: string;
}

export interface PrecedentAnalysis {
  total_links: number;
  strongest_link_type: string;
  precedent_weight: number;
  links: PrecedentLink[];
}

export function analyzePrecedentLinks(
  memoryAssetId: string,
  sourceType: string,
  sourceRef: string,
  memoryPayload: Record<string, unknown>
): PrecedentAnalysis {
  const links: PrecedentLink[] = [];

  // Link based on source type
  if (sourceType && sourceRef) {
    links.push({
      memory_asset_id: memoryAssetId,
      linked_entity_type: sourceType,
      linked_entity_id: sourceRef,
      link_strength: 0.9,
      link_reason: `Direct source reference (${sourceType}).`,
    });
  }

  // Check payload for embedded references
  const refFields = ["doctrine_id", "decision_id", "conflict_id", "incident_id", "plan_id", "assessment_id"];
  for (const field of refFields) {
    if (memoryPayload[field]) {
      const entityType = field.replace("_id", "");
      links.push({
        memory_asset_id: memoryAssetId,
        linked_entity_type: entityType,
        linked_entity_id: String(memoryPayload[field]),
        link_strength: 0.7,
        link_reason: `Embedded reference to ${entityType} found in payload.`,
      });
    }
  }

  const strongest = links.reduce((best, l) => (l.link_strength > best.link_strength ? l : best), links[0] || { linked_entity_type: "none", link_strength: 0 });
  const precedentWeight = Math.min(1, links.reduce((s, l) => s + l.link_strength * 0.3, 0));

  return {
    total_links: links.length,
    strongest_link_type: strongest?.linked_entity_type || "none",
    precedent_weight: Math.round(precedentWeight * 1000) / 1000,
    links,
  };
}
