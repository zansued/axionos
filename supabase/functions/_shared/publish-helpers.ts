/**
 * Sprint 75 — Publish Helpers
 * Extracted from pipeline-publish/index.ts for maintainability.
 * Contains: error builders, review persistence, CI workflow generation, path sanitization.
 */

// ── Sprint 205: Structured Publish Error ──

export interface PublishError {
  error: string;
  category: "auth" | "artifact" | "dependency" | "config" | "github" | "unknown";
  missing_artifact?: string;
  suggested_action: string;
}

export function buildPublishError(
  category: PublishError["category"],
  missingArtifact: string | null,
  suggestedAction: string,
): string {
  const err: PublishError = {
    error: `Publish bloqueado: [${category}] ${missingArtifact || "erro desconhecido"}`,
    category,
    ...(missingArtifact ? { missing_artifact: missingArtifact } : {}),
    suggested_action: suggestedAction,
  };
  return JSON.stringify(err);
}

// ── File entry type used across publish pipeline ──

export interface FileEntry {
  path: string;
  content: string;
  type: string;
  summary: string;
}

/**
 * Sanitize a file path for the GitHub Tree API.
 * - Removes trailing slashes (GitHub rejects them with 422)
 * - Removes leading slashes
 * - Collapses double slashes
 * - Trims whitespace
 */
export function sanitizeTreePath(filePath: string): string {
  return filePath
    .trim()
    .replace(/\\/+/g, "/")   // normalize backslashes
    .replace(/\/+/g, "/")    // collapse double slashes
    .replace(/^\//, "")      // remove leading slash
    .replace(/\/$/, "");     // remove trailing slash
}

/**
 * Filter and sanitize file entries, removing invalid ones.
 */
export function sanitizeFileEntries(entries: FileEntry[]): { valid: FileEntry[]; removed: string[] } {
  const removed: string[] = [];
  const valid: FileEntry[] = [];

  for (const entry of entries) {
    const cleaned = sanitizeTreePath(entry.path);
    if (!cleaned || cleaned === "." || cleaned === "..") {
      removed.push(entry.path);
      continue;
    }
    valid.push({ ...entry, path: cleaned });
  }

  // Deduplicate by path (keep last occurrence)
  const pathMap = new Map<string, FileEntry>();
  for (const v of valid) {
    pathMap.set(v.path, v);
  }

  return { valid: [...pathMap.values()], removed };
}

// ── Review persistence ──

export async function persistReview(
  client: any,
  outputId: string,
  userId: string,
  action: string,
  prevStatus: string,
  comment: string,
): Promise<void> {
  await client.from("artifact_reviews").insert({
    output_id: outputId,
    reviewer_id: userId,
    action,
    previous_status: prevStatus,
    new_status: prevStatus,
    comment,
  });
}

// ── CI Workflow generation ──

export function generateCIWorkflow(
  supabaseUrl: string,
  initiativeId: string,
  organizationId: string,
): string {
  const webhookUrl = `${supabaseUrl}/functions/v1/pipeline-ci-webhook`;
  return `name: AxionOS Validate

on:
  push:
    branches: [main, master]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        id: install
        run: npm install --legacy-peer-deps 2>&1 | tee /tmp/install.log
        continue-on-error: true

      - name: TypeScript check
        id: typecheck
        if: steps.install.outcome == 'success'
        run: npx tsc --noEmit 2>&1 | tee /tmp/tsc.log
        continue-on-error: true

      - name: Build
        id: build
        if: steps.typecheck.outcome == 'success'
        run: npx vite build 2>&1 | tee /tmp/build.log
        continue-on-error: true

      - name: Parse errors and notify
        if: always()
        env:
          WEBHOOK_SECRET: \${{ secrets.SYNKRAIOS_WEBHOOK_SECRET }}
        run: |
          STATUS="success"
          ERRORS="[]"
          BUILD_LOG=""

          if [ "\${{ steps.install.outcome }}" != "success" ]; then
            STATUS="failure"
            BUILD_LOG=$(cat /tmp/install.log 2>/dev/null | tail -50)
            ERRORS=$(echo "$BUILD_LOG" | grep -i "ERR\!" | head -10 | jq -R -s 'split("\n") | map(select(length > 0)) | map({file: "package.json", line: null, column: null, message: ., category: "dependency"})' 2>/dev/null || echo "[]")
          elif [ "\${{ steps.typecheck.outcome }}" != "success" ]; then
            STATUS="failure"
            BUILD_LOG=$(cat /tmp/tsc.log 2>/dev/null | tail -100)
            ERRORS=$(echo "$BUILD_LOG" | grep -E "^src/" | head -20 | sed 's/\(([0-9]*\),[0-9]*\)/|\1|/' | awk -F'|' '{print "{\"file\": \""$1"\", \"line\": "$2", \"column\": null, \"message\": \""$3"\", \"category\": \"typescript\"}"}' | jq -s '.' 2>/dev/null || echo "[]")
          elif [ "\${{ steps.build.outcome }}" != "success" ]; then
            STATUS="failure"
            BUILD_LOG=$(cat /tmp/build.log 2>/dev/null | tail -50)
            ERRORS=$(echo "$BUILD_LOG" | grep -i "error" | head -10 | jq -R -s 'split("\n") | map(select(length > 0)) | map({file: "vite.config.ts", line: null, column: null, message: ., category: "build"})' 2>/dev/null || echo "[]")
          fi

          curl -s -X POST "${webhookUrl}" \
            -H "Authorization: Bearer $WEBHOOK_SECRET" \
            -H "Content-Type: application/json" \
            -d "{
              \"initiative_id\": \"${initiativeId}\",
              \"organization_id\": \"${organizationId}\",
              \"status\": \"$STATUS\",
              \"errors\": $ERRORS,
              \"build_log\": $(echo "$BUILD_LOG" | jq -R -s '.'),
              \"duration_ms\": 0,
              \"repo_owner\": \"\${{ github.repository_owner }}\",
              \"repo_name\": \"\${{ github.event.repository.name }}\",
              \"run_id\": \"\${{ github.run_id }}\",
              \"commit_sha\": \"\${{ github.sha }}\"
            }"
`;
}
