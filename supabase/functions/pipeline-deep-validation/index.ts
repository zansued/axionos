import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";
import { pipelineLog, updateInitiative, createJob, completeJob, failJob } from "../_shared/pipeline-helpers.ts";
import { generateBrainContext, getBrainNodes, getBrainEdges, getPreventionRules } from "../_shared/brain-helpers.ts";

/**
 * Deep Static Analysis — Runtime Validation Pre-check
 * 
 * Uses AI + Project Brain DAG to simulate what tsc/vite would catch:
 *   1. Import Resolution — all imports resolve to existing files
 *   2. Type Consistency — interfaces/types match across file boundaries
 *   3. Dependency Audit — package.json has all used packages
 *   4. Build Graph — circular deps, missing entry points, broken chains
 *   5. Config Validation — tsconfig, vite.config, index.html integrity
 *
 * Returns structured errors compatible with the Fix Loop.
 */

interface DeepError {
  file: string;
  line: number | null;
  column: number | null;
  message: string;
  category: "import" | "type" | "dependency" | "config" | "build" | "security";
  severity: "error" | "warning";
  suggestion: string | null;
}

serve(async (req) => {
  const result = await bootstrapPipeline(req, "pipeline-deep-validation");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient, apiKey, user } = result;

  const jobId = await createJob(ctx, "deep_validation", {
    initiative_id: ctx.initiativeId,
    mode: "deep_static_analysis",
  });

  await pipelineLog(ctx, "deep_validation_start",
    "Deep Static Analysis: Import Resolution → Type Consistency → Dependency Audit → Build Graph...");

  try {
    // ── Collect all approved artifacts with code ──
    const { data: stories } = await serviceClient.from("stories").select("id").eq("initiative_id", ctx.initiativeId);
    if (!stories?.length) throw new Error("Nenhuma story encontrada");

    const storyIds = stories.map((s: any) => s.id);
    const { data: phases } = await serviceClient.from("story_phases").select("id").in("story_id", storyIds);
    const phaseIds = (phases || []).map((p: any) => p.id);
    const { data: subtasks } = await serviceClient.from("story_subtasks")
      .select("id, file_path, file_type, output").in("phase_id", phaseIds);

    // Build virtual filesystem
    const virtualFS: Record<string, { content: string; fileType: string | null }> = {};
    for (const st of (subtasks || [])) {
      if (st.file_path && st.output) {
        virtualFS[st.file_path] = { content: st.output, fileType: st.file_type };
      }
    }

    const fileCount = Object.keys(virtualFS).length;
    if (fileCount === 0) throw new Error("Nenhum arquivo gerado encontrado");

    // ── Fetch Brain graph for cross-referencing ──
    const [brainNodes, brainEdges, preventionRules] = await Promise.all([
      getBrainNodes(ctx),
      getBrainEdges(ctx),
      getPreventionRules(ctx),
    ]);

    let totalTokens = 0, totalCost = 0;
    const allErrors: DeepError[] = [];

    // ═══ PHASE 1: Import Resolution ═══
    // Check every import in every file against the virtual filesystem
    const importContext = buildImportAnalysisContext(virtualFS, brainNodes);

    const importResult = await callAI(apiKey,
      `Você é um analisador de imports TypeScript/React. Analise TODOS os imports de TODOS os arquivos e verifique:

1. Se cada import aponta para um arquivo que EXISTE no projeto (verifique a lista de arquivos)
2. Se imports com "@/" resolvem para "src/" corretamente
3. Se imports relativos ("./", "../") resolvem para caminhos válidos
4. Se imports de packages npm estão no package.json
5. Se há imports circulares

IMPORTANTE: Considere extensões implícitas (.ts, .tsx, /index.ts, /index.tsx)

Retorne APENAS JSON:
{
  "errors": [{"file": "...", "line": null, "message": "Import 'X' não encontrado", "category": "import", "severity": "error", "suggestion": "..."}],
  "circular_deps": [["fileA", "fileB"]],
  "missing_packages": ["package-name"],
  "summary": "..."
}`,
      importContext,
      true
    );
    totalTokens += importResult.tokens; totalCost += importResult.costUsd;

    try {
      const importAnalysis = JSON.parse(importResult.content);
      for (const err of (importAnalysis.errors || [])) {
        allErrors.push({ ...err, column: null, severity: err.severity || "error", suggestion: err.suggestion || null });
      }
      for (const pkg of (importAnalysis.missing_packages || [])) {
        allErrors.push({
          file: "package.json", line: null, column: null,
          message: `Package "${pkg}" é usado mas não está no package.json`,
          category: "dependency", severity: "error",
          suggestion: `Adicionar "${pkg}" às dependencies no package.json`,
        });
      }
    } catch {}

    // ═══ PHASE 2: Type Consistency (cross-file) ═══
    const typeContext = buildTypeAnalysisContext(virtualFS);

    const typeResult = await callAI(apiKey,
      `Você é um verificador de tipos TypeScript. Analise a CONSISTÊNCIA de tipos entre arquivos:

1. Interfaces/types exportados são usados corretamente pelos importadores?
2. Props de componentes React correspondem ao que é passado?
3. Retornos de hooks/serviços correspondem ao que os consumidores esperam?
4. Tipos genéricos são usados corretamente?
5. Há uso de "any" desnecessário ou type assertions inseguras?

Retorne APENAS JSON:
{
  "errors": [{"file": "...", "line": null, "message": "...", "category": "type", "severity": "error|warning", "suggestion": "..."}],
  "type_coverage_pct": 0-100,
  "summary": "..."
}`,
      typeContext,
      true
    );
    totalTokens += typeResult.tokens; totalCost += typeResult.costUsd;

    try {
      const typeAnalysis = JSON.parse(typeResult.content);
      for (const err of (typeAnalysis.errors || [])) {
        allErrors.push({ ...err, column: null, suggestion: err.suggestion || null });
      }
    } catch {}

    // ═══ PHASE 3: Build Graph & Config Validation ═══
    const configFiles = ["package.json", "tsconfig.json", "vite.config.ts", "index.html", "src/main.tsx", "src/App.tsx"];
    const configContext = configFiles
      .filter(f => virtualFS[f])
      .map(f => `### ${f}\n\`\`\`\n${virtualFS[f].content.slice(0, 3000)}\n\`\`\``)
      .join("\n\n");

    const missingCritical = configFiles.filter(f => !virtualFS[f]);

    for (const missing of missingCritical) {
      allErrors.push({
        file: missing, line: null, column: null,
        message: `Arquivo crítico "${missing}" não foi gerado`,
        category: "config", severity: "error",
        suggestion: `Gerar o arquivo ${missing} — necessário para build do projeto`,
      });
    }

    if (configContext) {
      const buildResult = await callAI(apiKey,
        `Você é um verificador de configuração de build Vite/React/TypeScript. Analise:

1. package.json: dependencies corretas? scripts de build presentes? type: "module"?
2. tsconfig.json: configurações compatíveis com Vite? paths alias "@/" configurado?
3. vite.config.ts: plugins corretos? resolve.alias configurado?
4. index.html: div#root? script type="module" apontando para src/main.tsx?
5. src/main.tsx: ReactDOM.createRoot? import de App?
6. src/App.tsx: componente raiz válido? Router configurado?

Retorne APENAS JSON:
{
  "errors": [{"file": "...", "line": null, "message": "...", "category": "config|build", "severity": "error|warning", "suggestion": "..."}],
  "build_ready": true/false,
  "summary": "..."
}`,
        `## Arquivos de configuração:\n${configContext}\n\n## Todos os arquivos do projeto (${fileCount}):\n${Object.keys(virtualFS).join("\n")}`,
        true
      );
      totalTokens += buildResult.tokens; totalCost += buildResult.costUsd;

      try {
        const buildAnalysis = JSON.parse(buildResult.content);
        for (const err of (buildAnalysis.errors || [])) {
          allErrors.push({ ...err, column: null, suggestion: err.suggestion || null });
        }
      } catch {}
    }

    // ═══ PHASE 4: Prevention Rules Check ═══
    if (preventionRules.length > 0) {
      // Check if any known error patterns reappear
      const preventionContext = `## Regras de prevenção (erros passados):\n${preventionRules.map(r => `- ${r}`).join("\n")}\n\n## Arquivos gerados:\n${Object.entries(virtualFS).map(([path, { content }]) => `### ${path}\n${content.slice(0, 1500)}`).slice(0, 15).join("\n\n")}`;

      const preventionResult = await callAI(apiKey,
        `Verifique se os arquivos gerados violam alguma das regras de prevenção (aprendidas de erros passados). Retorne APENAS JSON:
{"violations": [{"file": "...", "line": null, "message": "Viola regra: ...", "category": "build", "severity": "warning", "suggestion": "..."}], "summary": "..."}`,
        preventionContext,
        true
      );
      totalTokens += preventionResult.tokens; totalCost += preventionResult.costUsd;

      try {
        const prevention = JSON.parse(preventionResult.content);
        for (const v of (prevention.violations || [])) {
          allErrors.push({ ...v, column: null, suggestion: v.suggestion || null });
        }
      } catch {}
    }

    // ── Aggregate results ──
    const errors = allErrors.filter(e => e.severity === "error");
    const warnings = allErrors.filter(e => e.severity === "warning");
    const passed = errors.length === 0;

    // Store errors for Fix Loop consumption
    if (!passed) {
      await updateInitiative(ctx, {
        execution_progress: {
          deep_validation_errors: errors.slice(0, 50),
          deep_validation_warnings: warnings.slice(0, 20),
          deep_validation_passed: false,
          deep_validation_at: new Date().toISOString(),
        },
      });
    }

    // Update initiative status
    if (passed) {
      await updateInitiative(ctx, { stage_status: "ready_to_publish" });
    }
    // If not passed, stay in "validating" — Fix Loop will handle

    if (jobId) await completeJob(ctx, jobId, {
      total_files: fileCount,
      errors_count: errors.length,
      warnings_count: warnings.length,
      passed,
      errors: errors.slice(0, 30),
      warnings: warnings.slice(0, 15),
    }, { model: "google/gemini-2.5-flash", costUsd: totalCost, durationMs: 0 });

    await pipelineLog(ctx, "deep_validation_complete",
      `Deep Static Analysis: ${fileCount} arquivos, ${errors.length} erros, ${warnings.length} warnings${passed ? " ✅" : " ❌"}`,
      { total_tokens: totalTokens, cost_usd: totalCost, passed });

    return jsonResponse({
      success: true, passed,
      total_files: fileCount,
      errors_count: errors.length,
      warnings_count: warnings.length,
      errors: errors.slice(0, 50),
      warnings: warnings.slice(0, 20),
      job_id: jobId,
    });
  } catch (e) {
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});

