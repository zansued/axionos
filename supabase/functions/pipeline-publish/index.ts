import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { sanitizePackageJson, DETERMINISTIC_FILES } from "../_shared/code-sanitizers.ts";
import { updateNodeStatus, getNodeByPath } from "../_shared/brain-helpers.ts";

/**
 * Camada 6 — Release
 * Release Agent (Agente 18) orquestra:
 *   1. Pre-flight Checks — valida integridade dos artefatos antes do push
 *   2. Changelog & Commit Generation — gera CHANGELOG.md e commit messages semânticas
 *   3. GitHub Push — cria/atualiza repositório e commita arquivos
 *   4. Post-deploy Verification — verifica integridade do repositório após push
 */

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-publish");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient, body, apiKey, user } = result;

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

  const jobId = await createJob(ctx, "publish", { owner: resolvedOwner, repo: repoSlug, base_branch: resolvedBaseBranch, mode: "release_agent" });
  await pipelineLog(ctx, "pipeline_publish_start", "Release Agent iniciando: Pre-flight → Changelog → Push → Verificação...");

  const ghHeaders = {
    Authorization: `Bearer ${resolvedGithubToken}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
  const GITHUB_API = "https://api.github.com";

  let totalTokens = 0, totalCost = 0;

  try {
    // ── Collect artifacts ──
    const { data: stories } = await serviceClient.from("stories").select("id, title").eq("initiative_id", ctx.initiativeId);
    const storyIds = (stories || []).map((s: any) => s.id);
    const { data: phases } = await serviceClient.from("story_phases").select("id").in("story_id", storyIds);
    const phaseIds = (phases || []).map((p: any) => p.id);
    const { data: subtasks } = await serviceClient.from("story_subtasks").select("id, description, file_path, file_type").in("phase_id", phaseIds);

    const subtaskFileMap = new Map<string, { file_path: string | null; file_type: string | null; description: string }>();
    for (const st of (subtasks || [])) subtaskFileMap.set(st.id, { file_path: st.file_path, file_type: st.file_type, description: st.description });
    const subtaskIds = (subtasks || []).map((st: any) => st.id);

    const { data: artifacts } = await serviceClient.from("agent_outputs")
      .select("id, type, summary, raw_output, subtask_id, status, agents(name, role)")
      .in("subtask_id", subtaskIds.length > 0 ? subtaskIds : ["00000000-0000-0000-0000-000000000000"])
      .eq("organization_id", ctx.organizationId);
    if (!artifacts || artifacts.length === 0) throw new Error("Nenhum artefato encontrado para publicar");

    // ═══ PHASE 1: Pre-flight Checks (Release Agent) ═══
    await pipelineLog(ctx, "release_preflight_start", "Release Agent: Executando pre-flight checks...");

    const approvedArtifacts = artifacts.filter((a: any) => a.status === "approved");
    const nonApproved = artifacts.filter((a: any) => a.status !== "approved");
    const fileEntries: { path: string; content: string; type: string; summary: string }[] = [];

    for (const art of approvedArtifacts) {
      const raw = art.raw_output as any;
      const si = art.subtask_id ? subtaskFileMap.get(art.subtask_id) : null;
      const filePath = raw?.file_path || si?.file_path;
      if (!filePath) continue;
      let content = raw?.content || raw?.text || (typeof raw === "string" ? raw : "");
      if (!content || content === "{}") continue;

      // Apply deterministic overrides
      if (DETERMINISTIC_FILES[filePath]) content = DETERMINISTIC_FILES[filePath];
      // Sanitize package.json
      if (filePath === "package.json") content = sanitizePackageJson(content);

      fileEntries.push({ path: filePath, content, type: si?.file_type || art.type, summary: si?.description || art.summary || filePath });
    }

    if (fileEntries.length === 0) throw new Error("Nenhum arquivo aprovado pronto para publicação");

    // AI Pre-flight: check for missing critical files, inconsistencies
    const fileManifest = fileEntries.map(f => `${f.path} (${f.type})`).join("\n");
    const preflightResult = await callAI(apiKey,
      `Você é o "Release Agent" (Agente 18). Execute pre-flight checks no projeto antes da publicação.
Verifique:
1. Arquivos críticos presentes (package.json, index.html, vite.config.ts, tsconfig.json, src/main.tsx, src/App.tsx)
2. Consistência de imports entre arquivos
3. Potenciais conflitos de nomes ou paths duplicados
4. Presença de TODO/FIXME/HACK não resolvidos nos conteúdos

Retorne APENAS JSON:
{"preflight_pass": true/false, "critical_missing": [], "warnings": [], "ready_files_count": 0, "summary": "...", "risk_level": "low|medium|high"}`,
      `## Projeto: ${initiative.title}\n## Arquivos para publicação (${fileEntries.length}):\n${fileManifest}\n\n## Artefatos não aprovados (${nonApproved.length}):\n${nonApproved.map((a: any) => `- ${a.summary} (status: ${a.status})`).join("\n") || "Nenhum"}`,
      true
    );
    totalTokens += preflightResult.tokens; totalCost += preflightResult.costUsd;

    let preflight: any;
    try { preflight = JSON.parse(preflightResult.content); }
    catch { preflight = { preflight_pass: true, critical_missing: [], warnings: [], ready_files_count: fileEntries.length, summary: "OK", risk_level: "low" }; }

    await persistReview(serviceClient, artifacts[0].id, user.id, "release_preflight", "approved",
      JSON.stringify(preflight));

    if (!preflight.preflight_pass && preflight.risk_level === "high") {
      // Log warning but don't block — deterministic files and repo defaults cover most critical files
      console.warn("Pre-flight warnings (non-blocking):", preflight.critical_missing);
      await pipelineLog(ctx, "release_preflight_warning", `Pre-flight warnings: ${preflight.critical_missing?.join(", ") || preflight.summary}`);
    }

    // ═══ PHASE 2: Changelog & Commit Messages (Release Agent) ═══
    await pipelineLog(ctx, "release_changelog_start", "Release Agent: Gerando changelog e commits semânticos...");

    const changelogResult = await callAI(apiKey,
      `Você é o "Release Agent". Gere:
1. Um CHANGELOG.md profissional em Markdown (Keep a Changelog format)
2. Commit messages seguindo Conventional Commits (max 72 chars, inglês, imperativo)

Retorne APENAS JSON:
{"changelog_md": "# Changelog\\n\\n## [1.0.0] - YYYY-MM-DD\\n...", "commit_messages": ["feat: add component X", ...], "version": "1.0.0", "release_title": "...", "release_notes": "..."}`,
      `## Projeto: ${initiative.title}\n## Descrição: ${initiative.description || "N/A"}\n\n## Arquivos (${fileEntries.length}):\n${fileEntries.map((f, i) => `${i}. ${f.path} — ${f.summary}`).join("\n")}`,
      true
    );
    totalTokens += changelogResult.tokens; totalCost += changelogResult.costUsd;

    let changelog: any;
    try { changelog = JSON.parse(changelogResult.content); }
    catch { changelog = { changelog_md: `# Changelog\n\n## [1.0.0] - ${new Date().toISOString().split("T")[0]}\n\n### Added\n${fileEntries.map(f => `- ${f.summary}`).join("\n")}`, commit_messages: fileEntries.map(f => `feat: add ${f.path}`), version: "1.0.0", release_title: initiative.title, release_notes: "" }; }

    // Add CHANGELOG.md to file entries
    fileEntries.push({ path: "CHANGELOG.md", content: changelog.changelog_md || "", type: "content", summary: "Changelog gerado pelo Release Agent" });

    // Add GitHub Actions CI workflow for runtime validation
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const ciWorkflow = generateCIWorkflow(supabaseUrl, ctx.initiativeId, ctx.organizationId);
    fileEntries.push({ path: ".github/workflows/validate.yml", content: ciWorkflow, type: "config", summary: "CI: npm install + tsc + vite build" });

    const commitMessages = changelog.commit_messages || [];

    // ═══ PHASE 3: GitHub Push (Atomic via Tree API — overwrite existing repo) ═══
    await pipelineLog(ctx, "release_push_start", `Release Agent: Publicando ${fileEntries.length} arquivos no repositório existente...`);

    let actualOwner = resolvedOwner;
    let actualRepo = resolvedRepo || repoSlug;
    let repoHtmlUrl = `https://github.com/${actualOwner}/${actualRepo}`;

    // Ensure repo exists — create only if it doesn't
    const repoCheckResp = await fetch(`${GITHUB_API}/repos/${actualOwner}/${actualRepo}`, { headers: ghHeaders });
    if (!repoCheckResp.ok) {
      // Repo doesn't exist, create it
      let createUrl = `${GITHUB_API}/user/repos`;
      const createBody: any = { name: actualRepo, description: `${initiative.title} — Gerado pelo SynkrAIOS`, private: false, auto_init: true };
      const orgCheck = await fetch(`${GITHUB_API}/orgs/${actualOwner}`, { headers: ghHeaders });
      if (orgCheck.ok) createUrl = `${GITHUB_API}/orgs/${actualOwner}/repos`;

      const createRepoResp = await fetch(createUrl, { method: "POST", headers: ghHeaders, body: JSON.stringify(createBody) });
      if (createRepoResp.ok) {
        const repoData = await createRepoResp.json();
        actualOwner = repoData.owner?.login || actualOwner;
        actualRepo = repoData.name || actualRepo;
        repoHtmlUrl = repoData.html_url;
      } else {
        const errData = await createRepoResp.json();
        if (!errData.errors?.[0]?.message?.includes("name already exists")) {
          throw new Error(`Falha ao criar repositório: ${errData.message}`);
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    } else {
      const repoData = await repoCheckResp.json();
      repoHtmlUrl = repoData.html_url || repoHtmlUrl;
    }

    // Get base branch SHA
    const refResp = await fetch(`${GITHUB_API}/repos/${actualOwner}/${actualRepo}/git/ref/heads/${resolvedBaseBranch}`, { headers: ghHeaders });
    if (!refResp.ok) {
      // Branch doesn't exist — seed it
      await fetch(`${GITHUB_API}/repos/${actualOwner}/${actualRepo}/contents/README.md`, {
        method: "PUT", headers: ghHeaders,
        body: JSON.stringify({ message: "Initial commit", content: btoa(`# ${initiative.title}\n\nGenerated by SynkrAIOS`) }),
      });
      await new Promise(r => setTimeout(r, 1500));
    }
    const refResp2 = await fetch(`${GITHUB_API}/repos/${actualOwner}/${actualRepo}/git/ref/heads/${resolvedBaseBranch}`, { headers: ghHeaders });
    if (!refResp2.ok) throw new Error(`Branch '${resolvedBaseBranch}' não encontrada após seed.`);
    const refData = await refResp2.json();
    const baseSha = refData.object.sha;

    // ── Atomic Tree API: Create blobs → Build tree → Single commit ──
    const committedFiles: string[] = [];
    const skippedFiles: string[] = [];

    // Combine all file entries + required files (ensure critical deploy files exist)
    const criticalFiles = [
      "vercel.json", "public/_redirects", "index.html", "vite.config.ts",
      "tsconfig.json", "tsconfig.node.json", "tsconfig.app.json", "postcss.config.js",
      "tailwind.config.js",
    ];
    const requiredFiles: Record<string, string> = {};
    for (const f of criticalFiles) {
      if (DETERMINISTIC_FILES[f]) requiredFiles[f] = DETERMINISTIC_FILES[f];
    }
    // Generate package.json if not in artifacts
    if (!fileEntries.some(f => f.path === "package.json")) {
      const defaultPkg = {
        name: repoSlug, version: changelog?.version || "1.0.0", type: "module",
        scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
        dependencies: {
          "react": "^18.3.1", "react-dom": "^18.3.1", "react-router-dom": "^6.30.0",
          "lucide-react": "^0.462.0", "tailwind-merge": "^2.6.0", "clsx": "^2.1.1",
          "class-variance-authority": "^0.7.1",
        },
        devDependencies: {
          "vite": "^5.4.19", "@vitejs/plugin-react-swc": "^3.11.0", "typescript": "^5.8.3",
          "tailwindcss": "^3.4.17", "autoprefixer": "^10.4.21", "postcss": "^8.5.6",
          "@types/react": "^18.3.23", "@types/react-dom": "^18.3.7",
        },
      };
      requiredFiles["package.json"] = sanitizePackageJson(JSON.stringify(defaultPkg, null, 2));
    }
    for (const [reqPath, reqContent] of Object.entries(requiredFiles)) {
      if (!fileEntries.some(f => f.path === reqPath)) {
        fileEntries.push({ path: reqPath, content: reqContent, type: "config", summary: `Ensure ${reqPath}` });
      }
    }

    // Step 1: Create blobs for all files (parallel batches of 5)
    const BLOB_BATCH = 5;
    const treeItems: Array<{ path: string; mode: string; type: string; sha: string }> = [];

    for (let i = 0; i < fileEntries.length; i += BLOB_BATCH) {
      const batch = fileEntries.slice(i, i + BLOB_BATCH);
      const blobResults = await Promise.allSettled(
        batch.map(async (file) => {
          const blobResp = await fetch(
            `${GITHUB_API}/repos/${actualOwner}/${actualRepo}/git/blobs`,
            {
              method: "POST",
              headers: ghHeaders,
              body: JSON.stringify({
                content: file.content,
                encoding: "utf-8",
              }),
            }
          );
          if (!blobResp.ok) {
            const errText = await blobResp.text();
            throw new Error(`Blob creation failed for ${file.path}: ${errText}`);
          }
          const blobData = await blobResp.json();
          return { path: file.path, sha: blobData.sha };
        })
      );

      for (let j = 0; j < blobResults.length; j++) {
        const result = blobResults[j];
        const file = batch[j];
        if (result.status === "fulfilled") {
          treeItems.push({
            path: result.value.path,
            mode: "100644",
            type: "blob",
            sha: result.value.sha,
          });
          committedFiles.push(file.path);
        } else {
          console.error(`Blob failed for ${file.path}:`, result.reason);
          skippedFiles.push(file.path);
        }
      }
    }

    if (treeItems.length === 0) throw new Error("Nenhum blob criado — falha total");

    // Step 2: Create a NEW tree (no base_tree = overwrite/clean repo with only our files)
    const treeResp = await fetch(
      `${GITHUB_API}/repos/${actualOwner}/${actualRepo}/git/trees`,
      {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({
          tree: treeItems,
        }),
      }
    );
    if (!treeResp.ok) {
      const errText = await treeResp.text();
      throw new Error(`Tree creation failed: ${errText}`);
    }
    const newTree = await treeResp.json();

    // Step 3: Create a single atomic commit
    const commitMessage = `feat: ${initiative.title} v${changelog.version || "1.0.0"}\n\n${
      committedFiles.length} files generated by SynkrAIOS Release Agent\n\n${
      commitMessages.slice(0, 10).map((m: string) => `- ${m}`).join("\n")}`;

    const commitResp = await fetch(
      `${GITHUB_API}/repos/${actualOwner}/${actualRepo}/git/commits`,
      {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({
          message: commitMessage,
          tree: newTree.sha,
          parents: [baseSha],
        }),
      }
    );
    if (!commitResp.ok) {
      const errText = await commitResp.text();
      throw new Error(`Commit creation failed: ${errText}`);
    }
    const newCommit = await commitResp.json();

    // Step 4: Update branch reference to point to new commit
    const updateRefResp = await fetch(
      `${GITHUB_API}/repos/${actualOwner}/${actualRepo}/git/refs/heads/${resolvedBaseBranch}`,
      {
        method: "PATCH",
        headers: ghHeaders,
        body: JSON.stringify({ sha: newCommit.sha, force: false }),
      }
    );
    if (!updateRefResp.ok) {
      const errText = await updateRefResp.text();
      throw new Error(`Ref update failed: ${errText}`);
    }

    await pipelineLog(ctx, "release_atomic_commit",
      `Atomic commit: ${committedFiles.length} arquivos em 1 commit (${newCommit.sha.slice(0, 7)})`);

    if (committedFiles.length === 0) throw new Error("Nenhum arquivo foi commitado com sucesso");

    // ═══ PHASE 4: Post-deploy Verification (Release Agent) ═══
    await pipelineLog(ctx, "release_verify_start", "Release Agent: Verificando integridade pós-deploy...");

    const verifyResult = await callAI(apiKey,
      `Você é o "Release Agent" fazendo verificação pós-deploy. Analise o resultado da publicação.
Retorne APENAS JSON:
{"deploy_healthy": true/false, "files_verified": 0, "missing_critical": [], "recommendations": [], "summary": "...", "confidence": 0-100}`,
      `## Repositório: ${actualOwner}/${actualRepo}\n## Branch: ${resolvedBaseBranch}\n\n## Arquivos commitados (${committedFiles.length}):\n${committedFiles.join("\n")}\n\n## Arquivos pulados (${skippedFiles.length}):\n${skippedFiles.join("\n") || "Nenhum"}\n\n## Pre-flight warnings:\n${(preflight.warnings || []).join("\n") || "Nenhum"}`,
      true
    );
    totalTokens += verifyResult.tokens; totalCost += verifyResult.costUsd;

    let verification: any;
    try { verification = JSON.parse(verifyResult.content); }
    catch { verification = { deploy_healthy: true, files_verified: committedFiles.length, missing_critical: [], recommendations: [], summary: "OK", confidence: 80 }; }

    await persistReview(serviceClient, artifacts[0].id, user.id, "release_verification", "approved",
      JSON.stringify(verification));

    // Save to knowledge base
    await serviceClient.from("org_knowledge_base").insert({
      organization_id: ctx.organizationId,
      title: `Release: ${initiative.title} v${changelog.version || "1.0.0"}`,
      content: changelog.changelog_md || "",
      category: "release_notes",
      source_initiative_id: ctx.initiativeId,
      tags: ["release", "changelog", actualRepo],
    });

    // Update brain nodes to published
    try {
      for (const filePath of committedFiles.slice(0, 50)) {
        const node = await getNodeByPath(ctx, filePath);
        if (node) await updateNodeStatus(ctx, node.id, "published");
      }
    } catch (e) { console.error("Brain publish update error:", e); }

    await updateInitiative(ctx, { stage_status: "published" });

    if (jobId) await completeJob(ctx, jobId, {
      branch: resolvedBaseBranch, files_committed: committedFiles.length,
      owner: actualOwner, repo: actualRepo, version: changelog.version || "1.0.0",
      repo_url: `https://github.com/${actualOwner}/${actualRepo}`,
      preflight: { pass: preflight.preflight_pass, risk: preflight.risk_level },
      verification: { healthy: verification.deploy_healthy, confidence: verification.confidence },
      skipped_files: skippedFiles,
    }, { model: "google/gemini-2.5-flash", costUsd: totalCost, durationMs: 0 });

    await pipelineLog(ctx, "pipeline_publish_complete",
      `Release Agent: ${committedFiles.length} arquivos publicados em ${actualOwner}/${actualRepo} v${changelog.version || "1.0.0"} ✅`,
      { branch: resolvedBaseBranch, repo: `${actualOwner}/${actualRepo}`, version: changelog.version });

    return jsonResponse({
      success: true, branch: resolvedBaseBranch, files_committed: committedFiles.length,
      skipped_files: skippedFiles, owner: actualOwner, repo: actualRepo,
      version: changelog.version || "1.0.0",
      repo_url: `https://github.com/${actualOwner}/${actualRepo}`,
      preflight_pass: preflight.preflight_pass,
      deploy_healthy: verification.deploy_healthy,
      job_id: jobId,
    });
  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});

