// Shared code sanitization and deterministic file overrides
// Sprint 214 — Full Dependency Auto-Fix integrated

import { CANONICAL_DEPS, BLOCKED_PACKAGES, BLOCKED_REPLACEMENTS, type CanonicalDepEntry } from "./canonical-deps.ts";

/** Vercel deploy configuration */
export const DEPLOY_VERCEL_CONFIG = {
  framework: "vite",
  installCommand: "npm install --include=dev --legacy-peer-deps",
  buildCommand: "npm run build",
  outputDirectory: "dist",
  rewrites: [{ source: "/(.*)", destination: "/index.html" }],
};

export const DEPLOY_VERCEL_JSON = JSON.stringify(DEPLOY_VERCEL_CONFIG, null, 2);

/** Packages that should never appear in generated package.json */
const INVALID_PACKAGES = new Set([
  "shadcn/ui", "shadcn-ui", "@shadcn/ui", "shadcn", "tailwindcss-animate/latest",
  "radix-ui", "@radix/ui", "lucide", "framer", "next-themes/latest",
  "@radix-ui/react-button", // does NOT exist on npm
]);

/** Valid @radix-ui/* packages on npm — anything else is removed */
const VALID_RADIX_PACKAGES = new Set([
  "@radix-ui/react-accordion", "@radix-ui/react-alert-dialog", "@radix-ui/react-aspect-ratio",
  "@radix-ui/react-avatar", "@radix-ui/react-checkbox", "@radix-ui/react-collapsible",
  "@radix-ui/react-context-menu", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-hover-card", "@radix-ui/react-label", "@radix-ui/react-menubar",
  "@radix-ui/react-navigation-menu", "@radix-ui/react-popover", "@radix-ui/react-progress",
  "@radix-ui/react-radio-group", "@radix-ui/react-scroll-area", "@radix-ui/react-select",
  "@radix-ui/react-separator", "@radix-ui/react-slider", "@radix-ui/react-slot",
  "@radix-ui/react-switch", "@radix-ui/react-tabs", "@radix-ui/react-toast",
  "@radix-ui/react-toggle", "@radix-ui/react-toggle-group", "@radix-ui/react-tooltip",
  "@radix-ui/react-primitive", "@radix-ui/react-presence", "@radix-ui/react-portal",
  "@radix-ui/react-compose-refs", "@radix-ui/react-id", "@radix-ui/react-use-callback-ref",
  "@radix-ui/react-use-controllable-state", "@radix-ui/react-use-escape-keydown",
  "@radix-ui/react-use-layout-effect", "@radix-ui/react-use-previous", "@radix-ui/react-use-rect",
  "@radix-ui/react-use-size", "@radix-ui/react-visually-hidden", "@radix-ui/react-direction",
  "@radix-ui/react-focus-scope", "@radix-ui/react-focus-guards", "@radix-ui/react-dismissable-layer",
  "@radix-ui/react-roving-focus", "@radix-ui/react-collection", "@radix-ui/react-form",
  "@radix-ui/react-arrow", "@radix-ui/react-popper",
]);

/**
 * Sprint 205 — Forbidden runtime packages.
 * These must be blocked during execution (worker), not just at publish time.
 * Exported so both worker and publish can reference them.
 */
export const FORBIDDEN_RUNTIME_PACKAGES = new Set([
  "@vitejs/plugin-react",   // must use plugin-react-swc
  "shadcn/ui",
  "shadcn-ui",
  "@shadcn/ui",
  "shadcn",
  "radix-ui",
  "@radix/ui",
]);

/** Package rename map (null = remove entirely) */
const PACKAGE_RENAMES: Record<string, string | null> = {
  "shadcn/ui": null,
  "shadcn-ui": null,
  "@shadcn/ui": null,
  "shadcn": null,
  "radix-ui": null,
  "@radix/ui": null,
  "lucide": "lucide-react",
  "@vitejs/plugin-react": "@vitejs/plugin-react-swc",
};

