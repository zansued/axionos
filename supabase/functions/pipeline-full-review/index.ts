import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { DETERMINISTIC_FILES } from "../_shared/code-sanitizers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-full-review");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient, body, apiKey } = result;

  const { modification } = body;
  const reviewPrompt = modification?.prompt;
  if (!reviewPrompt) return errorResponse("modification.prompt is required for full_review", 400);

  let jobId: string | null = null;
  try {
    jobId = await createJob(ctx, "full_review", { prompt: reviewPrompt });

    const { data: stories } = await serviceClient.from("stories").select("id").eq("initiative_id", ctx.initiativeId);
    if (!stories?.length) throw new Error("Nenhuma story encontrada");

    const storyIds = stories.map(s => s.id);
    const { data: phases } = await serviceClient.from("story_phases").select("id").in("story_id", storyIds);
    if (!phases?.length) throw new Error("Nenhuma phase encontrada");

    const phaseIds = phases.map(p => p.id);
    const { data: subtasks } = await serviceClient.from("story_subtasks")
      .select("id, description, file_path, output, status, phase_id")
      .in("phase_id", phaseIds).eq("status", "completed").not("output", "is", null);
    if (!subtasks?.length) throw new Error("Nenhum arquivo gerado encontrado");

    const projectContext = subtasks
      .filter(st => st.file_path && st.output)
      .map(st => `=== FILE: ${st.file_path} ===\n${st.output}`)
      .join("\n\n");
    const totalFiles = subtasks.filter(st => st.file_path && st.output).length;

    const reviewResult = await callAI(apiKey,
      `You are an expert full-stack developer performing a code review of an entire project.
Analyze ALL project files provided. Identify which files need modification or creation to fix the problem.

Return ONLY valid JSON:
{
  "diagnosis": "Brief explanation",
  "fixes": [{"file_path": "path", "reason": "why", "content": "COMPLETE file content", "is_new": false}]
}`,
      `PROBLEM REPORTED:\n${reviewPrompt}\n\nPROJECT FILES (${totalFiles} files):\n\n${projectContext}`,
      true,
    );

    let reviewData: any;
    const parseJsonSafe = (raw: string) => {
      let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const jsonStart = cleaned.search(/[\{\[]/);
      const jsonEnd = cleaned.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found");
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
      try { return JSON.parse(cleaned); } catch {
        cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, " ");
        return JSON.parse(cleaned);
      }
    };
    try { reviewData = parseJsonSafe(reviewResult.content); }
    catch { throw new Error("AI não retornou JSON válido na análise"); }

    const fixes = Array.isArray(reviewData.fixes) ? reviewData.fixes : [];
    const DEPLOY_VERCEL_JSON = DETERMINISTIC_FILES["vercel.json"];

    // Enforce deterministic vercel.json
    for (const fix of fixes) {
      if (fix?.file_path === "vercel.json") fix.content = DEPLOY_VERCEL_JSON;
    }

    // Auto-add vercel.json hotfix
    if (/vite:\s*command not found|command\s+"vite build"\s+exited\s+with\s+127/i.test(reviewPrompt) && !fixes.some((f: any) => f?.file_path === "vercel.json")) {
      fixes.push({ file_path: "vercel.json", reason: "Corrigir deploy: instalar devDependencies", content: DEPLOY_VERCEL_JSON, is_new: true });
    }

    const diagnosis = reviewData.diagnosis || "Análise concluída";
    let filesModified = 0, filesCommitted = 0;
    let prUrl: string | null = null;

    // Apply fixes
    for (const fix of fixes) {
      if (!fix.file_path || !fix.content) continue;
      const matchingSubtask = subtasks.find(st => st.file_path === fix.file_path);
      if (matchingSubtask) {
        await serviceClient.from("story_subtasks").update({ output: fix.content, executed_at: new Date().toISOString() }).eq("id", matchingSubtask.id);
        filesModified++;
      } else if (fix.is_new) {
        const firstPhaseId = phaseIds[0];
        await serviceClient.from("story_subtasks").insert({
          phase_id: firstPhaseId, description: `[Auto-fix] ${fix.reason || fix.file_path}`,
          file_path: fix.file_path, file_type: fix.file_path.endsWith(".json") ? "config" : "other",
          output: fix.content, status: "completed", executed_at: new Date().toISOString(),
        });
        filesModified++;
      }
    }

    // Auto-republish to GitHub
    const { data: gitConns } = await serviceClient.from("git_connections")
      .select("*").eq("organization_id", ctx.organizationId).eq("status", "active").limit(1);
    const gitConn = gitConns?.[0];

    if (gitConn?.github_token && fixes.length > 0) {
      const ghHeaders = { Authorization: `Bearer ${gitConn.github_token}`, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" };
      const GITHUB_API = "https://api.github.com";
      const branchName = `fix/${initiative.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-review`;
      const baseBranch = gitConn.default_branch || "main";

      const refResp = await fetch(`${GITHUB_API}/repos/${gitConn.repo_owner}/${gitConn.repo_name}/git/ref/heads/${baseBranch}`, { headers: ghHeaders });
      if (refResp.ok) {
        const refData = await refResp.json();
        await fetch(`${GITHUB_API}/repos/${gitConn.repo_owner}/${gitConn.repo_name}/git/refs`, {
          method: "POST", headers: ghHeaders, body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: refData.object.sha }),
        });

        for (const fix of fixes) {
          if (!fix.file_path || !fix.content) continue;
          let fileSha: string | undefined;
          const existingFile = await fetch(`${GITHUB_API}/repos/${gitConn.repo_owner}/${gitConn.repo_name}/contents/${fix.file_path}?ref=${branchName}`, { headers: ghHeaders });
          if (existingFile.ok) fileSha = (await existingFile.json()).sha;

          const commitBody: any = {
            message: `fix(review): ${fix.reason?.slice(0, 72) || fix.file_path}`,
            content: btoa(unescape(encodeURIComponent(fix.content))),
            branch: branchName,
          };
          if (fileSha) commitBody.sha = fileSha;
          const commitResp = await fetch(`${GITHUB_API}/repos/${gitConn.repo_owner}/${gitConn.repo_name}/contents/${fix.file_path}`, {
            method: "PUT", headers: ghHeaders, body: JSON.stringify(commitBody),
          });
          if (commitResp.ok) filesCommitted++;
        }

        const prsResp = await fetch(`${GITHUB_API}/repos/${gitConn.repo_owner}/${gitConn.repo_name}/pulls?head=${gitConn.repo_owner}:${branchName}&state=open`, { headers: ghHeaders });
        const existingPrs = prsResp.ok ? await prsResp.json() : [];
        if (existingPrs.length > 0) {
          prUrl = existingPrs[0].html_url;
        } else {
          const prResp = await fetch(`${GITHUB_API}/repos/${gitConn.repo_owner}/${gitConn.repo_name}/pulls`, {
            method: "POST", headers: ghHeaders,
            body: JSON.stringify({ title: `fix(review): ${reviewPrompt.slice(0, 72)}`, head: branchName, base: baseBranch, body: `## Revisão Completa\n\n**Problema:** ${reviewPrompt}\n\n**Diagnóstico:** ${diagnosis}\n\n**Arquivos corrigidos:** ${filesModified}` }),
          });
          if (prResp.ok) prUrl = (await prResp.json()).html_url;
        }
      }
    }

    if (jobId) await completeJob(ctx, jobId, {
      diagnosis, files_analyzed: totalFiles, files_modified: filesModified, files_committed: filesCommitted, pr_url: prUrl,
      fixes: fixes.map((f: any) => ({ file_path: f.file_path, reason: f.reason, is_new: f.is_new })),
      tokens: reviewResult.tokens,
    }, reviewResult);

    await pipelineLog(ctx, "full_review", `Full review: ${filesModified} files fixed`, { pr_url: prUrl, diagnosis });

    return jsonResponse({
      success: true, diagnosis, files_analyzed: totalFiles, files_modified: filesModified,
      files_committed: filesCommitted, pr_url: prUrl,
      fixes: fixes.map((f: any) => ({ file_path: f.file_path, reason: f.reason, is_new: f.is_new })),
    });
  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
