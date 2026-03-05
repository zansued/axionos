import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-fast-modify");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient, body, apiKey } = result;

  const { modification } = body;
  if (!modification?.file_path || !modification?.prompt) {
    return errorResponse("modification.file_path and modification.prompt are required", 400);
  }

  let jobId: string | null = null;
  try {
    jobId = await createJob(ctx, "fast_modify", { file_path: modification.file_path, prompt: modification.prompt });

    const modifyResult = await callAI(apiKey,
      `You are an expert developer. You will receive a source code file and a modification request.
Return ONLY the complete modified file content. Do not add explanations, markdown fences, or comments about changes.`,
      `File: ${modification.file_path}\n\nCurrent content:\n\`\`\`\n${modification.file_content}\n\`\`\`\n\nModification requested: ${modification.prompt}`,
    );

    const modifiedContent = modifyResult.content.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();

    // Update subtask
    const { data: subtasks } = await serviceClient.from("story_subtasks")
      .select("id, file_path, phase_id")
      .eq("file_path", modification.file_path).eq("status", "completed");

    let targetSubtask: any = null;
    if (subtasks?.length) {
      for (const st of subtasks) {
        const { data: phase } = await serviceClient.from("story_phases").select("story_id").eq("id", st.phase_id).single();
        if (phase) {
          const { data: story } = await serviceClient.from("stories").select("initiative_id").eq("id", phase.story_id).single();
          if (story?.initiative_id === ctx.initiativeId) { targetSubtask = st; break; }
        }
      }
    }

    if (targetSubtask) {
      await serviceClient.from("story_subtasks").update({
        output: modifiedContent, executed_at: new Date().toISOString(),
      }).eq("id", targetSubtask.id);
    }

    // Auto-republish to GitHub
    let prUrl: string | null = null;
    let filesCommitted = 0;

    const { data: gitConns } = await serviceClient.from("git_connections")
      .select("*").eq("organization_id", ctx.organizationId).eq("status", "active").limit(1);
    const gitConn = gitConns?.[0];

    if (gitConn?.github_token) {
      const ghHeaders = { Authorization: `Bearer ${gitConn.github_token}`, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" };
      const GITHUB_API = "https://api.github.com";
      const branchName = `fix/${initiative.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-patch`;
      const baseBranch = gitConn.default_branch || "main";

      const refResp = await fetch(`${GITHUB_API}/repos/${gitConn.repo_owner}/${gitConn.repo_name}/git/ref/heads/${baseBranch}`, { headers: ghHeaders });
      if (refResp.ok) {
        const refData = await refResp.json();
        await fetch(`${GITHUB_API}/repos/${gitConn.repo_owner}/${gitConn.repo_name}/git/refs`, {
          method: "POST", headers: ghHeaders, body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: refData.object.sha }),
        });

        let fileSha: string | undefined;
        const existingFile = await fetch(`${GITHUB_API}/repos/${gitConn.repo_owner}/${gitConn.repo_name}/contents/${modification.file_path}?ref=${branchName}`, { headers: ghHeaders });
        if (existingFile.ok) { fileSha = (await existingFile.json()).sha; }

        const commitBody: any = {
          message: `fix: ${modification.prompt.slice(0, 72)}`,
          content: btoa(unescape(encodeURIComponent(modifiedContent))),
          branch: branchName,
        };
        if (fileSha) commitBody.sha = fileSha;

        const commitResp = await fetch(`${GITHUB_API}/repos/${gitConn.repo_owner}/${gitConn.repo_name}/contents/${modification.file_path}`, {
          method: "PUT", headers: ghHeaders, body: JSON.stringify(commitBody),
        });

        if (commitResp.ok) {
          filesCommitted = 1;
          const prsResp = await fetch(`${GITHUB_API}/repos/${gitConn.repo_owner}/${gitConn.repo_name}/pulls?head=${gitConn.repo_owner}:${branchName}&state=open`, { headers: ghHeaders });
          const existingPrs = prsResp.ok ? await prsResp.json() : [];
          if (existingPrs.length > 0) {
            prUrl = existingPrs[0].html_url;
          } else {
            const prResp = await fetch(`${GITHUB_API}/repos/${gitConn.repo_owner}/${gitConn.repo_name}/pulls`, {
              method: "POST", headers: ghHeaders,
              body: JSON.stringify({ title: `fix: ${modification.prompt.slice(0, 72)}`, head: branchName, base: baseBranch, body: `## Modificação via SynkrAIOS\n\n**Arquivo:** \`${modification.file_path}\`\n\n**Prompt:** ${modification.prompt}` }),
            });
            if (prResp.ok) prUrl = (await prResp.json()).html_url;
          }
        }
      }
    }

    if (jobId) await completeJob(ctx, jobId, {
      file_path: modification.file_path, files_modified: 1, files_committed: filesCommitted, pr_url: prUrl, tokens: modifyResult.tokens,
    }, modifyResult);

    await pipelineLog(ctx, "fast_modify", `Fast modify: ${modification.file_path}`, { pr_url: prUrl });

    return jsonResponse({ success: true, files_modified: 1, files_committed: filesCommitted, pr_url: prUrl });
  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