/** Sanitize a generated package.json to fix common AI mistakes */
export function sanitizePackageJson(content: string): string {
  try {
    const pkg = JSON.parse(content);

    // Fix dependencies/devDependencies names
    for (const depKey of ["dependencies", "devDependencies"]) {
      const deps = pkg[depKey];
      if (!deps || typeof deps !== "object") continue;
      for (const [name, ver] of Object.entries(deps)) {
        if (INVALID_PACKAGES.has(name) || name in PACKAGE_RENAMES) {
          const replacement = PACKAGE_RENAMES[name];
          delete deps[name];
          if (replacement) deps[replacement] = ver;
          console.log(`[SANITIZE] package.json: removed "${name}"${replacement ? ` → "${replacement}"` : ""}`);
          continue;
        }
        // Block non-existent @radix-ui/* packages
        if (name.startsWith("@radix-ui/") && !VALID_RADIX_PACKAGES.has(name)) {
          delete deps[name];
          console.log(`[SANITIZE] package.json: removed non-existent radix package "${name}"`);
          continue;
        }
        if (/[^a-zA-Z0-9@/_.-]/.test(name)) {
          delete deps[name];
          console.log(`[SANITIZE] package.json: removed invalid "${name}"`);
        }
      }
    }

    // ── Sprint 214: Blocked package auto-replacement ──
    for (const depKey of ["dependencies", "devDependencies"] as const) {
      const deps = pkg[depKey];
      if (!deps || typeof deps !== "object") continue;
      for (const name of Object.keys(deps)) {
        // Check BLOCKED_REPLACEMENTS first (auto-swap)
        if (BLOCKED_REPLACEMENTS[name]) {
          const repl = BLOCKED_REPLACEMENTS[name];
          delete deps[name];
          const targetKey = repl.dev ? "devDependencies" : "dependencies";
          if (!pkg[targetKey]) pkg[targetKey] = {};
          pkg[targetKey][repl.name] = repl.version;
          console.log(`[Sprint 214] Auto-replaced blocked "${name}" → "${repl.name}@${repl.version}"`);
        }
      }
    }

    // ── Sprint 214: Canonical version enforcement + devDep migration ──
    for (const [pkgName, entry] of Object.entries(CANONICAL_DEPS)) {
      const inDeps = pkg.dependencies?.[pkgName];
      const inDev = pkg.devDependencies?.[pkgName];
      const currentVer = inDeps || inDev;

      if (currentVer) {
        // Enforce preferred version
        const targetKey = entry.devOnly ? "devDependencies" : "dependencies";
        const wrongKey = entry.devOnly ? "dependencies" : "devDependencies";

        // Migrate to correct section
        if ((entry.devOnly && inDeps) || (!entry.devOnly && inDev && !inDeps)) {
          if (!pkg[targetKey]) pkg[targetKey] = {};
          pkg[targetKey][pkgName] = entry.preferred;
          if (pkg[wrongKey]?.[pkgName]) delete pkg[wrongKey][pkgName];
          console.log(`[Sprint 214] Migrated "${pkgName}" to ${targetKey} @ ${entry.preferred}`);
        } else {
          // Update version if below minimum
          pkg[targetKey][pkgName] = entry.preferred;
        }
      }
    }

    // Ensure ESM + scripts
    pkg.type = "module";
    pkg.engines = {
      ...(pkg.engines && typeof pkg.engines === "object" ? pkg.engines : {}),
      node: "24.x",
    };
    if (!pkg.scripts) pkg.scripts = {};
    pkg.scripts.dev = "vite";
    pkg.scripts.build = "vite build";
    pkg.scripts.preview = "vite preview";

    // ── Sprint 214: Ensure all canonical deps present ──
    for (const [pkgName, entry] of Object.entries(CANONICAL_DEPS)) {
      const targetKey = entry.devOnly ? "devDependencies" : "dependencies";
      if (!pkg[targetKey]) pkg[targetKey] = {};
      // Only force-add essential packages (runtime deps that are part of the core stack)
      if (!entry.devOnly && !pkg.dependencies?.[pkgName] && !pkg.devDependencies?.[pkgName]) {
        // Don't auto-add optional runtime deps — only the core ones
        continue;
      }
      // But always ensure devDeps are present for toolchain
      if (entry.devOnly && !pkg.devDependencies?.[pkgName]) {
        pkg.devDependencies[pkgName] = entry.preferred;
      }
    }

    // Remove legacy plugin if still present
    if (pkg.devDependencies?.["@vitejs/plugin-react"]) delete pkg.devDependencies["@vitejs/plugin-react"];
    if (pkg.dependencies?.["@vitejs/plugin-react"]) delete pkg.dependencies["@vitejs/plugin-react"];

    return JSON.stringify(pkg, null, 2);
  } catch {
    return content;
  }
}

