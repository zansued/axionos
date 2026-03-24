/**
 * Sprint 215 — E2E Tests for Pipeline Engine (Sprints 210–214)
 * 
 * Validates that import validation, build health checks, prompt guardrails,
 * and dependency auto-fix work correctly together.
 */

import { assertEquals, assertStringIncludes, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Import modules under test
import { validateFileImports, sanitizePackageJson, autoFixMissingDependencies } from "../_shared/code-sanitizers.ts";
import { validateBuildHealth, type FileArtifact } from "../_shared/build-health-validator.ts";
import { validateGuardrails, composeGuardrails, buildManifestGuardrail } from "../_shared/prompt-guardrails.ts";

// ═══════════════════════════════════════════════════════════════
// Sprint 210 — validateFileImports
// ═══════════════════════════════════════════════════════════════

Deno.test("S210: valid imports pass validation", () => {
  const code = `import { Button } from "@/components/ui/button";\nimport { cn } from "@/lib/utils";\n`;
  const manifest = ["src/components/ui/button.tsx", "src/lib/utils.ts"];
  const result = validateFileImports(code, "src/pages/Home.tsx", manifest);
  assertEquals(result.valid, true);
  assertEquals(result.invalid.length, 0);
});

Deno.test("S210: broken import detected and removed", () => {
  const code = `import { Button } from "@/components/ui/button";\nimport { Ghost } from "@/components/GhostComponent";\n\nexport default function Page() { return <div><Button /></div>; }`;
  const manifest = ["src/components/ui/button.tsx"];
  const result = validateFileImports(code, "src/pages/Home.tsx", manifest);
  assertEquals(result.valid, false);
  assertEquals(result.invalid.length, 1);
  assertEquals(result.invalid[0].importPath, "@/components/GhostComponent");
  assert(!result.sanitizedCode.includes("GhostComponent"));
});

Deno.test("S210: self-import is removed", () => {
  const code = `import { MyComp } from "./MyComp";\nexport default function MyComp() { return <div />; }`;
  const manifest = ["src/components/MyComp.tsx"];
  const result = validateFileImports(code, "src/components/MyComp.tsx", manifest);
  assertEquals(result.valid, false);
  assert(result.invalid.some(i => i.reason === "circular_self_import"));
});

Deno.test("S210: npm packages are NOT flagged", () => {
  const code = `import { format } from "date-fns";\nimport React from "react";\n`;
  const manifest = ["src/main.tsx"];
  const result = validateFileImports(code, "src/main.tsx", manifest);
  assertEquals(result.valid, true);
});

// ═══════════════════════════════════════════════════════════════
// Sprint 211 — validateBuildHealth
// ═══════════════════════════════════════════════════════════════

Deno.test("S211: minimal valid project is deployable", () => {
  const files: FileArtifact[] = [
    { filePath: "index.html", content: `<!DOCTYPE html><html><head></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>` },
    { filePath: "src/main.tsx", content: `import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App";\nReactDOM.createRoot(document.getElementById("root")!).render(<App />);` },
    { filePath: "src/App.tsx", content: `export default function App() { return <div>Hello</div>; }` },
    { filePath: "package.json", content: JSON.stringify({ name: "test", scripts: { build: "vite build", dev: "vite" }, dependencies: { react: "^18.3.1", "react-dom": "^18.3.1" }, devDependencies: { vite: "^5.4.0", "@vitejs/plugin-react-swc": "^3.11.0", typescript: "^5.8.0" } }) },
    { filePath: "vite.config.ts", content: `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react-swc";\nexport default defineConfig({ plugins: [react()] });` },
  ];
  const report = validateBuildHealth(files);
  assertEquals(report.deployable, true, `Should be deployable. Fails: ${report.checks.filter(c => c.status === "fail").map(c => c.id + ": " + (c.detail || c.label)).join(", ")}`);
  assert(report.summary.score >= 80);
});

Deno.test("S211: missing index.html fails build check", () => {
  const files: FileArtifact[] = [
    { filePath: "src/main.tsx", content: `import React from "react";` },
    { filePath: "package.json", content: JSON.stringify({ name: "test", dependencies: { react: "^18.3.1" } }) },
  ];
  const report = validateBuildHealth(files);
  assertEquals(report.deployable, false);
  assert(report.checks.some(c => c.id.includes("entry") && c.status === "fail"));
});

Deno.test("S211: banned package detected", () => {
  const files: FileArtifact[] = [
    { filePath: "index.html", content: `<!DOCTYPE html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>` },
    { filePath: "src/main.tsx", content: `import React from "react";` },
    { filePath: "package.json", content: JSON.stringify({ name: "test", dependencies: { react: "^18.3.1", "shadcn/ui": "latest" }, devDependencies: { vite: "^5.4.0", "@vitejs/plugin-react-swc": "^3.0.0", typescript: "^5.0.0" } }) },
  ];
  const report = validateBuildHealth(files);
  assert(report.checks.some(c => c.status === "fail" && c.id.includes("shadcn")));
});

// ═══════════════════════════════════════════════════════════════
// Sprint 213 — Prompt Guardrails
// ═══════════════════════════════════════════════════════════════

Deno.test("S213: process.env auto-fixed to import.meta.env", () => {
  const code = `const url = process.env.VITE_SUPABASE_URL;\nconst mode = process.env.NODE_ENV;`;
  const result = validateGuardrails(code, "src/lib/config.ts");
  assertEquals(result.wasFixed, true);
  assertStringIncludes(result.fixedCode, "import.meta.env.VITE_SUPABASE_URL");
  assertStringIncludes(result.fixedCode, "import.meta.env.MODE");
  assert(result.violations.some(v => v.rule === "no-process-env"));
});

Deno.test("S213: lucide auto-fixed to lucide-react", () => {
  const code = `import { ArrowRight } from "lucide";`;
  const result = validateGuardrails(code, "src/components/Icon.tsx");
  assertEquals(result.wasFixed, true);
  assertStringIncludes(result.fixedCode, 'from "lucide-react"');
});

Deno.test("S213: require() detected as violation", () => {
  const code = `const fs = require("fs");`;
  const result = validateGuardrails(code, "src/lib/file.ts");
  assert(result.violations.some(v => v.rule === "no-require"));
});

Deno.test("S213: module.exports detected as violation", () => {
  const code = `module.exports = { foo: true };`;
  const result = validateGuardrails(code, "src/lib/config.ts");
  assert(result.violations.some(v => v.rule === "no-commonjs-exports"));
});

Deno.test("S213: shadcn direct import detected", () => {
  const code = `import { Button } from "shadcn/ui";`;
  const result = validateGuardrails(code, "src/components/Test.tsx");
  assert(result.violations.some(v => v.rule === "no-shadcn-direct-import"));
});

Deno.test("S213: clean code has no violations", () => {
  const code = `import { Button } from "@/components/ui/button";\nimport { ArrowRight } from "lucide-react";\n\nconst url = import.meta.env.VITE_SUPABASE_URL;`;
  const result = validateGuardrails(code, "src/pages/Home.tsx");
  assertEquals(result.violations.length, 0);
  assertEquals(result.wasFixed, false);
});

Deno.test("S213: composeGuardrails includes backend rules when flagged", () => {
  const block = composeGuardrails({ isBackend: true, manifestPaths: ["src/main.tsx"] });
  assertStringIncludes(block, "Edge Functions");
  assertStringIncludes(block, "src/main.tsx");
});

Deno.test("S213: buildManifestGuardrail returns empty for no paths", () => {
  assertEquals(buildManifestGuardrail([]), "");
});

// ═══════════════════════════════════════════════════════════════
// Sprint 214 — sanitizePackageJson & autoFixMissingDependencies
// ═══════════════════════════════════════════════════════════════

Deno.test("S214: shadcn/ui removed from package.json", () => {
  const input = JSON.stringify({ dependencies: { react: "^18.3.1", "shadcn/ui": "latest" } });
  const output = sanitizePackageJson(input);
  const pkg = JSON.parse(output);
  assertEquals(pkg.dependencies["shadcn/ui"], undefined);
});

Deno.test("S214: lucide renamed to lucide-react", () => {
  const input = JSON.stringify({ dependencies: { lucide: "^0.400.0" } });
  const output = sanitizePackageJson(input);
  const pkg = JSON.parse(output);
  assertEquals(pkg.dependencies["lucide"], undefined);
  assert(pkg.dependencies["lucide-react"] !== undefined);
});

Deno.test("S214: @vitejs/plugin-react renamed to swc", () => {
  const input = JSON.stringify({ devDependencies: { "@vitejs/plugin-react": "^4.0.0" } });
  const output = sanitizePackageJson(input);
  const pkg = JSON.parse(output);
  assertEquals(pkg.devDependencies["@vitejs/plugin-react"], undefined);
  assert(pkg.devDependencies["@vitejs/plugin-react-swc"] !== undefined);
});

Deno.test("S214: autoFixMissingDependencies adds from canonical", () => {
  const input = JSON.stringify({ dependencies: { react: "^18.3.1" } });
  const output = autoFixMissingDependencies(input, ["sonner"]);
  const pkg = JSON.parse(output);
  assert(pkg.dependencies["sonner"] !== undefined);
});

Deno.test("S214: autoFixMissingDependencies skips unknown packages", () => {
  const input = JSON.stringify({ dependencies: { react: "^18.3.1" } });
  const output = autoFixMissingDependencies(input, ["totally-fake-pkg-xyz"]);
  assertEquals(output, input); // no change
});

// ═══════════════════════════════════════════════════════════════
// E2E Integration — Full pipeline scenario
// ═══════════════════════════════════════════════════════════════

Deno.test("E2E: generated code with multiple issues gets fully sanitized", () => {
  // Simulates AI-generated code with common mistakes
  const badCode = `
import { Button } from "@/components/ui/button";
import { Ghost } from "@/components/GhostWidget";
import { ArrowRight } from "lucide";

const apiUrl = process.env.VITE_API_URL;
const mode = process.env.NODE_ENV;

export default function Page() {
  return (
    <div>
      <Button>Click</Button>
      <Ghost />
      <ArrowRight />
    </div>
  );
}`;

  const manifest = [
    "src/components/ui/button.tsx",
    "src/pages/Page.tsx",
  ];

  // Step 1: Guardrails auto-fix (Sprint 213)
  const guardrailResult = validateGuardrails(badCode, "src/pages/Page.tsx");
  assert(guardrailResult.wasFixed, "Should auto-fix process.env and lucide");
  assertStringIncludes(guardrailResult.fixedCode, "import.meta.env.VITE_API_URL");
  assertStringIncludes(guardrailResult.fixedCode, "import.meta.env.MODE");
  assertStringIncludes(guardrailResult.fixedCode, 'from "lucide-react"');

  // Step 2: Import validation (Sprint 210)
  const importResult = validateFileImports(guardrailResult.fixedCode, "src/pages/Page.tsx", manifest);
  assertEquals(importResult.valid, false);
  assert(importResult.invalid.some(i => i.importPath === "@/components/GhostWidget"));
  assert(!importResult.sanitizedCode.includes("GhostWidget"));

  // Step 3: Verify final code is clean
  const finalGuardrails = validateGuardrails(importResult.sanitizedCode, "src/pages/Page.tsx");
  // lucide should already be fixed, process.env should already be fixed
  const remainingErrors = finalGuardrails.violations.filter(v => v.severity === "error" && !v.autoFixable);
  assertEquals(remainingErrors.length, 0, "No non-fixable errors should remain");
});

Deno.test("E2E: bad package.json gets sanitized then passes build check", () => {
  const badPkgJson = JSON.stringify({
    name: "my-app",
    dependencies: {
      react: "^18.3.1",
      "react-dom": "^18.3.1",
      "shadcn/ui": "latest",
      lucide: "^0.400.0",
    },
    devDependencies: {
      "@vitejs/plugin-react": "^4.0.0",
      typescript: "^5.8.0",
    },
  });

  // Step 1: Sanitize (Sprint 214)
  const sanitized = sanitizePackageJson(badPkgJson);
  const pkg = JSON.parse(sanitized);

  // Verify sanitization
  assertEquals(pkg.dependencies["shadcn/ui"], undefined);
  assertEquals(pkg.dependencies["lucide"], undefined);
  assert(pkg.dependencies["lucide-react"] !== undefined);
  assertEquals(pkg.devDependencies["@vitejs/plugin-react"], undefined);
  assert(pkg.devDependencies["@vitejs/plugin-react-swc"] !== undefined);

  // Step 2: Build check with sanitized pkg (Sprint 211)
  const files: FileArtifact[] = [
    { filePath: "index.html", content: `<!DOCTYPE html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>` },
    { filePath: "src/main.tsx", content: `import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App";\nReactDOM.createRoot(document.getElementById("root")!).render(<App />);` },
    { filePath: "src/App.tsx", content: `export default function App() { return <div>Hello</div>; }` },
    { filePath: "package.json", content: sanitized },
    { filePath: "vite.config.ts", content: `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react-swc";\nexport default defineConfig({ plugins: [react()] });` },
  ];

  const report = validateBuildHealth(files);
  assertEquals(report.deployable, true, `Build should be deployable. Failures: ${report.checks.filter(c => c.status === "fail").map(c => c.label).join(", ")}`);
});
