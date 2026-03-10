/**
 * Doctrine Asset Packager — Sprint 122
 * Assembles reusable doctrine packs from moat domains.
 */

export interface DoctrinePackInput {
  domain_name: string;
  doctrine_entries: Array<{ key: string; value: string; confidence: number }>;
  canon_entries: Array<{ pattern_key: string; description: string }>;
  autonomy_config: { level: number; allowed_actions: string[] };
}

export interface DoctrinePack {
  pack_name: string;
  domain_scope: string;
  contents: {
    doctrine_count: number;
    canon_count: number;
    autonomy_level: number;
    summary: string;
  };
  doctrine_entries: DoctrinePackInput["doctrine_entries"];
  canon_entries: DoctrinePackInput["canon_entries"];
  autonomy_config: DoctrinePackInput["autonomy_config"];
}

export function packageDoctrineAsset(input: DoctrinePackInput): DoctrinePack {
  return {
    pack_name: `${input.domain_name}-doctrine-pack`,
    domain_scope: input.domain_name,
    contents: {
      doctrine_count: input.doctrine_entries.length,
      canon_count: input.canon_entries.length,
      autonomy_level: input.autonomy_config.level,
      summary: `Doctrine pack for '${input.domain_name}' with ${input.doctrine_entries.length} doctrine entries, ${input.canon_entries.length} canon patterns, autonomy L${input.autonomy_config.level}.`,
    },
    doctrine_entries: input.doctrine_entries,
    canon_entries: input.canon_entries,
    autonomy_config: input.autonomy_config,
  };
}