/** Pre-built deterministic file overrides (no Supabase conn info) */
export const DETERMINISTIC_FILES: Record<string, string> = getDeterministicFiles();

/** Get deterministic file overrides for deploy-critical files */
export function getDeterministicFiles(supabaseConnInfo?: { url: string; anonKey: string } | null): Record<string, string> {
  return {
    "vercel.json": DEPLOY_VERCEL_JSON,
    ".nvmrc": "24",
    ".node-version": "24",
    "public/_redirects": "/* /index.html 200",
    "netlify.toml": '[build]\n  command = "npm run build"\n  publish = "dist"\n\n[[redirects]]\n  from = "/*"\n  to = "/index.html"\n  status = 200',
    "postcss.config.js": `export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};`,
    "tailwind.config.js": `/** @type {import('tailwindcss').Config} */\nexport default {\n  content: [\n    "./index.html",\n    "./src/**/*.{js,ts,jsx,tsx}",\n  ],\n  theme: {\n    extend: {},\n  },\n  plugins: [],\n};`,
    "tsconfig.node.json": JSON.stringify({
      compilerOptions: {
        composite: true, target: "ES2022", lib: ["ES2023"], module: "ESNext",
        skipLibCheck: true, moduleResolution: "bundler", allowImportingTsExtensions: true,
        isolatedModules: true, moduleDetection: "force", strict: true,
        noUnusedLocals: false, noUnusedParameters: false, noFallthroughCasesInSwitch: true,
      },
      include: ["vite.config.ts"],
    }, null, 2),
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        target: "ES2020", useDefineForClassFields: true, lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext", skipLibCheck: true, moduleResolution: "bundler",
        allowImportingTsExtensions: true, resolveJsonModule: true, isolatedModules: true,
        noEmit: true, jsx: "react-jsx", strict: false,
        noUnusedLocals: false, noUnusedParameters: false, paths: { "@/*": ["./src/*"] },
      },
      include: ["src"],
      references: [{ path: "./tsconfig.node.json" }],
    }, null, 2),
    "tsconfig.app.json": JSON.stringify({
      compilerOptions: {
        target: "ES2020", useDefineForClassFields: true, lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext", skipLibCheck: true, moduleResolution: "bundler",
        allowImportingTsExtensions: true, resolveJsonModule: true, isolatedModules: true,
        noEmit: true, jsx: "react-jsx", strict: false,
        noUnusedLocals: false, noUnusedParameters: false, paths: { "@/*": ["./src/*"] },
      },
      include: ["src"],
    }, null, 2),
    "vite.config.ts": `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react-swc";\nimport path from "path";\n\nexport default defineConfig({\n  plugins: [react()],\n  resolve: {\n    alias: {\n      "@": path.resolve(__dirname, "./src"),\n    },\n  },\n});`,
    "index.html": `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>App</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="./src/main.tsx"></script>\n  </body>\n</html>`,
    "eslint.config.js": `import js from "@eslint/js";\nimport globals from "globals";\nimport reactHooks from "eslint-plugin-react-hooks";\nimport reactRefresh from "eslint-plugin-react-refresh";\nimport tseslint from "typescript-eslint";\n\nexport default tseslint.config(\n  { ignores: ["dist", "node_modules"] },\n  {\n    extends: [js.configs.recommended, ...tseslint.configs.recommended],\n    files: ["**/*.{ts,tsx}"],\n    languageOptions: {\n      ecmaVersion: 2020,\n      globals: globals.browser,\n    },\n    plugins: {\n      "react-hooks": reactHooks,\n      "react-refresh": reactRefresh,\n    },\n    rules: {\n      ...reactHooks.configs.recommended.rules,\n      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],\n      "@typescript-eslint/no-explicit-any": "warn",\n      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],\n    },\n  }\n);`,
    ".env.example": supabaseConnInfo
      ? `VITE_SUPABASE_URL=${supabaseConnInfo.url}\nVITE_SUPABASE_ANON_KEY=${supabaseConnInfo.anonKey}`
      : `VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-key`,
    "src/lib/supabase.ts": `import { createClient } from '@supabase/supabase-js';\n\nconst supabaseUrl = import.meta.env.VITE_SUPABASE_URL;\nconst supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;\n\nif (!supabaseUrl || !supabaseAnonKey) {\n  throw new Error('Missing Supabase environment variables. Check .env file.');\n}\n\nexport const supabase = createClient(supabaseUrl, supabaseAnonKey);`,
    "src/main.tsx": `import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App";\nimport "./index.css";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);`,
    "src/App.tsx": `import React from "react";\n\nfunction App() {\n  return (\n    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">\n      <div className="text-center space-y-4">\n        <h1 className="text-4xl font-bold">App</h1>\n        <p className="text-muted-foreground">Projeto inicializado com sucesso.</p>\n      </div>\n    </div>\n  );\n}\n\nexport default App;`,
    "src/index.css": `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  --background: 0 0% 100%;\n  --foreground: 222.2 84% 4.9%;\n  --muted: 210 40% 96%;\n  --muted-foreground: 215.4 16.3% 46.9%;\n}\n\nbody {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n}`,
  };
}

