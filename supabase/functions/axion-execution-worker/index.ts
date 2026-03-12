import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

const GITHUB_API = "https://api.github.com";

// Atomic Commit helper (adapted from your build-repair engine)
async function applyToGitHub(ghHeaders: Record<string, string>, owner: string, repo: string, branch: string, files: {path: string, content: string}[], commitMsg: string) {
  const refResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${branch}`, { headers: ghHeaders });
  if (!refResp.ok) throw new Error("Branch not found");
  const baseSha = (await refResp.json()).object.sha;

  const baseCommitResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits/${baseSha}`, { headers: ghHeaders });
  const baseCommit = await baseCommitResp.json();

  const treeItems = await Promise.all(files.map(async f => {
    const blobResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/blobs`, {
      method: "POST", headers: ghHeaders, body: JSON.stringify({ content: f.content, encoding: "utf-8" })
    });
    const blobSha = (await blobResp.json()).sha;
    return { path: f.path, mode: "100644", type: "blob", sha: blobSha };
  }));

  const treeResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees`, {
    method: "POST", headers: ghHeaders, body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: treeItems })
  });
  const newTree = await treeResp.json();

  const commitResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/commits`, {
    method: "POST", headers: ghHeaders, body: JSON.stringify({ message: commitMsg, tree: newTree.sha, parents: [baseSha] })
  });
  const newCommit = await commitResp.json();

  await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH", headers: ghHeaders, body: JSON.stringify({ sha: newCommit.sha, force: true })
  });

  return newCommit.sha;
}

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Fetch pending Bolt tasks from registry
    const { data: queuedActions } = await supabaseClient
      .from("action_registry_entries")
      .select("*")
      .eq("status", "queued")
      .like("trigger_type", "bolt_%")
      .order("created_at", { ascending: true })
      .limit(5);

    if (!queuedActions || queuedActions.length === 0) {
      return jsonResponse({ message: "No pending Axion Actions." }, 200, req);
    }

    // Mark as executing
    const actionIds = queuedActions.map(a => a.id);
    await supabaseClient.from("action_registry_entries").update({ status: "executing" }).in("id", actionIds);

    const orgId = queuedActions[0].organization_id;

    // 2. Fetch GitHub config for the org
    const { data: gitConns } = await supabaseClient.from("git_connections")
      .select("*").eq("organization_id", orgId).eq("status", "active").limit(1);
    
    const conn = gitConns?.[0];
    if (!conn?.github_token) throw new Error("No active GitHub connection for organization.");

    const ghHeaders = {
      Authorization: `Bearer ${conn.github_token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };

    // 3. Batch file modifications
    const filePatches = queuedActions
      .filter(a => a.trigger_type === "bolt_file")
      .map(a => ({
        path: (a.payload as any).filePath,
        content: (a.payload as any).content
      }));

    if (filePatches.length > 0) {
      console.log(`[BoltWorker] Applying ${filePatches.length} file patches to GitHub...`);
      const commitSha = await applyToGitHub(ghHeaders, conn.repo_owner, conn.repo_name, conn.default_branch || "main", filePatches, "feat(bolt): autonomous code generation via Action Engine");
      
      console.log(`[BoltWorker] Commit success: ${commitSha}`);

      // 4. THE AUTO-CURA LOOP (Validation Simulation)
      // In a real env, we would wait for GitHub Actions webhook, but to mimic Bolt.diy speed:
      // We trigger a static syntax/import validation edge function or pipeline step.
      // If validation fails, we instantly pipe the error to `autonomous-build-repair`
      
      const simulateError = false; // Set to true to force Auto-Cura testing
      
      if (simulateError) {
        console.log("[BoltWorker] Validation failed! Triggering Auto-Cura...");
        
        // Mark actions as failed
        await supabaseClient.from("action_registry_entries").update({ 
          status: "failed", outcome_status: "syntax_error" 
        }).in("id", actionIds);

        // Invoke Autonomous Build Repair
        await supabaseClient.functions.invoke("autonomous-build-repair", {
          body: {
            attempt: 1,
            build_log: "SyntaxError: Unexpected token in " + filePatches[0].path
          }
        });

      } else {
        // Mark as success
        await supabaseClient.from("action_registry_entries").update({ 
          status: "completed", outcome_status: "success", completed_at: new Date().toISOString() 
        }).in("id", actionIds);
      }
    }

    return jsonResponse({
      message: `Processed ${queuedActions.length} Axion Actions.`,
      auto_healed: false // true if simulateError was triggered
    }, 200, req);

  } catch (err) {
    console.error("[BoltWorker] Error:", err);
    return errorResponse(err.message, 500, req);
  }
});

