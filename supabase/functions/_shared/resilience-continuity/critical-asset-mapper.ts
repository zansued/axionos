/**
 * Critical Asset Mapper — Sprint 102
 * Organizes critical assets and their dependency chains.
 */

export interface AssetRecord {
  id: string;
  asset_code: string;
  asset_name: string;
  asset_type: string;
  domain: string;
  criticality_level: string;
  continuity_tier: string;
}

export interface DependencyRecord {
  id: string;
  asset_id: string;
  depends_on_asset_id: string;
  dependency_type: string;
  dependency_strength: string;
  fallback_exists: boolean;
  recovery_complexity: string;
}

export interface AssetDependencyMap {
  asset: AssetRecord;
  dependencies: { target: AssetRecord; dependency: DependencyRecord }[];
  dependents: { source: AssetRecord; dependency: DependencyRecord }[];
  is_single_point_of_failure: boolean;
  criticality_chain_depth: number;
}

export function buildAssetDependencyMap(
  assets: AssetRecord[],
  dependencies: DependencyRecord[]
): AssetDependencyMap[] {
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  return assets.map((asset) => {
    const deps = dependencies
      .filter((d) => d.asset_id === asset.id)
      .map((d) => ({ target: assetMap.get(d.depends_on_asset_id)!, dependency: d }))
      .filter((d) => d.target);

    const dependents = dependencies
      .filter((d) => d.depends_on_asset_id === asset.id)
      .map((d) => ({ source: assetMap.get(d.asset_id)!, dependency: d }))
      .filter((d) => d.source);

    const isSPOF =
      dependents.length >= 2 &&
      dependents.some((d) => !d.dependency.fallback_exists) &&
      (asset.criticality_level === "critical" || asset.criticality_level === "high");

    return {
      asset,
      dependencies: deps,
      dependents,
      is_single_point_of_failure: isSPOF,
      criticality_chain_depth: deps.length,
    };
  });
}