/** Get post-processors map for generated files */
export function getPostProcessors(): Record<string, (content: string) => string> {
  return {
    "package.json": sanitizePackageJson,
  };
}

/** Strip markdown code fences from AI-generated code */
export function stripCodeFences(content: string): string {
  return content.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();
}

/** Valid agent roles enum values */
export const VALID_AGENT_ROLES = [
  "analyst", "pm", "architect", "sm", "po", "dev", "qa", "devops", "ux_expert", "aios_master", "aios_orchestrator",
];

/** Role alias mapping for normalizing AI-generated role names */
export const ROLE_ALIASES: Record<string, string> = {
  developer: "dev", backend: "dev", frontend: "dev", fullstack: "dev", engineer: "dev",
  "software engineer": "dev", "full-stack": "dev", "back-end": "dev", "front-end": "dev",
  product_manager: "pm", "product manager": "pm", product_owner: "po", "product owner": "po",
  scrum_master: "sm", "scrum master": "sm", "tech lead": "architect", "tech_lead": "architect",
  designer: "ux_expert", ux: "ux_expert", ui: "ux_expert", "ux/ui": "ux_expert", "ui/ux": "ux_expert",
  "ux designer": "ux_expert", "ui designer": "ux_expert",
  tester: "qa", quality: "qa", "quality assurance": "qa", testing: "qa",
  infrastructure: "devops", ops: "devops", "dev ops": "devops", sre: "devops",
  analysis: "analyst", business_analyst: "analyst", "business analyst": "analyst",
  master: "sm", orchestrator: "aios_orchestrator",
};

/** Normalize an AI-generated role to a valid enum value */
export function normalizeRole(role: string): string {
  const lower = (role || "").toLowerCase().trim();
  if (VALID_AGENT_ROLES.includes(lower)) return lower;
  return ROLE_ALIASES[lower] || "dev";
}

/**
 * Scans all source files for import statements and cross-references
 * against package.json dependencies. Returns missing packages.
 */
export function detectMissingDependencies(
  files: Array<{ path: string; content: string }>,
  packageJson: string
): { missing: string[]; packageJson: object } {
  let pkg: any = {};
  try { pkg = JSON.parse(packageJson); } catch { return { missing: [], packageJson: {} }; }
  const allDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };

  const importedPackages = new Set<string>();
  const importRegex = /from\s+['"]([^./][^'"]*)['"]/g;
  for (const file of files) {
    if (!file.path.match(/\.(ts|tsx|js|jsx)$/)) continue;
    let match;
    while ((match = importRegex.exec(file.content)) !== null) {
      const pkgName = match[1].startsWith("@")
        ? match[1].split("/").slice(0, 2).join("/")
        : match[1].split("/")[0];
      importedPackages.add(pkgName);
    }
  }

  const builtins = new Set([
    "react", "react-dom", "path", "fs", "os", "crypto", "url",
    "stream", "buffer", "events", "util", "http", "https",
    "node:path", "node:fs", "node:os", "node:crypto",
    "virtual:*", "vite/client",
  ]);

  const missing: string[] = [];
  for (const depName of importedPackages) {
    if (!builtins.has(depName) && !allDeps[depName]) {
      missing.push(depName);
    }
  }

  return { missing, packageJson: pkg };
}

