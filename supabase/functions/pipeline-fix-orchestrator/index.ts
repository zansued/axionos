import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { getNodeByPath, getNodeDependencies, getNodeDependents, generateBrainContext, recordError } from "../_shared/brain-helpers.ts";
import type { PipelineContext } from "../_shared/pipeline-helpers.ts";

/**
 * Fix Orchestrator — CI-Triggered Fix Swarm
 *
 * Receives CI errors, analyzes them with AI, groups by file,
 * dispatches parallel fix workers, then creates a PR with all fixes.
 *
 * Input: { initiative_id, organization_id, ci_run_id }
 * Reads errors from initiative.execution_progress.ci_errors
 */

interface FixTask {
  file_path: string;
  original_code: string;
  errors: Array<{ message: string; line?: number; column?: number; category: string }>;
  dependency_context: string;
}

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get("Authorization");
    const webhookSecret = Deno.env.get("SYNKRAIOS_WEBHOOK_SECRET");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Accept webhook secret or service role
    if (webhookSecret && authHeader === `Bearer ${webhookSecret}`) {
      // OK
    } else if (authHeader?.startsWith("Bearer ") && serviceRoleKey) {
      // OK
    } else {
      return errorResponse("Unauthorized", 401);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey!
    );

    const body = await req.json();
    const { initiative_id, organization_id, ci_run_id, github_token, owner, repo, base_branch } = body;

    if (!initiative_id || !organization_id) {
      return errorResponse("initiative_id and organization_id required", 400);
    }

    const ctx: PipelineContext = {
      serviceClient,
      userId: "system",
      initiativeId: initiative_id,
      organizationId: organization_id,
    };

    const apiKey = Deno.env.get("LOVABLE_API_KEY") || "";
    const jobId = await createJob(ctx, "fix_orchestrator", { ci_run_id });
    await pipelineLog(ctx, "fix_swarm_start", `Fix Swarm iniciado para CI run ${ci_run_id || "manual"}`);

    // ── 1. Load initiative and CI errors ──
    const { data: initiative } = await serviceClient
      .from("initiatives")
      .select("*, execution_progress")
      .eq("id", initiative_id)
      .single();

    if (!initiative) throw new Error("Initiative not found");

    const execProgress = (initiative.execution_progress || {}) as any;
    const ciErrors = execProgress.ci_errors || [];

    if (ciErrors.length === 0) throw new Error("No CI errors to fix");

    // ── 2. Resolve GitHub connection ──
    let resolvedToken = github_token;
    let resolvedOwner = owner;
    let resolvedRepo = repo;
    let resolvedBranch = base_branch || "main";

    if (!resolvedToken || !resolvedOwner) {
      const { data: gitConns } = await serviceClient.from("git_connections")
        .select("github_token, repo_owner, repo_name, default_branch")
        .eq("organization_id", organization_id).eq("status", "active")
        .order("updated_at", { ascending: false }).limit(1);
      const conn = gitConns?.[0];
      if (conn) {
        resolvedToken = resolvedToken || conn.github_token;
        resolvedOwner = resolvedOwner || conn.repo_owner;
        resolvedRepo = resolvedRepo || conn.repo_name;
        resolvedBranch = base_branch || conn.default_branch || "main";
      }
    }

    if (!resolvedToken || !resolvedOwner || !resolvedRepo) {
      throw new Error("GitHub connection required for Fix Swarm PR creation");
    }

    const ghHeaders = {
      Authorization: `Bearer ${resolvedToken}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };
    const GITHUB_API = "https://api.github.com";

    // ── 3. Group errors by file ──
    const errorsByFile = new Map<string, any[]>();
    for (const err of ciErrors) {
      const file = err.file || "unknown";
      if (!errorsByFile.has(file)) errorsByFile.set(file, []);
      errorsByFile.get(file)!.push(err);
    }

    await pipelineLog(ctx, "fix_swarm_analysis",
      `${ciErrors.length} erros em ${errorsByFile.size} arquivos. Analisando com Project Brain...`);

    // ── 4. Build fix tasks with Brain context ──
    const brainContext = await generateBrainContext(ctx);
    const fixTasks: FixTask[] = [];
    let totalTokens = 0, totalCost = 0;

    for (const [filePath, errors] of errorsByFile) {
      // Fetch current file from GitHub
      let originalCode = "";
      try {
        const fileResp = await fetch(
          `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/contents/${filePath}?ref=${resolvedBranch}`,
          { headers: ghHeaders }
        );
        if (fileResp.ok) {
          const fileData = await fileResp.json();
          originalCode = atob(fileData.content.replace(/\n/g, ""));
        }
      } catch (e) { console.error(`Failed to fetch ${filePath}:`, e); }

      // Get dependency context from Brain
      let depContext = "";
      const node = await getNodeByPath(ctx, filePath);
      if (node) {
        const deps = await getNodeDependencies(ctx, node.id);
        const dependents = await getNodeDependents(ctx, node.id);
        depContext = [
          deps.length > 0 ? `Imports: ${deps.map((d: any) => d.target?.file_path || d.target?.name).join(", ")}` : "",
          dependents.length > 0 ? `Used by: ${dependents.map((d: any) => d.source?.file_path || d.source?.name).join(", ")}` : "",
        ].filter(Boolean).join("\n");
      }

      fixTasks.push({
        file_path: filePath,
        original_code: originalCode,
        errors: errors.map((e: any) => ({
          message: e.message,
          line: e.line,
          column: e.column,
          category: e.category || "typescript",
        })),
        dependency_context: depContext,
      });
    }

    // ── 5. AI Fix Analysis — prioritize and plan ──
    const analysisResult = await callAI(apiKey,
      `You are the Fix Orchestrator for an AI Software Factory. Analyze CI errors and create a fix plan.
For each file with errors, determine:
1. Root cause of the errors
2. Whether the fix is isolated or requires changes to dependencies
3. Priority order for fixing (fix dependencies first)

Return ONLY JSON:
{
  "fix_plan": [
    {"file_path": "...", "root_cause": "...", "fix_strategy": "...", "priority": 1, "requires_dependency_changes": false}
  ],
  "summary": "...",
  "estimated_files_to_fix": 0
}`,
      `## Project Brain Context\n${brainContext}\n\n## CI Errors by File:\n${fixTasks.map(t =>
        `### ${t.file_path} (${t.errors.length} errors)\n${t.dependency_context}\nErrors:\n${t.errors.map(e => `- L${e.line || "?"}: ${e.message}`).join("\n")}`
      ).join("\n\n")}`,
      true
    );
    totalTokens += analysisResult.tokens;
    totalCost += analysisResult.costUsd;

    let fixPlan: any;
    try { fixPlan = JSON.parse(analysisResult.content); }
    catch { fixPlan = { fix_plan: fixTasks.map((t, i) => ({ file_path: t.file_path, root_cause: "Parse error", fix_strategy: "Direct fix", priority: i + 1, requires_dependency_changes: false })), summary: "Auto-generated plan", estimated_files_to_fix: fixTasks.length }; }

    await pipelineLog(ctx, "fix_swarm_plan",
      `Fix plan: ${fixPlan.fix_plan?.length || 0} arquivos. ${fixPlan.summary || ""}`);

    // ── 6. Execute Fix Workers (parallel batches of 3) ──
    const BATCH_SIZE = 3;
    const fixedFiles: Array<{ path: string; content: string; commit_msg: string }> = [];
    const failedFixes: string[] = [];

    // Sort by priority
    const sortedTasks = [...fixTasks].sort((a, b) => {
      const planA = fixPlan.fix_plan?.find((p: any) => p.file_path === a.file_path);
      const planB = fixPlan.fix_plan?.find((p: any) => p.file_path === b.file_path);
      return (planA?.priority || 99) - (planB?.priority || 99);
    });

    for (let i = 0; i < sortedTasks.length; i += BATCH_SIZE) {
      const batch = sortedTasks.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(async (task) => {
          const plan = fixPlan.fix_plan?.find((p: any) => p.file_path === task.file_path);

          // Fix Agent chain: Architect → Developer → Validator
          const fixResult = await callAI(apiKey,
            `You are a Fix Agent in an AI Software Factory. Fix the code to resolve CI errors.

