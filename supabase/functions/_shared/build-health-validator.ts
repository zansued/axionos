/**
 * Sprint 211 — Synthetic Build Validator (Dry-Run)
 * 
 * Reusable module that validates generated artifacts would produce
 * a successful `vite build` without actually running one.
 * 
 * Checks:
 * 1. Entry points exist (index.html, src/main.tsx, src/App.tsx)
 * 2. package.json is valid, has required deps, no banned packages
 * 3. vite.config.ts uses correct plugin
 * 4. Cross-file import resolution (Sprint 210 integration)
 * 5. Environment variable usage (import.meta.env, not process.env)
 * 6. TypeScript basic syntax (unclosed brackets, missing exports)
 */

import { validateFileImports, type ImportValidationResult } from "./code-sanitizers.ts";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface HealthCheck {
  id: string;
  category: "package.json" | "vite.config.ts" | "vercel.json" | "tsconfig" | "imports" | "entry_points" | "env_vars" | "general";
  label: string;
  status: "pass" | "fail" | "warn" | "fixed";
  detail?: string;
}

export interface BuildHealthReport {
  checks: HealthCheck[];
  summary: {
    total: number;
    pass: number;
    fixed: number;
    warn: number;
    fail: number;
    score: number;
  };
  issues: string[];
  /** Sprint 210: per-file import validation results */
  importValidation: {
    filesChecked: number;
    filesWithBrokenImports: number;
    totalBrokenImports: number;
    details: { filePath: string; brokenImports: string[] }[];
  };
  /** Whether this build would likely succeed on Vercel */
  deployable: boolean;
}

export interface FileArtifact {
  filePath: string;
  content: string;
}

// ═══════════════════════════════════════════════════════════════
// Banned / Required constants
// ═══════════════════════════════════════════════════════════════

const BANNED_PACKAGES = new Set([
  "shadcn/ui", "shadcn-ui", "@shadcn/ui", "shadcn",
  "radix-ui", "@radix/ui", "@vitejs/plugin-react",
]);

const REQUIRED_ENTRY_FILES = ["index.html", "src/main.tsx"];
const RECOMMENDED_ENTRY_FILES = ["src/App.tsx", "src/index.css"];
const REQUIRED_DEPS = ["react", "react-dom"];
const REQUIRED_DEV_DEPS = ["vite", "@vitejs/plugin-react-swc", "typescript"];

// ═══════════════════════════════════════════════════════════════
// Main validator
// ═══════════════════════════════════════════════════════════════

/**
 * Run a synthetic build validation against a set of file artifacts.
 * Returns a detailed health report with pass/fail/warn/fixed checks.
 */
