// Shared code sanitization and deterministic file overrides

/** Vercel deploy configuration */
export const DEPLOY_VERCEL_CONFIG = {
  framework: "vite",
  installCommand: "rm -f package-lock.json && npm install --include=dev",
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

    return JSON.stringify(pkg, null, 2);
  } catch {
    return content;
  }
}

/** Get deterministic file overrides for deploy-critical files */
export function getDeterministicFiles(supabaseConnInfo?: { url: string; anonKey: string } | null): Record<string, string> {
  return {
    "vercel.json": DEPLOY_VERCEL_JSON,
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