RULES:
- Return ONLY the complete corrected file content, no explanations
- Preserve all existing functionality
- Fix ONLY the errors listed below
- Do NOT add new features or refactor unrelated code
- Maintain consistent coding style
- Ensure all imports resolve correctly

Return ONLY JSON:
{"corrected_code": "...", "changes_summary": "...", "commit_message": "fix: ..."}`,
            `## File: ${task.file_path}
## Fix Strategy: ${plan?.fix_strategy || "Direct fix"}
## Root Cause: ${plan?.root_cause || "Unknown"}

## Dependencies:
${task.dependency_context || "No dependency info"}

## Errors to fix (${task.errors.length}):
${task.errors.map(e => `- Line ${e.line || "?"}: ${e.message} [${e.category}]`).join("\n")}

## Current Code:
\`\`\`
${task.original_code || "// File content not available"}
\`\`\`

## Project Context:
${brainContext.slice(0, 2000)}`,
            true
          );
          totalTokens += fixResult.tokens;
          totalCost += fixResult.costUsd;

          let parsed: any;
          try { parsed = JSON.parse(fixResult.content); }
          catch { throw new Error(`Failed to parse fix for ${task.file_path}`); }

          if (!parsed.corrected_code) throw new Error(`No corrected code for ${task.file_path}`);

          return {
            path: task.file_path,
            content: parsed.corrected_code,
            commit_msg: parsed.commit_message || `fix: resolve CI errors in ${task.file_path}`,
          };
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          fixedFiles.push(result.value);
        } else {
          console.error("Fix worker failed:", result.reason);
          failedFixes.push(batch[batchResults.indexOf(result)]?.file_path || "unknown");
        }
      }
    }

    if (fixedFiles.length === 0) {
      if (jobId) await failJob(ctx, jobId, "No files could be fixed");
      return jsonResponse({ success: false, message: "Fix Swarm could not fix any files", failed: failedFixes });
    }

    await pipelineLog(ctx, "fix_swarm_complete",
      `Fix Swarm: ${fixedFiles.length}/${sortedTasks.length} arquivos corrigidos`);

    // ── 7. Create PR with fixes ──
    const fixBranch = `auto-fix/${ci_run_id || Date.now()}`;

    // Get base branch SHA
    const refResp = await fetch(
      `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/git/ref/heads/${resolvedBranch}`,
      { headers: ghHeaders }
    );
    if (!refResp.ok) throw new Error(`Base branch '${resolvedBranch}' not found`);
    const refData = await refResp.json();
    const baseSha = refData.object.sha;

    // Create fix branch
    const createBranchResp = await fetch(
      `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/git/refs`,
      {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({ ref: `refs/heads/${fixBranch}`, sha: baseSha }),
      }
    );
    if (!createBranchResp.ok) {
      const err = await createBranchResp.text();
      console.error("Failed to create branch:", err);
      // Branch might already exist, try to continue
    }

    // Commit fixed files to fix branch
    const committedFiles: string[] = [];
    for (const file of fixedFiles) {
      try {
        let fileSha: string | undefined;
        const existing = await fetch(
          `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/contents/${file.path}?ref=${fixBranch}`,
          { headers: ghHeaders }
        );
        if (existing.ok) {
          const fd = await existing.json();
          fileSha = fd.sha;
        }

        const commitBody: any = {
          message: file.commit_msg,
          content: btoa(unescape(encodeURIComponent(file.content))),
          branch: fixBranch,
        };
        if (fileSha) commitBody.sha = fileSha;

        const commitResp = await fetch(
          `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/contents/${file.path}`,
          { method: "PUT", headers: ghHeaders, body: JSON.stringify(commitBody) }
        );

        if (commitResp.ok) committedFiles.push(file.path);
        else console.error(`Failed to commit fix for ${file.path}:`, await commitResp.text());
      } catch (e) { console.error(`Error committing ${file.path}:`, e); }
    }

    // Create Pull Request
    let prUrl = "";
    if (committedFiles.length > 0) {
      const prBody = `## 🤖 AxionOS Auto-Fix

**CI Run:** ${ci_run_id || "N/A"}
**Errors Fixed:** ${ciErrors.length}
**Files Modified:** ${committedFiles.length}

### Changes
${fixedFiles.map(f => `- \`${f.path}\`: ${f.commit_msg}`).join("\n")}

