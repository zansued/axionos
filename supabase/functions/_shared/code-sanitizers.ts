// Shared code sanitization and deterministic file overrides

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
        if (/[^a-zA-Z0-9@/_.-]/.test(name)) {
          delete deps[name];
          console.log(`[SANITIZE] package.json: removed invalid "${name}"`);
        }
      }
    }

    // Ensure ESM + scripts
    pkg.type = "module";
    if (!pkg.scripts) pkg.scripts = {};
    pkg.scripts.dev = "vite";
    pkg.scripts.build = "vite build";
    pkg.scripts.preview = "vite preview";

    // Ensure base deps
    const ensureDep = (name: string, version: string) => {
      if (!pkg.dependencies) pkg.dependencies = {};
      if (!pkg.dependencies[name] && !pkg.devDependencies?.[name]) {
        pkg.dependencies[name] = version;
      }
    };
    const forceDevDep = (name: string, version: string) => {
      if (!pkg.devDependencies) pkg.devDependencies = {};
      pkg.devDependencies[name] = version;
      if (pkg.dependencies?.[name]) delete pkg.dependencies[name];
    };

    ensureDep("react", "^18.3.1");
    ensureDep("react-dom", "^18.3.1");
    ensureDep("react-router-dom", "^6.30.0");
    ensureDep("lucide-react", "^0.462.0");
    ensureDep("tailwind-merge", "^2.6.0");
    ensureDep("clsx", "^2.1.1");
    ensureDep("class-variance-authority", "^0.7.1");

    // Force compatible Vite toolchain
    forceDevDep("vite", "^5.4.19");
    forceDevDep("@vitejs/plugin-react-swc", "^3.11.0");
    if (pkg.devDependencies?.["@vitejs/plugin-react"]) delete pkg.devDependencies["@vitejs/plugin-react"];
    if (pkg.dependencies?.["@vitejs/plugin-react"]) delete pkg.dependencies["@vitejs/plugin-react"];

    forceDevDep("typescript", "^5.8.3");
    forceDevDep("tailwindcss", "^3.4.17");
    forceDevDep("autoprefixer", "^10.4.21");
    forceDevDep("postcss", "^8.5.6");
    forceDevDep("@types/react", "^18.3.23");
    forceDevDep("@types/react-dom", "^18.3.7");

    // Force ESLint 9.x — v10 breaks peer deps with plugins
    forceDevDep("eslint", "^9.32.0");
    forceDevDep("eslint-plugin-react-hooks", "^5.2.0");
    forceDevDep("eslint-plugin-react-refresh", "^0.4.20");
    forceDevDep("@eslint/js", "^9.32.0");
    forceDevDep("typescript-eslint", "^8.38.0");

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
    ".nvmrc": "20.18.0",
    ".node-version": "20.18.0",
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

/** Curated registry of safe versions (React 18 + Vite 5 compatible) */
const SAFE_VERSIONS: Record<string, string> = {
  "sonner":                    "^1.7.4",
  "framer-motion":             "^11.3.0",
  "zod":                       "^3.23.8",
  "react-hook-form":           "^7.53.0",
  "@hookform/resolvers":       "^3.9.0",
  "date-fns":                  "^3.6.0",
  "recharts":                  "^2.13.3",
  "cmdk":                      "^1.0.0",
  "vaul":                      "^0.9.9",
  "next-themes":               "^0.3.0",
  "react-day-picker":          "^8.10.1",
  "embla-carousel-react":      "^8.3.0",
  "input-otp":                 "^1.4.1",
  "react-resizable-panels":    "^2.1.7",
  "zustand":                   "^4.5.5",
  "@dnd-kit/core":             "^6.1.0",
  "@dnd-kit/sortable":         "^8.0.0",
  "@dnd-kit/utilities":        "^3.2.2",
  "lucide-react":              "^0.462.0",
  "class-variance-authority":  "^0.7.1",
  "clsx":                      "^2.1.1",
  "tailwind-merge":            "^2.5.4",
  "tailwindcss-animate":       "^1.0.7",
  "@supabase/supabase-js":     "^2.98.0",
  "@tanstack/react-query":     "^5.83.0",
  "react-router-dom":          "^6.30.0",
};

/**
 * Auto-adds missing dependencies to package.json using a curated
 * safe-version registry. Returns the updated package.json string.
 */
export function autoFixMissingDependencies(
  packageJsonStr: string,
  missing: string[]
): string {
  let pkg: any = {};
  try { pkg = JSON.parse(packageJsonStr); } catch { return packageJsonStr; }
  if (!pkg.dependencies) pkg.dependencies = {};

  let anyAdded = false;
  for (const dep of missing) {
    const safeVersion = SAFE_VERSIONS[dep];
    if (safeVersion && !pkg.dependencies[dep]) {
      pkg.dependencies[dep] = safeVersion;
      console.log(`[auto-fix] Added missing dependency: ${dep}@${safeVersion}`);
      anyAdded = true;
    } else if (!safeVersion) {
      console.warn(`[auto-fix] Unknown package "${dep}" — skipping auto-add. Manual review needed.`);
    }
  }
  return anyAdded ? JSON.stringify(pkg, null, 2) : packageJsonStr;
}
