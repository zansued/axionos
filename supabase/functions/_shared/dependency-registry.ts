/**
 * AxionOS Canonical Dependency Registry
 *
 * Single source of truth for all npm dependency versions used in generated projects.
 * Uses EXACT versions (no ^ or ~) to eliminate dependency drift across pipeline runs.
 *
 * Rationale: systems like Google Bazel, Meta Buck, and Uber Piranha all enforce
 * deterministic dependency graphs. AxionOS must do the same.
 *
 * Update policy:
 *   - Versions here are tested and known-good.
 *   - Do NOT use ^ or ~ here. Exact versions only.
 *   - To upgrade a package: bump the version, run a test pipeline, confirm CI passes.
 *   - Deprecated packages must be removed — do not leave them commented out.
 *
 * Last audited: 2026-03-10
 */

export interface RegistryEntry {
  version: string;      // Exact version (no ^ or ~)
  dev: boolean;         // true = devDependency
  reason?: string;      // Why this package is in the registry
}

/**
 * The canonical registry. All generated projects use these exact versions.
 * pipeline-publish reads from here — never from AI-generated versions.
 */
export const DEPENDENCY_REGISTRY: Record<string, RegistryEntry> = {

  // ── Core React ────────────────────────────────────────────────────────────
  "react":                        { version: "18.3.1",    dev: false, reason: "Core UI library" },
  "react-dom":                    { version: "18.3.1",    dev: false, reason: "React DOM renderer" },
  "react-router-dom":             { version: "6.30.1",    dev: false, reason: "SPA routing" },

  // ── UI / Design ───────────────────────────────────────────────────────────
  "lucide-react":                 { version: "0.462.0",   dev: false, reason: "Icon library" },
  "tailwind-merge":               { version: "2.6.0",     dev: false, reason: "Tailwind class merging" },
  "clsx":                         { version: "2.1.1",     dev: false, reason: "Conditional class names" },
  "class-variance-authority":     { version: "0.7.1",     dev: false, reason: "CVA for compound variants" },
  "sonner":                       { version: "1.7.4",     dev: false, reason: "Toast notifications" },
  "framer-motion":                { version: "12.0.0",    dev: false, reason: "Animation library" },
  "next-themes":                  { version: "0.3.0",     dev: false, reason: "Theme switching" },
  "vaul":                         { version: "0.9.9",     dev: false, reason: "Drawer / sheet component" },
  "cmdk":                         { version: "1.0.4",     dev: false, reason: "Command palette" },
  "embla-carousel-react":         { version: "8.6.0",     dev: false, reason: "Carousel" },
  "input-otp":                    { version: "1.4.2",     dev: false, reason: "OTP input" },
  "react-resizable-panels":       { version: "2.1.9",     dev: false, reason: "Resizable layout panels" },
  "react-day-picker":             { version: "8.10.1",    dev: false, reason: "Date picker" },

  // ── Radix UI ──────────────────────────────────────────────────────────────
  "@radix-ui/react-accordion":    { version: "1.2.11",    dev: false },
  "@radix-ui/react-alert-dialog": { version: "1.1.14",    dev: false },
  "@radix-ui/react-avatar":       { version: "1.1.10",    dev: false },
  "@radix-ui/react-checkbox":     { version: "1.3.2",     dev: false },
  "@radix-ui/react-collapsible":  { version: "1.1.11",    dev: false },
  "@radix-ui/react-context-menu": { version: "2.2.15",    dev: false },
  "@radix-ui/react-dialog":       { version: "1.1.14",    dev: false },
  "@radix-ui/react-dropdown-menu":{ version: "2.1.15",    dev: false },
  "@radix-ui/react-hover-card":   { version: "1.1.14",    dev: false },
  "@radix-ui/react-label":        { version: "2.1.7",     dev: false },
  "@radix-ui/react-navigation-menu":{"version":"1.2.13",  dev: false },
  "@radix-ui/react-popover":      { version: "1.1.14",    dev: false },
  "@radix-ui/react-progress":     { version: "1.1.7",     dev: false },
  "@radix-ui/react-radio-group":  { version: "1.3.7",     dev: false },
  "@radix-ui/react-scroll-area":  { version: "1.2.9",     dev: false },
  "@radix-ui/react-select":       { version: "2.2.5",     dev: false },
  "@radix-ui/react-slider":       { version: "1.3.5",     dev: false },
  "@radix-ui/react-slot":         { version: "1.2.3",     dev: false },
  "@radix-ui/react-switch":       { version: "1.2.5",     dev: false },
  "@radix-ui/react-tabs":         { version: "1.1.12",    dev: false },
  "@radix-ui/react-toast":        { version: "1.2.14",    dev: false },
  "@radix-ui/react-toggle":       { version: "1.1.9",     dev: false },
  "@radix-ui/react-toggle-group": { version: "1.1.10",    dev: false },
  "@radix-ui/react-tooltip":      { version: "1.2.7",     dev: false },
  "@radix-ui/react-separator":    { version: "1.1.7",     dev: false },
  "@radix-ui/react-aspect-ratio": { version: "1.1.7",     dev: false },
  "@radix-ui/react-menubar":      { version: "1.1.15",    dev: false },

  // ── State management ──────────────────────────────────────────────────────
  "zustand":                      { version: "4.5.2",     dev: false, reason: "Lightweight state management" },
  "@tanstack/react-query":        { version: "5.83.0",    dev: false, reason: "Server state management" },

  // ── Forms & validation ────────────────────────────────────────────────────
  "react-hook-form":              { version: "7.61.1",    dev: false, reason: "Form state management" },
  "@hookform/resolvers":          { version: "3.10.0",    dev: false, reason: "RHF schema resolvers" },
  "zod":                          { version: "3.25.76",   dev: false, reason: "Schema validation" },

  // ── Data / Charts ─────────────────────────────────────────────────────────
  "recharts":                     { version: "2.15.4",    dev: false, reason: "Chart library" },
  "date-fns":                     { version: "3.6.0",     dev: false, reason: "Date utilities" },

  // ── DnD ───────────────────────────────────────────────────────────────────
  "@dnd-kit/core":                { version: "6.3.1",     dev: false, reason: "Drag and drop" },
  "@dnd-kit/sortable":            { version: "10.0.0",    dev: false, reason: "Sortable DnD" },
  "@dnd-kit/utilities":           { version: "3.2.2",     dev: false, reason: "DnD utilities" },

  // ── Backend / Infrastructure ──────────────────────────────────────────────
  "@supabase/supabase-js":        { version: "2.98.0",    dev: false, reason: "Supabase client" },

  // ── Dev toolchain (always devDependencies) ────────────────────────────────
  "vite":                         { version: "5.4.19",    dev: true,  reason: "Build tool" },
  "@vitejs/plugin-react-swc":     { version: "3.11.0",    dev: true,  reason: "Fast React Vite plugin" },
  "typescript":                   { version: "5.8.3",     dev: true,  reason: "TypeScript compiler" },
  "tailwindcss":                  { version: "3.4.17",    dev: true,  reason: "CSS framework" },
  "autoprefixer":                 { version: "10.4.21",   dev: true,  reason: "CSS autoprefixer" },
  "postcss":                      { version: "8.5.6",     dev: true,  reason: "CSS post-processing" },
  "@types/react":                 { version: "18.3.23",   dev: true,  reason: "React types" },
  "@types/react-dom":             { version: "18.3.7",    dev: true,  reason: "React DOM types" },
  "@types/node":                  { version: "22.16.5",   dev: true,  reason: "Node.js types" },
  "vitest":                       { version: "3.2.4",     dev: true,  reason: "Test runner" },
  "@testing-library/react":       { version: "16.0.0",    dev: true,  reason: "React testing utilities" },
  "@testing-library/jest-dom":    { version: "6.6.0",     dev: true,  reason: "Jest DOM matchers" },
  "eslint":                       { version: "9.32.0",    dev: true,  reason: "Linter" },
};

