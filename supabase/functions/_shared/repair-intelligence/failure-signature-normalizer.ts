/**
 * failure-signature-normalizer.ts
 * Normalizes raw error messages into stable, groupable signatures.
 */

export interface NormalizationResult {
  normalizedSignature: string;
  normalizationMethod: string;
  volatilePartsRemoved: string[];
}

export function normalizeFailureSignature(rawError: string): NormalizationResult {
  const volatilePartsRemoved: string[] = [];
  let normalized = rawError;

  // Remove file paths with line numbers
  const pathPattern = /(?:\/[\w.-]+)+:\d+(?::\d+)?/g;
  if (pathPattern.test(normalized)) {
    volatilePartsRemoved.push('file_paths');
    normalized = normalized.replace(pathPattern, '<PATH>');
  }

  // Remove UUIDs
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  if (uuidPattern.test(normalized)) {
    volatilePartsRemoved.push('uuids');
    normalized = normalized.replace(uuidPattern, '<UUID>');
  }

  // Remove timestamps
  const tsPattern = /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.\d]*Z?/g;
  if (tsPattern.test(normalized)) {
    volatilePartsRemoved.push('timestamps');
    normalized = normalized.replace(tsPattern, '<TIMESTAMP>');
  }

  // Remove hex addresses
  const hexPattern = /0x[0-9a-fA-F]{4,}/g;
  if (hexPattern.test(normalized)) {
    volatilePartsRemoved.push('hex_addresses');
    normalized = normalized.replace(hexPattern, '<ADDR>');
  }

  // Remove numeric sequences (IDs, ports, etc.)
  normalized = normalized.replace(/\b\d{5,}\b/g, '<NUM>');

  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Truncate for signature stability
  if (normalized.length > 512) {
    normalized = normalized.substring(0, 512);
  }

  return {
    normalizedSignature: normalized,
    normalizationMethod: 'standard_v1',
    volatilePartsRemoved,
  };
}

export async function registerSignature(
  supabase: any,
  organizationId: string,
  rawError: string,
  failureMemoryId?: string
): Promise<{ signatureId: string; normalized: string; isNew: boolean }> {
  const { normalizedSignature, normalizationMethod } = normalizeFailureSignature(rawError);

  const { data: existing } = await supabase
    .from('failure_signatures')
    .select('id, occurrence_count')
    .eq('organization_id', organizationId)
    .eq('normalized_signature', normalizedSignature)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('failure_signatures')
      .update({
        last_seen_at: new Date().toISOString(),
        occurrence_count: (existing.occurrence_count || 0) + 1,
      })
      .eq('id', existing.id);
    return { signatureId: existing.id, normalized: normalizedSignature, isNew: false };
  }

  const { data, error } = await supabase
    .from('failure_signatures')
    .insert({
      organization_id: organizationId,
      raw_error: rawError.substring(0, 2000),
      normalized_signature: normalizedSignature,
      normalization_method: normalizationMethod,
      failure_memory_id: failureMemoryId,
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to register signature: ${error.message}`);
  return { signatureId: data.id, normalized: normalizedSignature, isNew: true };
}