export function validateBuildHealth(files: FileArtifact[]): BuildHealthReport {
  const checks: HealthCheck[] = [];
  const issues: string[] = [];
  const fileMap = new Map<string, string>();

  for (const f of files) {
    fileMap.set(f.filePath, f.content);
  }

  const allPaths = files.map(f => f.filePath);

  // ── 1. Entry Points ──
  for (const ep of REQUIRED_ENTRY_FILES) {
    if (fileMap.has(ep)) {
      checks.push({ id: `entry-${ep}`, category: "entry_points", label: `${ep} presente`, status: "pass" });
    } else {
      checks.push({ id: `entry-${ep}`, category: "entry_points", label: `${ep} presente`, status: "fail", detail: "Arquivo de entrada obrigatório ausente" });
    }
  }
  for (const ep of RECOMMENDED_ENTRY_FILES) {
    if (fileMap.has(ep)) {
      checks.push({ id: `entry-${ep}`, category: "entry_points", label: `${ep} presente`, status: "pass" });
    } else {
      checks.push({ id: `entry-${ep}`, category: "entry_points", label: `${ep} presente`, status: "warn", detail: "Arquivo recomendado ausente" });
    }
  }

  // ── 2. package.json ──
  const pkgContent = fileMap.get("package.json");
  if (!pkgContent) {
    checks.push({ id: "pkg-exists", category: "package.json", label: "package.json presente", status: "fail" });
  } else {
    checks.push({ id: "pkg-exists", category: "package.json", label: "package.json presente", status: "pass" });
    try {
      const cleaned = pkgContent.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
      const pkg = JSON.parse(cleaned);
      checks.push({ id: "pkg-parse", category: "package.json", label: "JSON válido", status: "pass" });

      const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

      // type: module
      checks.push({
        id: "pkg-esm", category: "package.json",
        label: 'type: "module"',
        status: pkg.type === "module" ? "pass" : "warn",
        detail: pkg.type === "module" ? undefined : "Faltando type: module",
      });

      // Required deps
      for (const dep of REQUIRED_DEPS) {
        checks.push({
          id: `pkg-dep-${dep}`, category: "package.json",
          label: `Dep ${dep}`, status: allDeps[dep] ? "pass" : "fail",
          detail: allDeps[dep] || "ausente",
        });
      }

      // Required dev deps
      for (const dep of REQUIRED_DEV_DEPS) {
        checks.push({
          id: `pkg-devdep-${dep}`, category: "package.json",
          label: `DevDep ${dep}`, status: allDeps[dep] ? "pass" : "warn",
          detail: allDeps[dep] || "ausente",
        });
      }

      // Banned packages
      let hasBanned = false;
      for (const b of BANNED_PACKAGES) {
        if (allDeps[b]) {
          hasBanned = true;
          checks.push({ id: `pkg-banned-${b}`, category: "package.json", label: `Pacote banido: ${b}`, status: "fail", detail: "Deve ser removido" });
        }
      }
      if (!hasBanned) {
        checks.push({ id: "pkg-banned", category: "package.json", label: "Sem pacotes banidos", status: "pass" });
      }

      // Vite version
      const viteVer = allDeps["vite"];
      if (viteVer && /\^[1-4]\./.test(viteVer)) {
        checks.push({ id: "pkg-vite-ver", category: "package.json", label: "Vite ≥ 5.x", status: "fail", detail: `Versão ${viteVer} < 5.x` });
      } else if (viteVer) {
        checks.push({ id: "pkg-vite-ver", category: "package.json", label: "Vite ≥ 5.x", status: "pass", detail: viteVer });
      }

      // Build script
      if (pkg.scripts?.build?.includes("tsc &&")) {
        checks.push({ id: "pkg-build-script", category: "package.json", label: "Build script sem tsc &&", status: "fail", detail: "tsc && causa falha se houver erros TS" });
      } else if (pkg.scripts?.build) {
        checks.push({ id: "pkg-build-script", category: "package.json", label: "Build script presente", status: "pass" });
      } else {
        checks.push({ id: "pkg-build-script", category: "package.json", label: "Build script presente", status: "fail" });
      }
    } catch {
      checks.push({ id: "pkg-parse", category: "package.json", label: "JSON válido", status: "fail", detail: "Não foi possível parsear" });
    }
  }

  // ── 3. vite.config.ts ──
  const viteContent = fileMap.get("vite.config.ts");
  if (!viteContent) {
    checks.push({ id: "vite-exists", category: "vite.config.ts", label: "vite.config.ts presente", status: "warn", detail: "Será injetado pelo pipeline" });
  } else {
    checks.push({ id: "vite-exists", category: "vite.config.ts", label: "vite.config.ts presente", status: "pass" });
    if (viteContent.includes("@vitejs/plugin-react-swc")) {
      checks.push({ id: "vite-swc", category: "vite.config.ts", label: "Usa plugin-react-swc", status: "pass" });
    } else if (viteContent.includes("@vitejs/plugin-react")) {
      checks.push({ id: "vite-swc", category: "vite.config.ts", label: "Usa plugin-react-swc", status: "fail", detail: "Usa plugin-react em vez de -swc" });
    }
    checks.push({
      id: "vite-alias", category: "vite.config.ts",
      label: "Alias @ configurado",
      status: viteContent.includes("alias") ? "pass" : "warn",
    });
  }

  // ── 4. Cross-file Import Validation (Sprint 210) ──
  const importDetails: { filePath: string; brokenImports: string[] }[] = [];
  let totalBroken = 0;

  const sourceFiles = files.filter(f => f.filePath.match(/\.(ts|tsx|js|jsx)$/));
  for (const file of sourceFiles) {
    const result = validateFileImports(file.content, file.filePath, allPaths);
    if (!result.valid) {
      const broken = result.invalid.map(i => i.importPath);
      importDetails.push({ filePath: file.filePath, brokenImports: broken });
      totalBroken += broken.length;
    }
  }

  if (totalBroken === 0) {
    checks.push({ id: "imports-cross", category: "imports", label: "Imports cross-file válidos", status: "pass", detail: `${sourceFiles.length} arquivos verificados` });
  } else {
    checks.push({
      id: "imports-cross", category: "imports",
      label: "Imports cross-file válidos",
      status: "fail",
      detail: `${totalBroken} import(s) quebrado(s) em ${importDetails.length} arquivo(s)`,
    });
    for (const d of importDetails.slice(0, 5)) {
      issues.push(`${d.filePath}: imports quebrados → ${d.brokenImports.join(", ")}`);
    }
  }

  // ── 5. Environment Variables ──
  let processEnvCount = 0;
  for (const file of sourceFiles) {
    // Only check src/ files, not config files
    if (!file.filePath.startsWith("src/")) continue;
    const matches = file.content.match(/process\.env\./g);
    if (matches) processEnvCount += matches.length;
  }
  if (processEnvCount > 0) {
    checks.push({
      id: "env-process", category: "env_vars",
      label: "Sem process.env em src/",
      status: "fail",
      detail: `${processEnvCount} uso(s) de process.env — deve usar import.meta.env`,
    });
  } else {
    checks.push({ id: "env-process", category: "env_vars", label: "Sem process.env em src/", status: "pass" });
  }

  // ── 6. Basic Syntax Checks ──
  for (const file of sourceFiles) {
    if (!file.filePath.startsWith("src/")) continue;
    // Check for obviously broken syntax: unmatched braces
    const opens = (file.content.match(/\{/g) || []).length;
    const closes = (file.content.match(/\}/g) || []).length;
    if (Math.abs(opens - closes) > 2) {
      checks.push({
        id: `syntax-braces-${file.filePath}`, category: "general",
        label: `Sintaxe: ${file.filePath}`,
        status: "warn",
        detail: `Chaves desbalanceadas: { ${opens} vs } ${closes}`,
      });
    }
  }

  // ── Compute summary ──
  const passCount = checks.filter(c => c.status === "pass").length;
  const fixedCount = checks.filter(c => c.status === "fixed").length;
  const warnCount = checks.filter(c => c.status === "warn").length;
  const failCount = checks.filter(c => c.status === "fail").length;
  const total = checks.length;
  const score = total > 0 ? Math.round(((passCount + fixedCount) / total) * 100) : 0;

  return {
    checks,
    summary: { total, pass: passCount, fixed: fixedCount, warn: warnCount, fail: failCount, score },
    issues,
    importValidation: {
      filesChecked: sourceFiles.length,
      filesWithBrokenImports: importDetails.length,
      totalBrokenImports: totalBroken,
      details: importDetails,
    },
    deployable: failCount === 0,
  };
}
