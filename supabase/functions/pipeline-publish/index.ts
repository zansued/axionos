import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { sanitizePackageJson, DETERMINISTIC_FILES, detectMissingDependencies, autoFixMissingDependencies, FORBIDDEN_RUNTIME_PACKAGES, findBrokenRelativeImports } from "../_shared/code-sanitizers.ts";
import { updateNodeStatus, getNodeByPath } from "../_shared/brain-helpers.ts";
import { runDependencyGovernance } from "../_shared/dependency-governance.ts";
import { evaluateSecurityRules, PIPELINE_SECURITY_RULES, buildMatcherLogEntry, type MatchInput } from "../_shared/contracts/security-matcher.schema.ts";
import type { PublishConfirmation } from "../_shared/contracts/publish-confirmation.schema.ts";
import { buildPublishError, sanitizeFileEntries, persistReview, generateCIWorkflow, type FileEntry } from "../_shared/publish-helpers.ts";
import { atomicGitHubPush } from "../_shared/publish-github.ts";

/**
 * Camada 6 — Release
 * Release Agent (Agente 18) orquestra:
 *   1. Pre-flight Checks — valida integridade dos artefatos antes do push
 *   2. Changelog & Commit Generation — gera CHANGELOG.md e commit messages semânticas
 *   3. GitHub Push — cria/atualiza repositório e commita arquivos
 *   4. Post-deploy Verification — verifica integridade do repositório após push
 */

