/**
 * OX-6: Integration Severity Classification
 * 
 * Replaces boolean `integrationModified` with a 3-level severity scale
 * based on edit distance between pre- and post-integration code.
 */

export type IntegrationSeverity = "none" | "minor_fix" | "major_fix";

/** Threshold: edits below this % of total chars = minor, above = major */
const MAJOR_FIX_THRESHOLD = 0.05; // 5%

/**
 * Compute a simple Levenshtein-inspired edit distance ratio.
 * For performance, uses a character-level diff approximation
 * rather than full Levenshtein (which is O(n*m) and too expensive
 * for large code strings).
 */
function approxEditDistanceRatio(before: string, after: string): number {
  if (before === after) return 0;
  if (!before || !after) return 1;

  const maxLen = Math.max(before.length, after.length);
  if (maxLen === 0) return 0;

  // Line-based diff: count changed lines / total lines
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);

  let changedLines = 0;
  for (const line of afterLines) {
    if (!beforeSet.has(line)) changedLines++;
  }
  for (const line of beforeLines) {
    if (!afterSet.has(line)) changedLines++;
  }

  const totalLines = Math.max(beforeLines.length, afterLines.length);
  return totalLines > 0 ? changedLines / (totalLines * 2) : 0;
}

/**
 * Classify integration severity based on how much the Integration Agent changed.
 */
export function classifyIntegrationSeverity(
  beforeCode: string,
  afterCode: string,
): { severity: IntegrationSeverity; editRatio: number } {
  if (afterCode === beforeCode) {
    return { severity: "none", editRatio: 0 };
  }

  const editRatio = approxEditDistanceRatio(beforeCode, afterCode);

  if (editRatio < MAJOR_FIX_THRESHOLD) {
    return { severity: "minor_fix", editRatio };
  }

  return { severity: "major_fix", editRatio };
}