// ═══════════════════════════════════════════════════════════════════
// Sprint 210 — Import Validation Pre-Commit (Build Gate)
// ═══════════════════════════════════════════════════════════════════

export interface InvalidImport {
  /** The raw import path from the source */
  importPath: string;
  /** Line number (1-based) where the import was found */
  line: number;
  /** The full import statement */
  statement: string;
  /** Why it's invalid */
  reason: "file_not_in_manifest" | "circular_self_import";
}

export interface ImportValidationResult {
  valid: boolean;
  invalid: InvalidImport[];
  /** Code with broken imports stripped (and their dependent identifiers removed) */
  sanitizedCode: string;
  /** Human-readable log of what was removed */
  removalLog: string[];
}

/**
 * Sprint 210: Validate all relative/alias imports in generated code against
 * the file manifest (list of all planned + already-generated file paths).
 *
 * If broken imports are found, they are stripped from the code along with
 * any JSX/code that references the imported identifiers.
 */
export function validateFileImports(
  code: string,
  currentFilePath: string,
  manifestPaths: string[],
): ImportValidationResult {
  const lines = code.split("\n");
  const importRegex = /^import\s+(?:(?:\{[^}]*\}|[\w*]+(?:\s*,\s*\{[^}]*\})?)\s+from\s+)?["']([^"']+)["'];?\s*$/;
  const sideEffectRegex = /^import\s+["']([^"']+)["'];?\s*$/;

  // Build a lookup set with common extensions resolved
  const manifestSet = new Set<string>();
  for (const p of manifestPaths) {
    manifestSet.add(p);
    // Also add without extension for matching
    const noExt = p.replace(/\.(ts|tsx|js|jsx|css|json|sql)$/, "");
    manifestSet.add(noExt);
  }

  const invalid: InvalidImport[] = [];
  const brokenIdentifiers = new Set<string>();
  const linesToRemove = new Set<number>();
  const removalLog: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const match = trimmed.match(importRegex) || trimmed.match(sideEffectRegex);
    if (!match) continue;

    const importPath = match[1];

    // Only validate relative (./ ../) and alias (@/) imports
    if (!importPath.startsWith(".") && !importPath.startsWith("@/")) continue;

    // Resolve to a project-relative path
    let resolved: string;
    if (importPath.startsWith("@/")) {
      resolved = "src/" + importPath.slice(2);
    } else {
      // Resolve relative to current file's directory
      const currentDir = currentFilePath.includes("/")
        ? currentFilePath.substring(0, currentFilePath.lastIndexOf("/"))
        : "";
      const parts = currentDir.split("/").filter(Boolean);
      for (const segment of importPath.split("/")) {
        if (segment === "..") parts.pop();
        else if (segment !== ".") parts.push(segment);
      }
      resolved = parts.join("/");
    }

    // Self-import check
    const currentNoExt = currentFilePath.replace(/\.(ts|tsx|js|jsx)$/, "");
    const resolvedNoExt = resolved.replace(/\.(ts|tsx|js|jsx)$/, "");
    if (resolvedNoExt === currentNoExt) {
      invalid.push({ importPath, line: i + 1, statement: trimmed, reason: "circular_self_import" });
      linesToRemove.add(i);
      extractIdentifiers(trimmed, brokenIdentifiers);
      removalLog.push(`[Sprint 210] L${i + 1}: Removed self-import "${importPath}"`);
      continue;
    }

    // Check against manifest (try with common extensions)
    const candidates = [
      resolved,
      `${resolved}.ts`, `${resolved}.tsx`, `${resolved}.js`, `${resolved}.jsx`,
      `${resolved}/index.ts`, `${resolved}/index.tsx`, `${resolved}/index.js`,
      `${resolved}.css`, `${resolved}.json`,
    ];
    const found = candidates.some(c => manifestSet.has(c));

    if (!found && manifestPaths.length > 0) {
      invalid.push({ importPath, line: i + 1, statement: trimmed, reason: "file_not_in_manifest" });
      linesToRemove.add(i);
      extractIdentifiers(trimmed, brokenIdentifiers);
      removalLog.push(`[Sprint 210] L${i + 1}: Removed broken import "${importPath}" (not in manifest of ${manifestPaths.length} files)`);
    }
  }

  if (invalid.length === 0) {
    return { valid: true, invalid: [], sanitizedCode: code, removalLog: [] };
  }

  // Remove broken import lines
  let sanitizedLines = lines.filter((_, i) => !linesToRemove.has(i));

  // Remove JSX references to broken identifiers (simple heuristic)
  if (brokenIdentifiers.size > 0) {
    const identPattern = new RegExp(
      `<(${[...brokenIdentifiers].join("|")})\\b[^>]*/?>|<(${[...brokenIdentifiers].join("|")})\\b[^>]*>.*?</(${[...brokenIdentifiers].join("|")})>`,
      "g"
    );
    const before = sanitizedLines.join("\n");
    const after = before.replace(identPattern, (m) => {
      removalLog.push(`[Sprint 210] Removed JSX usage of broken import: ${m.slice(0, 60)}...`);
      return `{/* Sprint 210: removed broken component */}`;
    });
    sanitizedLines = after.split("\n");
  }

  return {
    valid: false,
    invalid,
    sanitizedCode: sanitizedLines.join("\n"),
    removalLog,
  };
}