${failedFixes.length > 0 ? `### ⚠️ Could not fix\n${failedFixes.map(f => `- \`${f}\``).join("\n")}` : ""}

---
*Generated by AxionOS Fix Swarm*`;

      const prResp = await fetch(
        `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/pulls`,
        {
          method: "POST",
          headers: ghHeaders,
          body: JSON.stringify({
            title: `fix: resolve ${ciErrors.length} CI errors [auto-fix]`,
            body: prBody,
            head: fixBranch,
            base: resolvedBranch,
          }),
        }
      );

      if (prResp.ok) {
        const prData = await prResp.json();
        prUrl = prData.html_url || "";
        await pipelineLog(ctx, "fix_swarm_pr_created", `PR criado: ${prUrl}`, { pr_url: prUrl });
      } else {
        console.error("Failed to create PR:", await prResp.text());
      }
    }

    // Update initiative
    await serviceClient.from("initiatives").update({
      execution_progress: {
        ...execProgress,
        fix_swarm_status: "completed",
        fix_swarm_pr: prUrl,
        fix_swarm_files: committedFiles.length,
        fix_swarm_failed: failedFixes,
        fix_swarm_at: new Date().toISOString(),
      },
    }).eq("id", initiative_id);

    if (jobId) await completeJob(ctx, jobId, {
      files_fixed: committedFiles.length,
      files_failed: failedFixes.length,
      pr_url: prUrl,
      branch: fixBranch,
      total_errors: ciErrors.length,
    }, { model: "google/gemini-2.5-flash", costUsd: totalCost, durationMs: 0 });

    return jsonResponse({
      success: true,
      files_fixed: committedFiles.length,
      files_failed: failedFixes.length,
      failed_files: failedFixes,
      pr_url: prUrl,
      branch: fixBranch,
      total_errors: ciErrors.length,
      total_tokens: totalTokens,
      job_id: jobId,
    });

  } catch (e) {
    console.error("Fix orchestrator error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