// ── Context Builders ──

function buildImportAnalysisContext(
  virtualFS: Record<string, { content: string; fileType: string | null }>,
  brainNodes: any[]
): string {
  const allPaths = Object.keys(virtualFS);
  const sections: string[] = [];

  sections.push(`## Arquivos do projeto (${allPaths.length}):\n${allPaths.join("\n")}`);

  // Extract imports from each file
  const importRegex = /(?:import\s+(?:[\w{}\s,*]+)\s+from\s+["'])([^"']+)["']/g;
  const dynamicImportRegex = /import\(\s*["']([^"']+)["']\s*\)/g;

  const fileImports: string[] = [];
  for (const [path, { content }] of Object.entries(virtualFS)) {
    const imports: string[] = [];
    let match;
    const code = content.slice(0, 5000);

    importRegex.lastIndex = 0;
    while ((match = importRegex.exec(code)) !== null) imports.push(match[1]);
    dynamicImportRegex.lastIndex = 0;
    while ((match = dynamicImportRegex.exec(code)) !== null) imports.push(match[1]);

    if (imports.length > 0) {
      fileImports.push(`### ${path}\nImports: ${imports.join(", ")}`);
    }
  }

  sections.push(`\n## Imports por arquivo:\n${fileImports.join("\n")}`);

  // package.json deps
  if (virtualFS["package.json"]) {
    try {
      const pkg = JSON.parse(virtualFS["package.json"].content);
      const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
      sections.push(`\n## Packages disponíveis:\n${deps.join(", ")}`);
    } catch {}
  }

  return sections.join("\n");
}

function buildTypeAnalysisContext(
  virtualFS: Record<string, { content: string; fileType: string | null }>
): string {
  const sections: string[] = [];

  // Focus on files that export types/interfaces and their consumers
  const typeFiles = Object.entries(virtualFS)
    .filter(([path]) => path.includes("/types") || path.includes("/interfaces") || path.endsWith(".d.ts"))
    .slice(0, 10);

  const hookFiles = Object.entries(virtualFS)
    .filter(([path]) => path.includes("/hooks/") || path.includes("use"))
    .slice(0, 10);

  const componentFiles = Object.entries(virtualFS)
    .filter(([path]) => path.includes("/components/") || path.endsWith(".tsx"))
    .slice(0, 15);

  for (const [path, { content }] of [...typeFiles, ...hookFiles, ...componentFiles]) {
    sections.push(`### ${path}\n${content.slice(0, 2500)}`);
  }

  return `## Análise de tipos cross-file:\n${sections.join("\n\n")}`;
}