/** Extract imported identifiers from an import statement */
function extractIdentifiers(statement: string, out: Set<string>): void {
  // Default import: import Foo from '...'
  const defaultMatch = statement.match(/^import\s+(\w+)\s/);
  if (defaultMatch) out.add(defaultMatch[1]);

  // Named imports: import { Foo, Bar as Baz } from '...'
  const namedMatch = statement.match(/\{([^}]+)\}/);
  if (namedMatch) {
    for (const part of namedMatch[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name && /^[A-Z]/.test(name)) out.add(name); // Only track PascalCase (components)
    }
  }

  // Namespace: import * as Foo from '...'
  const nsMatch = statement.match(/\*\s+as\s+(\w+)/);
  if (nsMatch) out.add(nsMatch[1]);
}

/**
 * Sprint 214: Auto-adds missing dependencies using CANONICAL_DEPS as
 * the single source of truth, with SAFE_VERSIONS as fallback for
 * packages not in the canonical registry.
 */
const SAFE_VERSIONS_FALLBACK: Record<string, string> = {
  "sonner":                    "^1.7.4",
  "cmdk":                      "^1.0.0",
  "vaul":                      "^0.9.9",
  "next-themes":               "^0.3.0",
  "react-day-picker":          "^8.10.1",
  "embla-carousel-react":      "^8.3.0",
  "input-otp":                 "^1.4.1",
  "react-resizable-panels":    "^2.1.7",
  "@dnd-kit/core":             "^6.1.0",
  "@dnd-kit/sortable":         "^8.0.0",
  "@dnd-kit/utilities":        "^3.2.2",
  "tailwindcss-animate":       "^1.0.7",
  "@supabase/supabase-js":     "^2.98.0",
  "@tanstack/react-query":     "^5.83.0",
};

export function autoFixMissingDependencies(
  packageJsonStr: string,
  missing: string[]
): string {
  let pkg: any = {};
  try { pkg = JSON.parse(packageJsonStr); } catch { return packageJsonStr; }
  if (!pkg.dependencies) pkg.dependencies = {};

  let anyAdded = false;
  for (const dep of missing) {
    // 1. Check canonical registry first
    const canonical = CANONICAL_DEPS[dep];
    if (canonical) {
      const targetKey = canonical.devOnly ? "devDependencies" : "dependencies";
      if (!pkg[targetKey]) pkg[targetKey] = {};
      if (!pkg[targetKey][dep]) {
        pkg[targetKey][dep] = canonical.preferred;
        console.log(`[Sprint 214] Added missing dep from canonical: ${dep}@${canonical.preferred}`);
        anyAdded = true;
      }
      continue;
    }
    // 2. Fallback to safe versions
    const safeVersion = SAFE_VERSIONS_FALLBACK[dep];
    if (safeVersion && !pkg.dependencies[dep]) {
      pkg.dependencies[dep] = safeVersion;
      console.log(`[Sprint 214] Added missing dep from fallback: ${dep}@${safeVersion}`);
      anyAdded = true;
    } else if (!safeVersion) {
      console.warn(`[Sprint 214] Unknown package "${dep}" — skipping. Manual review needed.`);
    }
  }
  return anyAdded ? JSON.stringify(pkg, null, 2) : packageJsonStr;
}
