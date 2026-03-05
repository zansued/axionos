import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { sanitizePackageJson, DETERMINISTIC_FILES } from "../_shared/code-sanitizers.ts";

/**
 * Runtime Validation — Real tsc + vite build via GitHub Actions
 *
 * Flow:
 *   1. Collect all approved code artifacts
 *   2. Push to a temporary branch `validate/{initiative-id-short}`
 *   3. GitHub Actions runs: npm install → tsc --noEmit → vite build
 *   4. Results come back via `pipeline-ci-webhook`
 *
 * This replaces AI-simulated validation with real compiler checks.
 */

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-runtime-validation");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient, body, apiKey, user } = result;

  const jobId = await createJob(ctx, "runtime_validation", {
    initiative_id: ctx.initiativeId,
    mode: "real_tsc_vite_build",
  });

  await pipelineLog(ctx, "runtime_validation_start",
    "Runtime Validation: Pushing to validate branch → tsc --noEmit → vite build...");

  const GITHUB_API = "https://api.github.com";

  try {
    // ── Resolve Git connection ──
    const { data: gitConns } = await serviceClient.from("git_connections")
      .select("github_token, repo_owner, repo_name, default_branch")
      .eq("organization_id", ctx.organizationId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1);

    const conn = gitConns?.[0];
    if (!conn?.github_token || !conn?.repo_owner) {
      throw new Error("Conexão Git ativa necessária para Runtime Validation. Configure em Connections.");
    }

    const ghHeaders = {
      Authorization: `Bearer ${conn.github_token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };

    const owner = conn.repo_owner;
    const repo = conn.repo_name;
    let baseBranch = conn.default_branch || "main";
    const validateBranch = `validate/${ctx.initiativeId.slice(0, 8)}`;

    // ── Collect artifacts ──
    const { data: stories } = await serviceClient.from("stories")
      .select("id").eq("initiative_id", ctx.initiativeId);
    if (!stories?.length) throw new Error("Nenhuma story encontrada");

    const storyIds = stories.map((s: any) => s.id);
    const { data: phases } = await serviceClient.from("story_phases")
      .select("id").in("story_id", storyIds);
    const phaseIds = (phases || []).map((p: any) => p.id);
    const { data: subtasks } = await serviceClient.from("story_subtasks")
      .select("id, file_path, file_type, output").in("phase_id", phaseIds);

    // Build file entries from subtask outputs
    const fileEntries: { path: string; content: string }[] = [];
    const seen = new Set<string>();

    for (const st of (subtasks || [])) {
      if (st.file_path && st.output && !seen.has(st.file_path)) {
        seen.add(st.file_path);
        let content = st.output;

        // Apply deterministic overrides
        if (DETERMINISTIC_FILES[st.file_path]) content = DETERMINISTIC_FILES[st.file_path];
        if (st.file_path === "package.json") content = sanitizePackageJson(content);

        fileEntries.push({ path: st.file_path, content });
      }
    }

    if (fileEntries.length === 0) throw new Error("Nenhum arquivo gerado encontrado");

    // Add CI workflow that triggers on validate/* branches
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    fileEntries.push({
      path: ".github/workflows/validate.yml",
      content: generateValidateWorkflow(supabaseUrl, ctx.initiativeId, ctx.organizationId),
    });

    // Add required config files if missing
    const requiredFiles: Record<string, string> = {
      "vercel.json": DETERMINISTIC_FILES["vercel.json"],
      "public/_redirects": DETERMINISTIC_FILES["public/_redirects"],
    };
    for (const [reqPath, reqContent] of Object.entries(requiredFiles)) {
      if (!seen.has(reqPath) && reqContent) {
        fileEntries.push({ path: reqPath, content: reqContent });
        seen.add(reqPath);
      }
    }

    await pipelineLog(ctx, "runtime_validation_collecting",
      `Coletados ${fileEntries.length} arquivos para validação runtime`);

    // ── Check if repo exists ──
    const repoCheck = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers: ghHeaders });
    if (!repoCheck.ok) {
      throw new Error(`Repositório ${owner}/${repo} não encontrado. Publique primeiro antes de rodar Runtime Validation.`);
    }
    const repoData = await repoCheck.json();
    const isRepoEmpty = Number(repoData?.size ?? 0) === 0;

    // ── Get base branch SHA (handle empty repos + stale default branch) ──
    let baseSha: string | null = null;
    let baseTreeSha: string | null = null;

    const loadBaseCommit = async (branch: string) => {
      const refResp = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${branch}`,
        { headers: ghHeaders }
      );

      if (!refResp.ok) {
        const errText = await refResp.text();
        return { ok: false as const, status: refResp.status, errText };
      }

      const refData = await refResp.json();
      const sha = refData.object.sha as string;
      const baseCommitResp = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/git/commits/${sha}`,
        { headers: ghHeaders }
      );
      if (!baseCommitResp.ok) {
        throw new Error(`Falha ao obter commit base da branch '${branch}'`);
      }
      const baseCommit = await baseCommitResp.json();
      return { ok: true as const, sha, treeSha: baseCommit.tree.sha as string };
    };

    const baseResult = await loadBaseCommit(baseBranch);
    if (baseResult.ok) {
      baseSha = baseResult.sha;
      baseTreeSha = baseResult.treeSha;
    } else if (!isRepoEmpty && repoData?.default_branch && repoData.default_branch !== baseBranch) {
      // stale branch in connection config, fallback to repo default branch
      baseBranch = repoData.default_branch;
      const fallbackResult = await loadBaseCommit(baseBranch);
      if (!fallbackResult.ok) {
        throw new Error(`Branch '${baseBranch}' não encontrada: ${fallbackResult.errText}`);
      }
      baseSha = fallbackResult.sha;
      baseTreeSha = fallbackResult.treeSha;
    } else if (isRepoEmpty) {
      await pipelineLog(ctx, "runtime_validation_empty_repo",
        `Repo vazio detectado — inicializando branch '${baseBranch}' com commit seed`);

      const seedResp = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/contents/README.md`,
        {
          method: "PUT",
          headers: ghHeaders,
          body: JSON.stringify({
            message: "chore: initialize repository for runtime validation",
            content: btoa("# Runtime Validation\n\nRepository initialized automatically by SynkrAIOS pipeline.\n"),
            branch: baseBranch,
          }),
        }
      );
      if (!seedResp.ok) {
        throw new Error(`Falha ao inicializar repositório vazio: ${await seedResp.text()}`);
      }
      await seedResp.text();

      const seededResult = await loadBaseCommit(baseBranch);
      if (!seededResult.ok) {
        throw new Error(`Branch '${baseBranch}' não encontrada após inicialização: ${seededResult.errText}`);
      }
      baseSha = seededResult.sha;
      baseTreeSha = seededResult.treeSha;
    } else {
      throw new Error(`Branch '${baseBranch}' não encontrada: ${baseResult.errText}`);
    }

    // ── Build tree entries ──
    const treeItems: Array<any> = [];

    if (!baseSha) {
      // Empty repository: create tree directly with inline content (blob API returns 409 for empty repos)
      for (const file of fileEntries) {
        treeItems.push({
          path: file.path,
          mode: "100644",
          type: "blob",
          content: file.content,
        });
      }
    } else {
      // Existing repository: faster/leaner blob flow
      const BLOB_BATCH = 5;
      for (let i = 0; i < fileEntries.length; i += BLOB_BATCH) {
        const batch = fileEntries.slice(i, i + BLOB_BATCH);
        const results = await Promise.allSettled(
          batch.map(async (file) => {
            const resp = await fetch(
              `${GITHUB_API}/repos/${owner}/${repo}/git/blobs`,
              {
                method: "POST",
                headers: ghHeaders,
                body: JSON.stringify({ content: file.content, encoding: "utf-8" }),
              }
            );
            if (!resp.ok) {
              const errText = await resp.text();
              throw new Error(`Blob failed for ${file.path}: ${errText}`);
            }
            const data = await resp.json();
            return { path: file.path, sha: data.sha };
          })
        );

        for (const r of results) {
          if (r.status === "fulfilled") {
            treeItems.push({ path: r.value.path, mode: "100644", type: "blob", sha: r.value.sha });
          } else {
            console.error("Blob rejected:", r.reason?.message || r.reason);
          }
        }
      }
    }

    if (treeItems.length === 0) {
      // Log what we tried to push for debugging
      console.error("All blobs failed. Files attempted:", fileEntries.map(f => f.path));
      console.error("Repo:", `${owner}/${repo}`, "Token length:", conn.github_token?.length);
      throw new Error(`Nenhum blob criado — ${fileEntries.length} arquivos falharam. Verifique permissões do token GitHub.`);
    }

    // ── Create tree ──
    const treeBody: any = { tree: treeItems };
    if (baseTreeSha) treeBody.base_tree = baseTreeSha;

    const treeResp = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/trees`,
      {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify(treeBody),
      }
    );
    if (!treeResp.ok) throw new Error(`Tree creation failed: ${await treeResp.text()}`);
    const newTree = await treeResp.json();

    // ── Create commit ──
    const commitBody: any = {
      message: `chore: runtime validation for ${initiative.title}\n\nTriggered by SynkrAIOS pipeline`,
      tree: newTree.sha,
    };
    if (baseSha) commitBody.parents = [baseSha];

    const commitResp = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/commits`,
      {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify(commitBody),
      }
    );
    if (!commitResp.ok) throw new Error(`Commit failed: ${await commitResp.text()}`);
    const newCommit = await commitResp.json();

    // ── Create main branch if repo was empty ──
    if (!baseSha) {
      const createMainResp = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/git/refs`,
        {
          method: "POST",
          headers: ghHeaders,
          body: JSON.stringify({ ref: `refs/heads/${baseBranch}`, sha: newCommit.sha }),
        }
      );
      if (!createMainResp.ok) throw new Error(`Main branch creation failed: ${await createMainResp.text()}`);
      await createMainResp.text();
    }

    // ── Create or update validate branch ──
    const branchRefResp = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${validateBranch}`,
      { headers: ghHeaders }
    );

    if (branchRefResp.ok) {
      // Branch exists, update it
      await branchRefResp.text();
      const updateResp = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${validateBranch}`,
        {
          method: "PATCH",
          headers: ghHeaders,
          body: JSON.stringify({ sha: newCommit.sha, force: true }),
        }
      );
      if (!updateResp.ok) throw new Error(`Branch update failed: ${await updateResp.text()}`);
      await updateResp.text();
    } else {
      await branchRefResp.text();
      // Create new branch
      const createRefResp = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/git/refs`,
        {
          method: "POST",
          headers: ghHeaders,
          body: JSON.stringify({ ref: `refs/heads/${validateBranch}`, sha: newCommit.sha }),
        }
      );
      if (!createRefResp.ok) throw new Error(`Branch creation failed: ${await createRefResp.text()}`);
      await createRefResp.text();
    }

    // Store validation state
    await updateInitiative(ctx, {
      execution_progress: {
        runtime_validation_status: "running",
        runtime_validation_branch: validateBranch,
        runtime_validation_commit: newCommit.sha,
        runtime_validation_started_at: new Date().toISOString(),
        runtime_validation_files: fileEntries.length,
      },
    });

    await pipelineLog(ctx, "runtime_validation_pushed",
      `Código pushed para ${owner}/${repo}@${validateBranch} (${newCommit.sha.slice(0, 7)}). CI rodando tsc + vite build...`,
      { branch: validateBranch, commit: newCommit.sha, files: fileEntries.length });

    if (jobId) await completeJob(ctx, jobId, {
      branch: validateBranch,
      commit_sha: newCommit.sha,
      files_pushed: fileEntries.length,
      status: "ci_running",
      repo: `${owner}/${repo}`,
    }, { costUsd: 0, durationMs: 0 });

    return jsonResponse({
      success: true,
      status: "ci_running",
      branch: validateBranch,
      commit_sha: newCommit.sha,
      files_pushed: fileEntries.length,
      repo: `${owner}/${repo}`,
      message: `${fileEntries.length} arquivos pushed para branch '${validateBranch}'. GitHub Actions rodará tsc --noEmit + vite build. Resultados serão enviados via webhook.`,
      job_id: jobId,
    });
  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});

// ── CI Workflow for validate/* branches ──
function generateValidateWorkflow(supabaseUrl: string, initiativeId: string, organizationId: string): string {
  const webhookUrl = `${supabaseUrl}/functions/v1/pipeline-ci-webhook`;
  return `name: SynkrAIOS Validate

on:
  push:
    branches: [main, master, 'validate/**']

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
