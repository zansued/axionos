import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { sanitizePackageJson, DETERMINISTIC_FILES } from "../_shared/code-sanitizers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-publish");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient, body, apiKey } = result;

  let { github_token, owner, repo, base_branch } = body;
  let resolvedGithubToken = github_token;
  let resolvedOwner = owner;
  let resolvedRepo = repo;
  let resolvedBaseBranch = base_branch || "main";

  // Fallback to active Git connection
  if (!resolvedGithubToken || !resolvedOwner) {
    const { data: gitConns } = await serviceClient.from("git_connections")
      .select("github_token, repo_owner, repo_name, default_branch")
      .eq("organization_id", ctx.organizationId).eq("status", "active")
      .order("updated_at", { ascending: false }).limit(1);
    const fallbackConn = gitConns?.[0];
    if (fallbackConn) {
      resolvedGithubToken = resolvedGithubToken || fallbackConn.github_token;
      resolvedOwner = resolvedOwner || fallbackConn.repo_owner;
      resolvedRepo = resolvedRepo || fallbackConn.repo_name;
      resolvedBaseBranch = base_branch || fallbackConn.default_branch || "main";
    }
  }

  if (!resolvedGithubToken || !resolvedOwner) {
    return errorResponse("github_token e owner são obrigatórios. Configure uma conexão Git ativa.", 400);
  }

  const repoSlug = (resolvedRepo || initiative.title)
    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || `axion-${ctx.initiativeId.slice(0, 8)}`;

  const jobId = await createJob(ctx, "publish", { owner: resolvedOwner, repo: repoSlug, base_branch: resolvedBaseBranch });
  await pipelineLog(ctx, "pipeline_publish_start", "Criando novo repositório e publicando artefatos...");

  const ghHeaders = {
    Authorization: `Bearer ${resolvedGithubToken}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
  const GITHUB_API = "https://api.github.com";

  try {
    // 1. Create repository
    let actualOwner = resolvedOwner;
    let actualRepo = repoSlug;
    let repoHtmlUrl: string;

    let createUrl = `${GITHUB_API}/user/repos`;
    const createBody: any = { name: repoSlug, description: `${initiative.title} — Gerado pelo SynkrAIOS`, private: false, auto_init: true };
    const orgCheck = await fetch(`${GITHUB_API}/orgs/${resolvedOwner}`, { headers: ghHeaders });
    if (orgCheck.ok) createUrl = `${GITHUB_API}/orgs/${resolvedOwner}/repos`;

    const createRepoResp = await fetch(createUrl, { method: "POST", headers: ghHeaders, body: JSON.stringify(createBody) });
    if (createRepoResp.ok) {
      const repoData = await createRepoResp.json();
      actualOwner = repoData.owner?.login || resolvedOwner;
      actualRepo = repoData.name || repoSlug;
      repoHtmlUrl = repoData.html_url;
    } else {
      const errData = await createRepoResp.json();
      if (errData.errors?.[0]?.message?.includes("name already exists")) {
        repoHtmlUrl = `https://github.com/${resolvedOwner}/${repoSlug}`;
      } else throw new Error(`Falha ao criar repositório: ${errData.message}`);
    }

    await new Promise(r => setTimeout(r, 2000));

    // 2. Get base branch SHA
    const refResp = await fetch(`${GITHUB_API}/repos/${actualOwner}/${actualRepo}/git/ref/heads/${resolvedBaseBranch}`, { headers: ghHeaders });
    if (!refResp.ok) throw new Error(`Branch base '${resolvedBaseBranch}' não encontrada.`);
    const refData = await refResp.json();
    const baseSha = refData.object.sha;

    // 3. Collect artifacts
    const { data: stories } = await serviceClient.from("stories").select("id, title").eq("initiative_id", ctx.initiativeId);
    const storyIds = (stories || []).map((s: any) => s.id);
    const { data: phases } = await serviceClient.from("story_phases").select("id").in("story_id", storyIds);
    const phaseIds = (phases || []).map((p: any) => p.id);
    const { data: subtasks } = await serviceClient.from("story_subtasks").select("id, description, file_path, file_type").in("phase_id", phaseIds);

    const subtaskFileMap = new Map<string, { file_path: string | null; file_type: string | null; description: string }>();
    for (const st of (subtasks || [])) subtaskFileMap.set(st.id, { file_path: st.file_path, file_type: st.file_type, description: st.description });
    const subtaskIds = (subtasks || []).map((st: any) => st.id);

    const { data: artifacts } = await serviceClient.from("agent_outputs")
      .select("id, type, summary, raw_output, subtask_id, agents(name, role)")
      .in("subtask_id", subtaskIds).eq("organization_id", ctx.organizationId);
    if (!artifacts || artifacts.length === 0) throw new Error("Nenhum artefato encontrado para publicar");

    // AI: Generate commit messages
    const fileList = artifacts.map((art: any, i: number) => {
      const si = art.subtask_id ? subtaskFileMap.get(art.subtask_id) : null;
      const fp = (art.raw_output as any)?.file_path || si?.file_path || `artifact-${i}`;
      return `${i}. ${fp} (${si?.file_type || art.type}) — ${si?.description || art.summary || fp}`;
    });

    const commitMsgResult = await callAI(apiKey,
      `Você gera commit messages seguindo Conventional Commits. Max 72 chars, imperativo, inglês, sem ponto final.\nRetorne APENAS um JSON array de strings.`,
      `Arquivos para commit:\n${fileList.join("\n")}\n\nRetorne JSON: ["feat: add header component", ...]`,
      true
    );

    let commitMessages: string[] = [];
    try {
      const parsed = JSON.parse(commitMsgResult.content);
      commitMessages = Array.isArray(parsed) ? parsed : (parsed.messages || parsed.commits || []);
    } catch { commitMessages = []; }

    // Build Health Report + sanitization (inline)
    for (const art of artifacts) {
      const raw = art.raw_output as any;
      const fp = raw?.file_path || subtaskFileMap.get(art.subtask_id)?.file_path;
      if (!fp) continue;
      let content = raw?.content || raw?.text || "";
      if (!content) continue;

      // Apply deterministic overrides
      if (DETERMINISTIC_FILES[fp]) {
        if (raw?.content !== undefined) raw.content = DETERMINISTIC_FILES[fp];
        else if (raw?.text !== undefined) raw.text = DETERMINISTIC_FILES[fp];
      }
      // Sanitize package.json
      if (fp === "package.json") {
        const sanitized = sanitizePackageJson(raw?.content || raw?.text || "");
        if (raw?.content !== undefined) raw.content = sanitized;
        else if (raw?.text !== undefined) raw.text = sanitized;
      }
    }

    // 4. Commit files to main
    const committedFiles: string[] = [];
    const skippedFiles: string[] = [];

    for (let i = 0; i < artifacts.length; i++) {
      const art = artifacts[i] as any;
      const raw = art.raw_output as any;
      const si = art.subtask_id ? subtaskFileMap.get(art.subtask_id) : null;
      const filePath = raw?.file_path || si?.file_path;
      if (!filePath) { skippedFiles.push(`artifact-${i} (no path)`); continue; }

      const fileContent = raw?.content || raw?.text || (typeof raw === "string" ? raw : JSON.stringify(raw));
      if (!fileContent || fileContent === "{}") { skippedFiles.push(filePath); continue; }

      const commitMsg = commitMessages[i] || `feat: add ${filePath}`;

      try {
        let fileSha: string | undefined;
        const existingFile = await fetch(`${GITHUB_API}/repos/${actualOwner}/${actualRepo}/contents/${filePath}?ref=${resolvedBaseBranch}`, { headers: ghHeaders });
        if (existingFile.ok) {
          const fileData = await existingFile.json();
          fileSha = fileData.sha;
        }

        const commitBody: any = {
          message: commitMsg,
          content: btoa(unescape(encodeURIComponent(fileContent))),
          branch: resolvedBaseBranch,
        };
        if (fileSha) commitBody.sha = fileSha;

        const commitResp = await fetch(`${GITHUB_API}/repos/${actualOwner}/${actualRepo}/contents/${filePath}`, {
          method: "PUT", headers: ghHeaders, body: JSON.stringify(commitBody),
        });

        if (commitResp.ok) committedFiles.push(filePath);
        else { const errText = await commitResp.text(); console.error(`Failed to commit ${filePath}:`, errText); skippedFiles.push(filePath); }
      } catch (e) { console.error(`Error committing ${filePath}:`, e); skippedFiles.push(filePath); }
    }

    // Ensure required files exist
    const requiredFiles: Record<string, string> = {
      "vercel.json": DETERMINISTIC_FILES["vercel.json"],
      "public/_redirects": DETERMINISTIC_FILES["public/_redirects"],
    };

    for (const [requiredPath, requiredContent] of Object.entries(requiredFiles)) {
      if (committedFiles.includes(requiredPath)) continue;
      try {
        let fileSha: string | undefined;
        const existingFile = await fetch(`${GITHUB_API}/repos/${actualOwner}/${actualRepo}/contents/${requiredPath}?ref=${resolvedBaseBranch}`, { headers: ghHeaders });
        if (existingFile.ok) { const fd = await existingFile.json(); fileSha = fd.sha; }
        const commitBody: any = {
          message: `chore: ensure ${requiredPath}`,
          content: btoa(unescape(encodeURIComponent(requiredContent))),
          branch: resolvedBaseBranch,
        };
        if (fileSha) commitBody.sha = fileSha;
        const ensureResp = await fetch(`${GITHUB_API}/repos/${actualOwner}/${actualRepo}/contents/${requiredPath}`, {
          method: "PUT", headers: ghHeaders, body: JSON.stringify(commitBody),
        });
        if (ensureResp.ok && !committedFiles.includes(requiredPath)) committedFiles.push(requiredPath);
      } catch (e) { console.error(`Error ensuring ${requiredPath}:`, e); }
    }

    if (committedFiles.length === 0) throw new Error("Nenhum arquivo foi commitado com sucesso");
    await updateInitiative(ctx, { stage_status: "published" });

    if (jobId) await completeJob(ctx, jobId, {
      branch: resolvedBaseBranch, files_committed: committedFiles.length,
      owner: actualOwner, repo: actualRepo,
      repo_url: `https://github.com/${actualOwner}/${actualRepo}`,
    }, { model: "google/gemini-2.5-flash", costUsd: commitMsgResult.costUsd, durationMs: 0 });

    await pipelineLog(ctx, "pipeline_publish_complete", `Publicação: ${committedFiles.length} arquivos em ${actualOwner}/${actualRepo}`, { branch: resolvedBaseBranch, repo: `${actualOwner}/${actualRepo}` });

    return jsonResponse({
      success: true, branch: resolvedBaseBranch, files_committed: committedFiles.length,
      skipped_files: skippedFiles, owner: actualOwner, repo: actualRepo,
      repo_url: `https://github.com/${actualOwner}/${actualRepo}`, job_id: jobId,
    });
  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
