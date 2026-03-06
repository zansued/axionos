// Error Signature Normalizer — AxionOS Sprint 7
// Deterministic normalization of error messages into reusable pattern signatures.

/**
 * Normalize a raw error message into a reusable pattern signature.
 *
 * Rules:
 * - Strip absolute/relative file paths
 * - Strip line:column references
 * - Strip volatile identifiers (UUIDs, hashes, timestamps)
 * - Strip semver versions
 * - Collapse whitespace
 * - Preserve error family and semantic structure
 */
export function normalizeErrorSignature(rawMessage: string): string {
  return rawMessage
    // File paths (quoted or unquoted)
    .replace(/['"]?([A-Za-z]:)?[\/\\][\w\/\\.@-]+['"]?/g, "<PATH>")
    .replace(/['"]@\/[\w\/\\.@-]+['"]?/g, "<PATH>")
    .replace(/['"]\.\.?\/[\w\/\\.@-]+['"]?/g, "<PATH>")
    // Line:column references
    .replace(/:\d+:\d+/g, ":<L>:<C>")
    .replace(/\bline \d+/gi, "line <L>")
    .replace(/\bcol(umn)? \d+/gi, "col <C>")
    // UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<UUID>")
    // Git SHAs
    .replace(/\b[a-f0-9]{7,40}\b/g, "<HASH>")
    // Semver
    .replace(/\d+\.\d+\.\d+(-[\w.]+)?/g, "<VER>")
    // Timestamps
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, "<TS>")
    // Large numbers (likely IDs)
    .replace(/\b\d{6,}\b/g, "<ID>")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/**
 * Extract likely affected file types from an error message.
 */
export function extractFileTypes(errorMessage: string): string[] {
  const extensions = new Set<string>();
  const matches = errorMessage.matchAll(/\.(tsx?|jsx?|json|css|html|mjs|cjs|vue|svelte)\b/gi);
  for (const m of matches) {
    extensions.add(`.${m[1]!.toLowerCase()}`);
  }
  return [...extensions];
}

/**
 * Generate a deterministic pattern key from category + normalized signature.
 */
export function computePatternKey(category: string, normalizedSignature: string): string {
  return `${category}::${normalizedSignature}`;
}