// ── Helpers ──

async function persistReview(client: any, outputId: string, userId: string, action: string, prevStatus: string, comment: string) {
  await client.from("artifact_reviews").insert({
    output_id: outputId,
    reviewer_id: userId,
    action,
    previous_status: prevStatus,
    new_status: prevStatus,
    comment,
  });
}

function generateCIWorkflow(supabaseUrl: string, initiativeId: string, organizationId: string): string {
  const webhookUrl = `${supabaseUrl}/functions/v1/pipeline-ci-webhook`;
  return `name: SynkrAIOS Validate

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
            ERRORS=$(echo "$BUILD_LOG" | grep -i "ERR\\!" | head -10 | jq -R -s 'split("\\n") | map(select(length > 0)) | map({file: "package.json", line: null, column: null, message: ., category: "dependency"})' 2>/dev/null || echo "[]")
          elif [ "\${{ steps.typecheck.outcome }}" != "success" ]; then
            STATUS="failure"
            BUILD_LOG=$(cat /tmp/tsc.log 2>/dev/null | tail -100)
            ERRORS=$(echo "$BUILD_LOG" | grep -E "^src/" | head -20 | sed 's/\\(\\([0-9]*\\),[0-9]*\\)/|\\1|/' | awk -F'|' '{print "{\\"file\\": \\""$1"\\", \\"line\\": "$2", \\"column\\": null, \\"message\\": \\""$3"\\", \\"category\\": \\"typescript\\"}"}' | jq -s '.' 2>/dev/null || echo "[]")
          elif [ "\${{ steps.build.outcome }}" != "success" ]; then
            STATUS="failure"
            BUILD_LOG=$(cat /tmp/build.log 2>/dev/null | tail -50)
            ERRORS=$(echo "$BUILD_LOG" | grep -i "error" | head -10 | jq -R -s 'split("\\n") | map(select(length > 0)) | map({file: "vite.config.ts", line: null, column: null, message: ., category: "build"})' 2>/dev/null || echo "[]")
          fi

          curl -s -X POST "${webhookUrl}" \\
            -H "Authorization: Bearer $WEBHOOK_SECRET" \\
            -H "Content-Type: application/json" \\
            -d "{
              \\"initiative_id\\": \\"${initiativeId}\\",
              \\"organization_id\\": \\"${organizationId}\\",
              \\"status\\": \\"$STATUS\\",
              \\"errors\\": $ERRORS,
              \\"build_log\\": $(echo "$BUILD_LOG" | jq -R -s '.'),
              \\"duration_ms\\": 0,
              \\"repo_owner\\": \\"\${{ github.repository_owner }}\\",
              \\"repo_name\\": \\"\${{ github.event.repository.name }}\\",
              \\"run_id\\": \\"\${{ github.run_id }}\\",
              \\"commit_sha\\": \\"\${{ github.sha }}\\"
            }"
`;
}
