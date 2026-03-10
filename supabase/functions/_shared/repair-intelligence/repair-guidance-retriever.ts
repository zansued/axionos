/**
 * repair-guidance-retriever.ts
 * Retrieves repair intelligence for a given failure context.
 */

export interface RepairGuidance {
  failureMemoryId: string;
  signature: string;
  recommendedStrategies: Array<{
    strategy: string;
    confidence: number;
    successRate: number;
    sampleSize: number;
    cautions: string[];
  }>;
  avoidStrategies: Array<{
    strategy: string;
    failureCount: number;
    reason: string;
  }>;
  falsFixWarnings: string[];
  containmentGuidance: string | null;
  validationRequirements: unknown[];
}

export async function retrieveRepairGuidance(
  supabase: any,
  organizationId: string,
  signature: string
): Promise<RepairGuidance | null> {
  const { data: entry } = await supabase
    .from('failure_memory_entries')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('signature', signature)
    .eq('lifecycle_status', 'active')
    .maybeSingle();

  if (!entry) return null;

  // Get mitigation patterns
  const { data: patterns } = await supabase
    .from('mitigation_patterns')
    .select('*')
    .eq('failure_memory_id', entry.id)
    .eq('lifecycle_status', 'active')
    .order('confidence_score', { ascending: false });

  // Get false fixes
  const { data: falseFixes } = await supabase
    .from('false_fix_records')
    .select('description, danger_level')
    .eq('failure_memory_id', entry.id);

  // Build recommended strategies from successful patterns
  const recommendedStrategies = (patterns || []).map((p: any) => ({
    strategy: p.strategy_type,
    confidence: p.confidence_score,
    successRate: p.success_rate,
    sampleSize: p.sample_size,
    cautions: p.cautions || [],
  }));

  // Build avoid list from failed repairs
  const failedRepairs: Record<string, number> = {};
  const failed = Array.isArray(entry.failed_repairs) ? entry.failed_repairs : [];
  for (const r of failed) {
    failedRepairs[r.strategy] = (failedRepairs[r.strategy] || 0) + 1;
  }
  const avoidStrategies = Object.entries(failedRepairs)
    .filter(([_, count]) => count >= 2)
    .map(([strategy, count]) => ({
      strategy,
      failureCount: count,
      reason: `Failed ${count} times for this failure signature`,
    }));

  return {
    failureMemoryId: entry.id,
    signature: entry.signature,
    recommendedStrategies,
    avoidStrategies,
    falsFixWarnings: (falseFixes || []).map((f: any) => `[${f.danger_level}] ${f.description}`),
    containmentGuidance: entry.containment_guidance,
    validationRequirements: Array.isArray(entry.validation_requirements) ? entry.validation_requirements : [],
  };
}