// ── Derived helpers ────────────────────────────────────────────────────────────

/**
 * Get exact version for a package. Returns undefined if not in registry.
 * Always use this instead of hardcoding version strings anywhere in the pipeline.
 */
export function getCanonicalVersion(pkg: string): string | undefined {
  return DEPENDENCY_REGISTRY[pkg]?.version;
}

/**
 * Resolve a set of detected imports to canonical dependencies.
 * Returns { dependencies, devDependencies } ready for package.json
 */
export function resolveCanonicalDeps(
  detectedPackages: Set<string>,
  existingDeps: Record<string, string> = {},
  existingDevDeps: Record<string, string> = {}
): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  injected: string[];
  unknown: string[];
} {
  const dependencies = { ...existingDeps };
  const devDependencies = { ...existingDevDeps };
  const injected: string[] = [];
  const unknown: string[] = [];

  for (const pkg of detectedPackages) {
    const entry = DEPENDENCY_REGISTRY[pkg];
    if (!entry) {
      unknown.push(pkg);
      continue;
    }
    const alreadyInDeps = pkg in dependencies;
    const alreadyInDev  = pkg in devDependencies;

    if (!alreadyInDeps && !alreadyInDev) {
      if (entry.dev) {
        devDependencies[pkg] = entry.version;
      } else {
        dependencies[pkg] = entry.version;
      }
      injected.push(`${pkg}@${entry.version}`);
    }
  }

  return { dependencies, devDependencies, injected, unknown };
}

