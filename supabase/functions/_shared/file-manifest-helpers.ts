/**
 * Sprint 212 — File Manifest Helpers
 * 
 * Manages the initiative_file_manifest table:
 * - Populate during planning (from subtasks/stories)
 * - Update status during execution
 * - Query for import validation
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface ManifestEntry {
  file_path: string;
  file_type: string | null;
  status: string;
  subtask_id: string | null;
  story_id: string | null;
  node_id: string | null;
  wave_num: number | null;
}

/**
 * Populate the file manifest from story_subtasks that have file_path set.
 * Called after planning stage completes.
 * Uses upsert to be idempotent.
 */
export async function populateManifestFromSubtasks(
  serviceClient: SupabaseClient,
  initiativeId: string,
  organizationId: string,
): Promise<{ inserted: number; total: number }> {
  // Fetch all subtasks with file_path for this initiative
  const { data: subtasks } = await serviceClient
    .from("story_subtasks")
    .select("id, file_path, file_type, story_id")
    .eq("initiative_id", initiativeId)
    .not("file_path", "is", null);

  if (!subtasks || subtasks.length === 0) {
    return { inserted: 0, total: 0 };
  }

  // Deduplicate by file_path (keep last subtask per path)
  const pathMap = new Map<string, typeof subtasks[0]>();
  for (const st of subtasks) {
    if (st.file_path) pathMap.set(st.file_path, st);
  }

  const rows = [...pathMap.entries()].map(([filePath, st]) => ({
    initiative_id: initiativeId,
    organization_id: organizationId,
    file_path: filePath,
    file_type: st.file_type || null,
    status: "planned",
    subtask_id: st.id,
    story_id: st.story_id || null,
  }));

  // Add deterministic entry files if not already planned
  const entryFiles = [
    { file_path: "package.json", file_type: "config" },
    { file_path: "index.html", file_type: "config" },
    { file_path: "src/main.tsx", file_type: "component" },
    { file_path: "src/App.tsx", file_type: "component" },
    { file_path: "src/index.css", file_type: "style" },
    { file_path: "vite.config.ts", file_type: "config" },
    { file_path: "tsconfig.json", file_type: "config" },
    { file_path: "tsconfig.app.json", file_type: "config" },
    { file_path: "tsconfig.node.json", file_type: "config" },
    { file_path: "vercel.json", file_type: "config" },
    { file_path: "postcss.config.js", file_type: "config" },
    { file_path: "tailwind.config.js", file_type: "config" },
    { file_path: "eslint.config.js", file_type: "config" },
    { file_path: "src/lib/supabase.ts", file_type: "utility" },
    { file_path: "src/lib/utils.ts", file_type: "utility" },
  ];

  for (const ef of entryFiles) {
    if (!pathMap.has(ef.file_path)) {
      rows.push({
        initiative_id: initiativeId,
        organization_id: organizationId,
        file_path: ef.file_path,
        file_type: ef.file_type,
        status: "planned",
        subtask_id: null,
        story_id: null,
      });
    }
  }

  const { error } = await serviceClient
    .from("initiative_file_manifest")
    .upsert(rows, { onConflict: "initiative_id,file_path", ignoreDuplicates: false });

  if (error) {
    console.error("[Sprint 212] Failed to populate manifest:", error.message);
  }

  return { inserted: rows.length, total: rows.length };
}

/**
 * Update a file's status in the manifest (e.g. planned → generating → generated).
 */
export async function updateManifestStatus(
  serviceClient: SupabaseClient,
  initiativeId: string,
  filePath: string,
  status: "generating" | "generated" | "failed" | "skipped",
  extra: { contentHash?: string; nodeId?: string; waveNum?: number } = {},
): Promise<void> {
  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (extra.contentHash) update.content_hash = extra.contentHash;
  if (extra.nodeId) update.node_id = extra.nodeId;
  if (extra.waveNum !== undefined) update.wave_num = extra.waveNum;

  await serviceClient
    .from("initiative_file_manifest")
    .update(update)
    .eq("initiative_id", initiativeId)
    .eq("file_path", filePath);
}

/**
 * Get all file paths from the manifest for an initiative.
 * Used by Sprint 210 import validation.
 */
export async function getManifestPaths(
  serviceClient: SupabaseClient,
  initiativeId: string,
): Promise<string[]> {
  const { data } = await serviceClient
    .from("initiative_file_manifest")
    .select("file_path")
    .eq("initiative_id", initiativeId);

  return (data || []).map((r: any) => r.file_path);
}

/**
 * Get manifest summary for observability.
 */
export async function getManifestSummary(
  serviceClient: SupabaseClient,
  initiativeId: string,
): Promise<{ total: number; planned: number; generated: number; failed: number; skipped: number }> {
  const { data } = await serviceClient
    .from("initiative_file_manifest")
    .select("status")
    .eq("initiative_id", initiativeId);

  const rows = data || [];
  return {
    total: rows.length,
    planned: rows.filter((r: any) => r.status === "planned").length,
    generated: rows.filter((r: any) => r.status === "generated").length,
    failed: rows.filter((r: any) => r.status === "failed").length,
    skipped: rows.filter((r: any) => r.status === "skipped").length,
  };
}