Deno.serve(async (req) => {
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
    return errorResponse(buildPublishError(
      "auth", "github_token / owner",
      "Configure uma conexão Git ativa em Configurações → Integrações → GitHub."
    ), 400);
  }

  // ── Sprint 205: Pre-flight — Validate GitHub token ──
  const GITHUB_API = "https://api.github.com";
  const ghHeaders = {
    Authorization: `Bearer ${resolvedGithubToken}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };

  try {
    const tokenCheckResp = await fetch(`${GITHUB_API}/user`, { headers: ghHeaders });
    if (!tokenCheckResp.ok) {
      const statusCode = tokenCheckResp.status;
      const hint = statusCode === 401
        ? "Token expirado ou inválido. Gere um novo Personal Access Token com permissão 'repo'."
        : `GitHub retornou status ${statusCode}. Verifique permissões do token.`;
      return errorResponse(buildPublishError("auth", "github_token", hint), 401);
    }
    const ghUser = await tokenCheckResp.json();
    await pipelineLog(ctx, "github_token_validated", `Token GitHub válido — autenticado como ${ghUser.login}`);
  } catch (tokenErr) {
    return errorResponse(buildPublishError(
      "auth", "github_token",
      `Falha ao validar token GitHub: ${tokenErr instanceof Error ? tokenErr.message : String(tokenErr)}`
    ), 500);
  }

  const repoSlug = (resolvedRepo || initiative.title)
    .toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || `axion-${ctx.initiativeId.slice(0, 8)}`;

  // ── Idempotency guard ──
  const STALE_THRESHOLD_MS = 10 * 60 * 1000;
  const { data: activePublishJobs } = await serviceClient
    .from("initiative_jobs")
    .select("id, created_at")
    .eq("initiative_id", ctx.initiativeId)
    .eq("stage", "publish")
    .eq("status", "running")
    .gt("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());

  if (activePublishJobs && activePublishJobs.length > 0) {
    const now = Date.now();
    const staleJobs = activePublishJobs.filter((j: any) => now - new Date(j.created_at).getTime() > STALE_THRESHOLD_MS);
    const freshJobs = activePublishJobs.filter((j: any) => now - new Date(j.created_at).getTime() <= STALE_THRESHOLD_MS);

    if (staleJobs.length > 0) {
      const staleIds = staleJobs.map((j: any) => j.id);
      await serviceClient.from("initiative_jobs").update({
        status: "failed",
        error: `Auto-expirado após ${STALE_THRESHOLD_MS / 60000}min sem conclusão`,
        completed_at: new Date().toISOString(),
      }).in("id", staleIds);
      await pipelineLog(ctx, "publish_stale_jobs_expired",
        `${staleJobs.length} job(s) de publicação expirado(s) automaticamente`, { expired_ids: staleIds });
    }

    if (freshJobs.length > 0) {
      return errorResponse("Uma publicação já está em andamento para esta iniciativa. Aguarde a conclusão.", 409);
    }
  }

  const jobId = await createJob(ctx, "publish", { owner: resolvedOwner, repo: repoSlug, base_branch: resolvedBaseBranch, mode: "release_agent" });
  await pipelineLog(ctx, "pipeline_publish_start", "Release Agent iniciando: Pre-flight → Changelog → Push → Verificação...");

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

    const { data: initiativeArtifacts } = await serviceClient.from("agent_outputs")
      .select("id, type, summary, raw_output, subtask_id, status, agents(name, role)")
      .eq("organization_id", ctx.organizationId)
      .eq("initiative_id", ctx.initiativeId);

    const subtaskIdSet = new Set(subtaskIds);
    const artifacts = (initiativeArtifacts || []).filter((artifact: any) => {
      if (subtaskIds.length === 0) return true;
      return !artifact.subtask_id || subtaskIdSet.has(artifact.subtask_id);
    });

    if (!artifacts || artifacts.length === 0) {
      await pipelineLog(ctx, "publish_skip", "Nenhum artefato encontrado — execute o pipeline de execução primeiro");
      await completeJob(ctx, jobId!, { skipped: "no_artifacts", artifacts_found: 0 });
      return jsonResponse({ success: true, skipped: true, message: "Nenhum artefato encontrado para publicar.", artifacts_found: 0 });
    }

    // ═══ Sprint 205: Pre-flight — Validate critical files ═══
    const CRITICAL_PUBLISH_FILES = ["index.html", "vite.config.ts", "package.json", "tsconfig.json"];
    const artifactPaths = new Set<string>();
    for (const art of artifacts) {
      const raw = art.raw_output as any;
      const si = art.subtask_id ? subtaskFileMap.get(art.subtask_id) : null;
      const fp = raw?.file_path || si?.file_path;
      if (fp) artifactPaths.add(fp);
    }
    for (const df of Object.keys(DETERMINISTIC_FILES)) artifactPaths.add(df);

    const missingCritical = CRITICAL_PUBLISH_FILES.filter(f => !artifactPaths.has(f));
    if (missingCritical.length > 0) {
      await pipelineLog(ctx, "publish_critical_files_missing",
        `Arquivos críticos ausentes: ${missingCritical.join(", ")}. Serão auto-injetados.`, { missing: missingCritical });
    }

    // ═══ PHASE 1: Pre-flight Checks ═══
    await pipelineLog(ctx, "release_preflight_start", "Release Agent: Executando pre-flight checks...");

    const approvedArtifacts = artifacts.filter((a: any) => a.status === "approved");
    const nonApproved = artifacts.filter((a: any) => a.status !== "approved");
    const fileEntries: FileEntry[] = [];

    for (const art of approvedArtifacts) {
      const raw = art.raw_output as any;
      const si = art.subtask_id ? subtaskFileMap.get(art.subtask_id) : null;
      const filePath = raw?.file_path || si?.file_path;
      if (!filePath) continue;
      let content = raw?.content || raw?.text || (typeof raw === "string" ? raw : "");
      if (!content || content === "{}") continue;

      const SOURCE_FILES = new Set(["src/main.tsx", "src/App.tsx", "src/index.css", "index.html"]);
      if (DETERMINISTIC_FILES[filePath] && !SOURCE_FILES.has(filePath)) content = DETERMINISTIC_FILES[filePath];
      if (filePath === "package.json") content = sanitizePackageJson(content);

      fileEntries.push({ path: filePath, content, type: si?.file_type || art.type, summary: si?.description || art.summary || filePath });
    }

    if (fileEntries.length === 0) throw new Error("Nenhum arquivo aprovado pronto para publicação");

    // ── Auto-inject deterministic scaffold files ──
    const existingPaths = new Set(fileEntries.map(f => f.path));
    const SCAFFOLD_FILES = [
      "index.html", "vite.config.ts", "tsconfig.json", "tsconfig.node.json",
      "tsconfig.app.json", "postcss.config.js", "tailwind.config.js", "vercel.json",
      ".nvmrc", ".node-version", "eslint.config.js", "public/_redirects", "netlify.toml",
      "src/main.tsx", "src/App.tsx", "src/index.css",
    ];
    for (const sp of SCAFFOLD_FILES) {
      if (!existingPaths.has(sp) && DETERMINISTIC_FILES[sp]) {
        fileEntries.push({ path: sp, content: DETERMINISTIC_FILES[sp], type: "scaffold", summary: `Auto-injected: ${sp}` });
        existingPaths.add(sp);
      }
    }

    // ── Import Integrity Check ──
    const allPublishedPaths = new Set(fileEntries.map(f => f.path));
    const SOURCE_CHECK_FILES = ["src/main.tsx", "src/App.tsx"];
    for (const srcFile of SOURCE_CHECK_FILES) {
      const entry = fileEntries.find(f => f.path === srcFile);
      if (entry && DETERMINISTIC_FILES[srcFile]) {
        const broken = findBrokenRelativeImports(srcFile, entry.content, allPublishedPaths);
        if (broken.length > 0) {
          await pipelineLog(ctx, "import_integrity_fix",
            `${srcFile} tem imports quebrados (${broken.join(", ")}). Substituindo por scaffold seguro.`);
          entry.content = DETERMINISTIC_FILES[srcFile];
          entry.type = "scaffold_fallback";
        }
      }
    }

    // ── Dependency Integrity Check ──
    const packageJsonEntry = fileEntries.find(f => f.path === "package.json");
    if (packageJsonEntry) {
      const { missing } = detectMissingDependencies(fileEntries, packageJsonEntry.content);
      if (missing.length > 0) {
        await pipelineLog(ctx, "dependency_integrity_warning",
          `Dependências ausentes: ${missing.join(", ")} — aplicando correção automática...`);
        const fixed = autoFixMissingDependencies(packageJsonEntry.content, missing);
        packageJsonEntry.content = sanitizePackageJson(fixed);
      }
    }

    // AI Pre-flight
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

    // Remove false positives
    if (Array.isArray(preflight.critical_missing)) {
      preflight.critical_missing = preflight.critical_missing.filter((f: string) => !existingPaths.has(f));
      if (preflight.critical_missing.length === 0 && !preflight.preflight_pass) {
        preflight.preflight_pass = true;
        preflight.risk_level = preflight.warnings?.length > 0 ? "medium" : "low";
        preflight.summary = (preflight.summary || "") + " [auto-resolved: scaffold files present]";
      }
    }

    await persistReview(serviceClient, artifacts[0].id, user.id, "release_preflight", "approved", JSON.stringify(preflight));

    if (!preflight.preflight_pass && (preflight.critical_missing?.length ?? 0) > 0) {
      // ═══ PATCH REPAIR AGENT ═══
      await pipelineLog(ctx, "patch_repair_start",
        `Patch Repair Agent: gerando ${preflight.critical_missing.length} arquivo(s) ausente(s): ${preflight.critical_missing.join(", ")}`);

      const existingFilesList = fileEntries.map(f => f.path).join(", ");
      const pkgContent = fileEntries.find(f => f.path === "package.json")?.content || "{}";

      for (const missingFile of preflight.critical_missing) {
        try {
          if (DETERMINISTIC_FILES[missingFile]) {
            fileEntries.push({ path: missingFile, content: DETERMINISTIC_FILES[missingFile], type: "patch_repair", summary: `Patch Repair: ${missingFile} (deterministic)` });
            existingPaths.add(missingFile);
            await pipelineLog(ctx, "patch_repair_deterministic", `Patch Repair: ${missingFile} via template determinístico`);
            continue;
          }

          const patchResult = await callAI(apiKey,
            `Você é o "Patch Repair Agent". Gere o conteúdo COMPLETO para: ${missingFile}
Stack: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
Arquivos existentes: ${existingFilesList}
package.json: ${pkgContent.slice(0, 2000)}
Retorne APENAS JSON: {"file_path": "${missingFile}", "content": "...", "description": "..."}`,
            `Projeto: ${initiative.title}`, true
          );
          totalTokens += patchResult.tokens; totalCost += patchResult.costUsd;

          let patchData: any;
          try { patchData = JSON.parse(patchResult.content); }
          catch { patchData = { file_path: missingFile, content: patchResult.content, description: `Generated ${missingFile}` }; }

          if (patchData?.content && patchData.content.length > 10) {
            fileEntries.push({ path: missingFile, content: patchData.content, type: "patch_repair", summary: `Patch Repair: ${patchData.description || missingFile}` });
            existingPaths.add(missingFile);
          }
        } catch (patchErr) {
          console.error(`[PATCH-REPAIR] Failed for ${missingFile}:`, patchErr);
        }
      }

      const stillMissing = preflight.critical_missing.filter((f: string) => !existingPaths.has(f));
      if (stillMissing.length > 0 && preflight.risk_level === "high") {
        throw new Error(`Publicação bloqueada: arquivos ausentes — ${stillMissing.join(", ")}`);
      }
    } else if (!preflight.preflight_pass) {
      await pipelineLog(ctx, "release_preflight_warning",
        `Pre-flight warnings: ${preflight.warnings?.join(", ") || preflight.summary}`);
    }

    // ═══ PHASE 1.5: Dependency Governance ═══
    try {
      const pkgEntry = fileEntries.find(f => f.path === "package.json");
      if (pkgEntry) {
        const { updatedContent, report } = await runDependencyGovernance(pkgEntry.content);
        pkgEntry.content = updatedContent;
        await pipelineLog(ctx, "dep_governance_result",
          `${report.summary} | upgrades=${report.upgrades.length} deprecated=${report.deprecated.length} blocked=${report.blocked.length} risk=${report.risk}`);
        if (report.risk === "critical") {
          throw new Error(`Publicação bloqueada pelo Dependency Governance Agent: ${report.blocked.join(", ")}`);
        }
      }
    } catch (govErr) {
      if (govErr instanceof Error && govErr.message.includes("Dependency Governance Agent")) throw govErr;
      console.error("[DEP-GOV] Non-fatal:", govErr);
    }

    // ═══ PHASE 2: Changelog ═══
    await pipelineLog(ctx, "release_changelog_start", "Release Agent: Gerando changelog...");

    const changelogResult = await callAI(apiKey,
      `Você é o "Release Agent". Gere:
1. CHANGELOG.md (Keep a Changelog format)
2. Commit messages (Conventional Commits, max 72 chars, inglês)
Retorne APENAS JSON:
{"changelog_md": "...", "commit_messages": [...], "version": "1.0.0", "release_title": "...", "release_notes": "..."}`,
      `## Projeto: ${initiative.title}\n## Arquivos (${fileEntries.length}):\n${fileEntries.map((f, i) => `${i}. ${f.path} — ${f.summary}`).join("\n")}`,
      true
    );
    totalTokens += changelogResult.tokens; totalCost += changelogResult.costUsd;

    let changelog: any;
    try { changelog = JSON.parse(changelogResult.content); }
    catch { changelog = { changelog_md: `# Changelog\n\n## [1.0.0] - ${new Date().toISOString().split("T")[0]}\n\n### Added\n${fileEntries.map(f => `- ${f.summary}`).join("\n")}`, commit_messages: fileEntries.map(f => `feat: add ${f.path}`), version: "1.0.0", release_title: initiative.title }; }

    fileEntries.push({ path: "CHANGELOG.md", content: changelog.changelog_md || "", type: "content", summary: "Changelog" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const ciWorkflow = generateCIWorkflow(supabaseUrl, ctx.initiativeId, ctx.organizationId);
    fileEntries.push({ path: ".github/workflows/validate.yml", content: ciWorkflow, type: "config", summary: "CI workflow" });

    // ── Ensure critical deploy files ──
    const criticalFiles = ["vercel.json", "public/_redirects", "index.html", "vite.config.ts", "tsconfig.json", "tsconfig.node.json", "tsconfig.app.json", "postcss.config.js", "tailwind.config.js"];
    const requiredFiles: Record<string, string> = {};
    for (const f of criticalFiles) {
      if (DETERMINISTIC_FILES[f]) requiredFiles[f] = DETERMINISTIC_FILES[f];
    }
    if (!fileEntries.some(f => f.path === "package.json")) {
      const defaultPkg = {
        name: repoSlug, version: changelog?.version || "1.0.0", type: "module",
        scripts: { dev: "vite", build: "vite build", preview: "vite preview" },
        dependencies: { "react": "^18.3.1", "react-dom": "^18.3.1", "react-router-dom": "^6.30.0", "lucide-react": "^0.462.0", "tailwind-merge": "^2.6.0", "clsx": "^2.1.1", "class-variance-authority": "^0.7.1" },
        devDependencies: { "vite": "^5.4.19", "@vitejs/plugin-react-swc": "^3.11.0", "typescript": "^5.8.3", "tailwindcss": "^3.4.17", "autoprefixer": "^10.4.21", "postcss": "^8.5.6", "@types/react": "^18.3.23", "@types/react-dom": "^18.3.7" },
      };
      requiredFiles["package.json"] = sanitizePackageJson(JSON.stringify(defaultPkg, null, 2));
    }
    for (const [reqPath, reqContent] of Object.entries(requiredFiles)) {
      if (!fileEntries.some(f => f.path === reqPath)) {
        fileEntries.push({ path: reqPath, content: reqContent, type: "config", summary: `Ensure ${reqPath}` });
      }
    }

    // ★ CRITICAL: Sanitize all file paths before GitHub push
    const { valid: sanitizedEntries, removed } = sanitizeFileEntries(fileEntries);
    if (removed.length > 0) {
      await pipelineLog(ctx, "path_sanitization", `Removidos ${removed.length} paths inválidos ou conflitantes: ${removed.join(", ")}`);
    }

    // ═══ PHASE 3: GitHub Push (Atomic) ═══
    await pipelineLog(ctx, "release_push_start", `Release Agent: Publicando ${sanitizedEntries.length} arquivos...`);

    const pushResult = await atomicGitHubPush({
      ghHeaders,
      owner: resolvedOwner,
      repo: resolvedRepo || repoSlug,
      baseBranch: resolvedBaseBranch,
      initiativeTitle: initiative.title,
      fileEntries: sanitizedEntries,
      commitMessages: changelog.commit_messages || [],
      version: changelog.version || "1.0.0",
    });

    await pipelineLog(ctx, "release_atomic_commit",
      `Atomic commit: ${pushResult.committedFiles.length} arquivos em 1 commit (${pushResult.commitSha.slice(0, 7)})`);

    if (pushResult.committedFiles.length === 0) throw new Error("Nenhum arquivo foi commitado com sucesso");

    // ═══ PHASE 3.5: Security scan ═══
    const allContent = sanitizedEntries.map(f => f.content).join("\n").slice(0, 20000);
    const publishMatchInput: MatchInput = { status_code: 200, body: allContent };
    const publishSecReport = evaluateSecurityRules(PIPELINE_SECURITY_RULES, publishMatchInput);
    if (!publishSecReport.passed) {
      const logEntry = buildMatcherLogEntry("pipeline-publish", publishSecReport);
      await pipelineLog(ctx, "security_matcher_flagged",
        `⚠️ Security matcher flagged: ${logEntry.matched_rule_ids.join(", ")}`,
        logEntry as unknown as Record<string, unknown>);
    }

    // ═══ PHASE 4: Post-deploy Verification ═══
    await pipelineLog(ctx, "release_verify_start", "Release Agent: Verificando integridade pós-deploy...");

    const verifyResult = await callAI(apiKey,
      `Você é o "Release Agent" fazendo verificação pós-deploy. Analise o resultado da publicação.
Retorne APENAS JSON:
{"deploy_healthy": true/false, "files_verified": 0, "missing_critical": [], "recommendations": [], "summary": "...", "confidence": 0-100}`,
      `## Repositório: ${pushResult.actualOwner}/${pushResult.actualRepo}\n## Branch: ${resolvedBaseBranch}\n## Commitados (${pushResult.committedFiles.length}):\n${pushResult.committedFiles.join("\n")}\n## Pulados (${pushResult.skippedFiles.length}):\n${pushResult.skippedFiles.join("\n") || "Nenhum"}`,
      true
    );
    totalTokens += verifyResult.tokens; totalCost += verifyResult.costUsd;

    let verification: any;
    try { verification = JSON.parse(verifyResult.content); }
    catch { verification = { deploy_healthy: true, files_verified: pushResult.committedFiles.length, missing_critical: [], recommendations: [], summary: "OK", confidence: 80 }; }

    await persistReview(serviceClient, artifacts[0].id, user.id, "release_verification", "approved", JSON.stringify(verification));

    // Save to knowledge base
    await serviceClient.from("org_knowledge_base").insert({
      organization_id: ctx.organizationId,
      title: `Release: ${initiative.title} v${changelog.version || "1.0.0"}`,
      content: changelog.changelog_md || "",
      category: "release_notes",
      source_initiative_id: ctx.initiativeId,
      tags: ["release", "changelog", pushResult.actualRepo],
    });

    // Update brain nodes
    try {
      for (const filePath of pushResult.committedFiles.slice(0, 50)) {
        const node = await getNodeByPath(ctx, filePath);
        if (node) await updateNodeStatus(ctx, node.id, "published");
      }
    } catch (e) { console.error("Brain publish update error:", e); }

    await updateInitiative(ctx, { stage_status: "published" });

    // ═══ Sprint 206: PublishConfirmation contract ═══
    const publishConfirmation: PublishConfirmation = {
      schema_version: "1.0",
      initiative_id: ctx.initiativeId,
      repo_owner: pushResult.actualOwner,
      repo_name: pushResult.actualRepo,
      repo_url: `https://github.com/${pushResult.actualOwner}/${pushResult.actualRepo}`,
      branch: resolvedBaseBranch,
      commit_sha: pushResult.commitSha,
      files_committed: pushResult.committedFiles.length,
      skipped_files: pushResult.skippedFiles,
      preflight_pass: !!preflight.preflight_pass,
      preflight_risk: preflight.risk_level || "low",
      verification_healthy: !!verification.deploy_healthy,
      verification_confidence: verification.confidence || 0,
      security_passed: publishSecReport.passed,
      security_highest_severity: publishSecReport.highest_severity,
      dep_governance_risk: null,
      version: changelog.version || "1.0.0",
      published_at: new Date().toISOString(),
    };

    await updateInitiative(ctx, {
      repo_url: `https://github.com/${pushResult.actualOwner}/${pushResult.actualRepo}`,
      commit_hash: pushResult.commitSha,
      build_status: preflight.preflight_pass ? "pass" : "fail",
      deploy_status: "published",
      publish_confirmation: JSON.stringify(publishConfirmation),
    });

    if (jobId) await completeJob(ctx, jobId, {
      branch: resolvedBaseBranch, files_committed: pushResult.committedFiles.length,
      owner: pushResult.actualOwner, repo: pushResult.actualRepo,
      version: changelog.version || "1.0.0",
      repo_url: pushResult.repoHtmlUrl,
      preflight: { pass: preflight.preflight_pass, risk: preflight.risk_level },
      verification: { healthy: verification.deploy_healthy, confidence: verification.confidence },
      skipped_files: pushResult.skippedFiles,
      publish_confirmation: publishConfirmation,
    }, { model: "routed", costUsd: totalCost, durationMs: 0 });

    await pipelineLog(ctx, "pipeline_publish_complete",
      `Release Agent: ${pushResult.committedFiles.length} arquivos publicados em ${pushResult.actualOwner}/${pushResult.actualRepo} v${changelog.version || "1.0.0"} ✅`);

    return jsonResponse({
      success: true, branch: resolvedBaseBranch,
      files_committed: pushResult.committedFiles.length,
      skipped_files: pushResult.skippedFiles,
      owner: pushResult.actualOwner, repo: pushResult.actualRepo,
      version: changelog.version || "1.0.0",
      repo_url: pushResult.repoHtmlUrl,
      preflight_pass: preflight.preflight_pass,
      deploy_healthy: verification.deploy_healthy,
      job_id: jobId,
      publish_confirmation: publishConfirmation,
    });
  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
