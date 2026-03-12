import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse, notFoundOrForbiddenResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { getNodeByPath, getNodeDependencies, getNodeDependents, generateBrainContext, recordError, upsertPreventionRule } from "../_shared/brain-helpers.ts";
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
    const { initiative_id, organization_id: payloadOrgId, ci_run_id, github_token, owner, repo, base_branch } = body;

    if (!initiative_id) {
      return errorResponse("initiative_id is required", 400);
    }

    // Sprint 198: Derive org from initiative record, not payload
    const { data: initiativeRecord } = await serviceClient
      .from("initiatives")
      .select("id, organization_id")
      .eq("id", initiative_id)
      .maybeSingle();
    if (!initiativeRecord) {
      return errorResponse("Initiative not found", 404);
    }

    const organization_id = initiativeRecord.organization_id;
    // If payload provided org, validate it matches
    if (payloadOrgId && payloadOrgId !== organization_id) {
      return errorResponse("Organization mismatch", 403);
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

    // ── 7. Self-Healing: Learn from fixes → generate prevention rules ──
    await pipelineLog(ctx, "self_healing_learning", "Generating prevention rules from fixes...");

    const learnResult = await callAI(apiKey,
      `You are a Self-Healing Learning Agent. Analyze CI errors that were successfully fixed.
For each error, create a prevention rule that future code generation agents MUST follow to avoid this error.

Rules should be:
- Actionable and specific (not vague)
- Describe the error pattern AND the prevention strategy
- Scoped appropriately (file-level, component-level, or project-level)

Return ONLY JSON:
{
  "rules": [
    {
      "error_pattern": "short pattern description",
      "prevention_rule": "specific rule to follow",
      "scope": "initiative|organization",
      "confidence": 0.5
    }
  ]
}`,
      `## Fixed errors:\n${fixedFiles.map(f => {
        const task = sortedTasks.find(t => t.file_path === f.path);
        return `### ${f.path}\nErrors: ${task?.errors.map(e => e.message).join("; ") || "unknown"}\nFix: ${f.commit_msg}`;
      }).join("\n\n")}`,
      true
    );
    totalTokens += learnResult.tokens;
    totalCost += learnResult.costUsd;

    let learnedRules = 0;
    try {
      const parsed = JSON.parse(learnResult.content);
      for (const rule of (parsed.rules || [])) {
        await upsertPreventionRule(ctx, rule.error_pattern, rule.prevention_rule, rule.scope || "initiative");
        learnedRules++;
      }
      await pipelineLog(ctx, "self_healing_rules_created",
        `Self-Healing: ${learnedRules} prevention rules learned from ${fixedFiles.length} fixes`);
    } catch (e) {
      console.error("Learning failed:", e);
    }

    // ── 8. Create PR with fixes (Atomic via Tree API) ──
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
    await fetch(
      `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/git/refs`,
      {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({ ref: `refs/heads/${fixBranch}`, sha: baseSha }),
      }
    );

    // Get base commit tree
    const baseCommitResp = await fetch(
      `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/git/commits/${baseSha}`,
      { headers: ghHeaders }
    );
    if (!baseCommitResp.ok) throw new Error("Failed to get base commit");
    const baseCommit = await baseCommitResp.json();
    const baseTreeSha = baseCommit.tree.sha;

    // Create blobs for all fixed files (parallel)
    const treeItems: Array<{ path: string; mode: string; type: string; sha: string }> = [];
    const committedFiles: string[] = [];

    const blobResults = await Promise.allSettled(
      fixedFiles.map(async (file) => {
        const blobResp = await fetch(
          `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/git/blobs`,
          {
            method: "POST",
            headers: ghHeaders,
            body: JSON.stringify({ content: file.content, encoding: "utf-8" }),
          }
        );
        if (!blobResp.ok) throw new Error(`Blob failed for ${file.path}`);
        const blobData = await blobResp.json();
        return { path: file.path, sha: blobData.sha };
      })
    );

    for (let i = 0; i < blobResults.length; i++) {
      const result = blobResults[i];
      if (result.status === "fulfilled") {
        treeItems.push({ path: result.value.path, mode: "100644", type: "blob", sha: result.value.sha });
        committedFiles.push(fixedFiles[i].path);
      } else {
        console.error(`Blob failed:`, result.reason);
      }
    }

    let prUrl = "";
    if (treeItems.length > 0) {
      // Create tree
      const treeResp = await fetch(
        `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/git/trees`,
        {
          method: "POST",
          headers: ghHeaders,
          body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
        }
      );
      if (!treeResp.ok) throw new Error("Tree creation failed");
      const newTree = await treeResp.json();

      // Atomic commit
      const commitMsg = `fix: resolve ${ciErrors.length} CI errors\n\n${
        fixedFiles.map(f => `- ${f.commit_msg}`).join("\n")}\n\nGenerated by AxionOS Fix Swarm`;

      const commitResp = await fetch(
        `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/git/commits`,
        {
          method: "POST",
          headers: ghHeaders,
          body: JSON.stringify({ message: commitMsg, tree: newTree.sha, parents: [baseSha] }),
        }
      );
      if (!commitResp.ok) throw new Error("Commit creation failed");
      const newCommit = await commitResp.json();

      // Update fix branch ref
      await fetch(
        `${GITHUB_API}/repos/${resolvedOwner}/${resolvedRepo}/git/refs/heads/${fixBranch}`,
        {
          method: "PATCH",
          headers: ghHeaders,
          body: JSON.stringify({ sha: newCommit.sha, force: true }),
        }
      );

      // Create Pull Request
      const prBody = `## 🤖 AxionOS Auto-Fix\n\n**CI Run:** ${ci_run_id || "N/A"}\n**Errors Fixed:** ${ciErrors.length}\n**Files Modified:** ${committedFiles.length}\n**Commit:** ${newCommit.sha.slice(0, 7)} (atomic)\n\n### Changes\n${fixedFiles.map(f => `- \`${f.path}\`: ${f.commit_msg}`).join("\n")}\n\n${failedFixes.length > 0 ? `### ⚠️ Could not fix\n${failedFixes.map(f => `- \`${f}\``).join("\n")}` : ""}\n\n---\n*Generated by AxionOS Fix Swarm*`;

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
        await pipelineLog(ctx, "fix_swarm_pr_created", `PR criado (atomic): ${prUrl}`, { pr_url: prUrl });
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
    }, { model: "routed", costUsd: totalCost, durationMs: 0 });

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