/**
 * Validate a package.json's dependency versions against the canonical registry.
 * Returns a list of drift violations.
 *
 * Drift = a package is in both the project's package.json AND the registry,
 * but at a different version (including with ^ or ~ prefixes stripped).
 */
export interface DriftViolation {
  package: string;
  projectVersion: string;    // What the generated package.json has
  canonicalVersion: string;  // What the registry mandates
  severity: "error" | "warning";
}

export function validateDependencyGraph(
  packageJsonContent: string
): { violations: DriftViolation[]; valid: boolean; summary: string } {
  let pkg: Record<string, any>;
  try {
    pkg = JSON.parse(packageJsonContent);
  } catch {
    return { violations: [], valid: false, summary: "package.json malformado — JSON inválido" };
  }

  const allDeps: Record<string, string> = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  const violations: DriftViolation[] = [];

  for (const [name, rawVersion] of Object.entries(allDeps)) {
    const canonical = DEPENDENCY_REGISTRY[name];
    if (!canonical) continue; // Package not in registry — skip (unknown packages handled elsewhere)

    // Strip semver range operators to compare base version
    const projectBase   = String(rawVersion).replace(/^[\^~>=<*]+/, "").trim();
    const canonicalBase = canonical.version.replace(/^[\^~>=<*]+/, "").trim();

    if (projectBase !== canonicalBase) {
      violations.push({
        package: name,
        projectVersion: String(rawVersion),
        canonicalVersion: canonical.version,
        // Downgrade (older) = error. Upgrade (newer) = warning (may be intentional)
        severity: compareVersions(projectBase, canonicalBase) < 0 ? "error" : "warning",
      });
    }
  }

  const errors   = violations.filter(v => v.severity === "error");
  const warnings = violations.filter(v => v.severity === "warning");

  const valid = errors.length === 0;
  const summary = valid
    ? `Dependency graph válido. ${warnings.length} avisos de versão mais nova que o registry.`
    : `Dependency drift detectado: ${errors.length} erro(s), ${warnings.length} aviso(s). Versões desatualizadas ou incompatíveis encontradas.`;

  return { violations, valid, summary };
}

/**
 * Simple semver comparison: returns -1 (a < b), 0 (a = b), 1 (a > b).
 * Only compares major.minor.patch — ignores pre-release suffixes.
 */
function compareVersions(a: string, b: string): number {
  const parse = (v: string) => v.split(".").map(n => parseInt(n, 10) || 0);
  const [aMaj, aMin, aPat] = parse(a);
  const [bMaj, bMin, bPat] = parse(b);
  if (aMaj !== bMaj) return aMaj < bMaj ? -1 : 1;
  if (aMin !== bMin) return aMin < bMin ? -1 : 1;
  if (aPat !== bPat) return aPat < bPat ? -1 : 1;
  return 0;
}
