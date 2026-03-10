/**
 * AxionOS Dependency Graph Analyzer
 *
 * Static transitive dependency risk analyzer.
 *
 * Why static? The pipeline runs in Supabase Edge Functions (Deno runtime) —
 * there is no npm, no node_modules, no `npm ls` available. Instead we use
 * a pre-computed knowledge base of known package footprints and peer conflicts.
 *
 * What this solves:
 *   - Transitive dependency explosion (left-pad problem at scale)
 *   - Peer dependency version conflicts between co-installed packages
 *   - Unbounded dependency tree depth
 *   - Unknown risk accumulation in generated projects
 *
 * Approach: statically model each package's known transitive footprint
 * (estimated node count, known conflicts, depth contribution) and compute
 * a composite risk score before publish.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PackageFootprint {
  /** Estimated total nodes added to the dependency graph (direct + transitive) */
  estimatedNodes: number;
  /** Known peer dependency requirements */
  peerRequires: Record<string, string>; // { "react": ">=18" }
  /** Packages this one is known to conflict with */
  knownConflicts: string[];
  /** Estimated depth contribution (levels deep) */
  depth: number;
  /** Risk tier: low | medium | high */
  risk: "low" | "medium" | "high";
}

export interface GraphAnalysisResult {
  /** Total estimated nodes in the dependency graph */
  totalEstimatedNodes: number;
  /** Maximum estimated depth */
  maxDepth: number;
  /** Packages that have peer dependency conflicts with each other */
  peerConflicts: PeerConflict[];
  /** Direct dependencies outside the canonical registry */
  unknownPackages: string[];
  /** Packages flagged as high-risk (large footprint or known issues) */
  highRiskPackages: string[];
  /** Overall risk score: 0–100 */
  riskScore: number;
  /** Risk level derived from score */
  riskLevel: "low" | "medium" | "high" | "critical";
  /** Human-readable summary */
  summary: string;
  /** Whether to block publish */
  shouldBlock: boolean;
  /** Individual package footprints for the direct deps */
  packageBreakdown: Record<string, { estimatedNodes: number; risk: string }>;
}

export interface PeerConflict {
  package: string;
  requires: string;
  requiredVersion: string;
  conflictsWith: string;
  description: string;
}

// ── Static Footprint Knowledge Base ──────────────────────────────────────────
// Each entry describes the known transitive footprint of a package.
// estimatedNodes = rough total nodes added (based on npm audit data / known behavior)

const PACKAGE_FOOTPRINTS: Record<string, PackageFootprint> = {
  // ── Very lightweight (1–5 nodes) ──────────────────────────────────────────
  "clsx":                       { estimatedNodes: 1,   peerRequires: {}, knownConflicts: [], depth: 1, risk: "low" },
  "tailwind-merge":             { estimatedNodes: 2,   peerRequires: {}, knownConflicts: [], depth: 1, risk: "low" },
  "class-variance-authority":   { estimatedNodes: 3,   peerRequires: {}, knownConflicts: [], depth: 2, risk: "low" },
  "lefthook":                   { estimatedNodes: 1,   peerRequires: {}, knownConflicts: [], depth: 1, risk: "low" },
  "date-fns":                   { estimatedNodes: 1,   peerRequires: {}, knownConflicts: [], depth: 1, risk: "low" },
  "zod":                        { estimatedNodes: 1,   peerRequires: {}, knownConflicts: [], depth: 1, risk: "low" },
  "zustand":                    { estimatedNodes: 3,   peerRequires: { "react": ">=18" }, knownConflicts: [], depth: 2, risk: "low" },
  "sonner":                     { estimatedNodes: 4,   peerRequires: { "react": ">=18", "react-dom": ">=18" }, knownConflicts: [], depth: 2, risk: "low" },
  "vaul":                       { estimatedNodes: 5,   peerRequires: { "react": ">=18", "react-dom": ">=18" }, knownConflicts: [], depth: 2, risk: "low" },
  "cmdk":                       { estimatedNodes: 8,   peerRequires: { "react": ">=18", "react-dom": ">=18" }, knownConflicts: [], depth: 3, risk: "low" },
  "input-otp":                  { estimatedNodes: 4,   peerRequires: { "react": ">=18" }, knownConflicts: [], depth: 2, risk: "low" },
  "lucide-react":               { estimatedNodes: 2,   peerRequires: { "react": ">=18" }, knownConflicts: [], depth: 1, risk: "low" },
  "next-themes":                { estimatedNodes: 3,   peerRequires: { "react": ">=18", "react-dom": ">=18" }, knownConflicts: [], depth: 2, risk: "low" },
  "react-hook-form":            { estimatedNodes: 1,   peerRequires: { "react": ">=18" }, knownConflicts: [], depth: 1, risk: "low" },
  "@hookform/resolvers":        { estimatedNodes: 2,   peerRequires: { "react-hook-form": ">=7" }, knownConflicts: [], depth: 2, risk: "low" },
  "react-resizable-panels":     { estimatedNodes: 2,   peerRequires: { "react": ">=18", "react-dom": ">=18" }, knownConflicts: [], depth: 2, risk: "low" },
  "react-day-picker":           { estimatedNodes: 6,   peerRequires: { "react": ">=18", "date-fns": ">=2" }, knownConflicts: [], depth: 3, risk: "low" },

  // ── Light-medium (6–20 nodes) ─────────────────────────────────────────────
  "@radix-ui/react-dialog":     { estimatedNodes: 12,  peerRequires: { "react": ">=18", "react-dom": ">=18" }, knownConflicts: [], depth: 4, risk: "low" },
  "@radix-ui/react-dropdown-menu": { estimatedNodes: 14, peerRequires: { "react": ">=18", "react-dom": ">=18" }, knownConflicts: [], depth: 4, risk: "low" },
  "@radix-ui/react-select":     { estimatedNodes: 15,  peerRequires: { "react": ">=18", "react-dom": ">=18" }, knownConflicts: [], depth: 4, risk: "low" },
  "@radix-ui/react-tooltip":    { estimatedNodes: 10,  peerRequires: { "react": ">=18", "react-dom": ">=18" }, knownConflicts: [], depth: 4, risk: "low" },
  "@radix-ui/react-popover":    { estimatedNodes: 12,  peerRequires: { "react": ">=18", "react-dom": ">=18" }, knownConflicts: [], depth: 4, risk: "low" },
  "@radix-ui/react-tabs":       { estimatedNodes: 9,   peerRequires: { "react": ">=18", "react-dom": ">=18" }, knownConflicts: [], depth: 3, risk: "low" },
  "@radix-ui/react-accordion":  { estimatedNodes: 11,  peerRequires: { "react": ">=18", "react-dom": ">=18" }, knownConflicts: [], depth: 4, risk: "low" },
  "@radix-ui/react-avatar":     { estimatedNodes: 8,   peerRequires: { "react": ">=18", "react-dom": ">=18" }, knownConflicts: [], depth: 3, risk: "low" },
  "@supabase/supabase-js":      { estimatedNodes: 18,  peerRequires: {}, knownConflicts: [], depth: 4, risk: "low" },
  "@tanstack/react-query":      { estimatedNodes: 8,   peerRequires: { "react": ">=18" }, knownConflicts: [], depth: 3, risk: "low" },
  "embla-carousel-react":       { estimatedNodes: 5,   peerRequires: { "react": ">=18" }, knownConflicts: [], depth: 2, risk: "low" },

  // ── Medium (21–60 nodes) ──────────────────────────────────────────────────
  "framer-motion":              { estimatedNodes: 35,  peerRequires: { "react": ">=18", "react-dom": ">=18" }, knownConflicts: [], depth: 6, risk: "medium" },
  "recharts":                   { estimatedNodes: 45,  peerRequires: { "react": ">=18", "react-dom": ">=18" }, knownConflicts: [], depth: 6, risk: "medium" },
  "react-router-dom":           { estimatedNodes: 8,   peerRequires: { "react": ">=18", "react-dom": ">=18" }, knownConflicts: [], depth: 3, risk: "low" },
  "@dnd-kit/core":              { estimatedNodes: 12,  peerRequires: { "react": ">=18", "react-dom": ">=18" }, knownConflicts: [], depth: 4, risk: "low" },
  "@dnd-kit/sortable":          { estimatedNodes: 6,   peerRequires: { "@dnd-kit/core": "*" }, knownConflicts: [], depth: 3, risk: "low" },

  // ── Heavy (61+ nodes) — flag as high risk ─────────────────────────────────
  "react":                      { estimatedNodes: 5,   peerRequires: {}, knownConflicts: [], depth: 2, risk: "low" },
  "react-dom":                  { estimatedNodes: 8,   peerRequires: { "react": "*" }, knownConflicts: [], depth: 3, risk: "low" },

  // Dev toolchain — not counted toward runtime risk
  "vite":                       { estimatedNodes: 40,  peerRequires: {}, knownConflicts: [], depth: 5, risk: "low" },
  "typescript":                 { estimatedNodes: 1,   peerRequires: {}, knownConflicts: [], depth: 1, risk: "low" },
  "tailwindcss":                { estimatedNodes: 15,  peerRequires: {}, knownConflicts: [], depth: 4, risk: "low" },
};

// ── Known peer conflict pairs ─────────────────────────────────────────────────
// These are package combinations known to cause peer dep issues when co-installed.
const KNOWN_PEER_CONFLICTS: Array<{
  packageA: string;
  packageB: string;
  description: string;
}> = [
  {
    packageA: "react@17",
    packageB: "framer-motion@11",
    description: "framer-motion v11+ requires React 18. Use framer-motion@10 with React 17.",
  },
  {
    packageA: "@tanstack/react-query@4",
    packageB: "@tanstack/react-query@5",
    description: "Cannot have both v4 and v5 of react-query. Pick one major version.",
  },
  {
    packageA: "react-hook-form@6",
    packageB: "@hookform/resolvers@3",
    description: "@hookform/resolvers v3 requires react-hook-form v7+.",
  },
];

// ── Risk thresholds ────────────────────────────────────────────────────────────
const THRESHOLDS = {
  totalNodes: { medium: 150, high: 350, critical: 600 },
  maxDepth:   { medium: 6,   high: 9,   critical: 12 },
  peerConflicts: { block: 1 }, // Any peer conflict = block publish
  unknownPackages: { warn: 3, block: 8 },
};

// ── Main analyzer ──────────────────────────────────────────────────────────────

/**
 * Analyze the dependency graph of a generated project.
 * Works offline via static footprint data — no npm install required.
 *
 * @param packageJsonContent Raw package.json content string
 */
export function analyzeDependencyGraph(packageJsonContent: string): GraphAnalysisResult {
  let deps: Record<string, string> = {};
  let devDeps: Record<string, string> = {};

  try {
    const pkg = JSON.parse(packageJsonContent);
    deps    = pkg.dependencies    || {};
    devDeps = pkg.devDependencies || {};
  } catch {
    return {
      totalEstimatedNodes: 0, maxDepth: 0, peerConflicts: [], unknownPackages: [],
      highRiskPackages: [], riskScore: 0, riskLevel: "low",
      summary: "Erro: package.json malformado — análise de grafo não executada.",
      shouldBlock: false, packageBreakdown: {},
    };
  }

  // Only analyze runtime deps (not devDeps) for install-time risk
  const runtimeDeps = Object.keys(deps);
  const allDeclaredDeps = [...runtimeDeps, ...Object.keys(devDeps)];

  let totalEstimatedNodes = 0;
  let maxDepth = 0;
  const highRiskPackages: string[] = [];
  const unknownPackages: string[] = [];
  const packageBreakdown: Record<string, { estimatedNodes: number; risk: string }> = {};
  const peerConflicts: PeerConflict[] = [];

  // 1. Footprint analysis (runtime deps only for install-time risk)
  for (const pkg of runtimeDeps) {
    const footprint = PACKAGE_FOOTPRINTS[pkg];
    if (!footprint) {
      unknownPackages.push(pkg);
      // Unknown = assume medium footprint (conservative)
      totalEstimatedNodes += 20;
      maxDepth = Math.max(maxDepth, 5);
      packageBreakdown[pkg] = { estimatedNodes: 20, risk: "unknown" };
      continue;
    }

    totalEstimatedNodes += footprint.estimatedNodes;
    maxDepth = Math.max(maxDepth, footprint.depth);
    packageBreakdown[pkg] = { estimatedNodes: footprint.estimatedNodes, risk: footprint.risk };
    if (footprint.risk === "high") highRiskPackages.push(pkg);
  }

  // 2. Peer dependency conflict detection
  for (const pkg of allDeclaredDeps) {
    const footprint = PACKAGE_FOOTPRINTS[pkg];
    if (!footprint) continue;
    for (const [peerPkg, peerRange] of Object.entries(footprint.peerRequires)) {
      // Check if the peer is declared and at a likely incompatible version
      const declaredVersion = deps[peerPkg] || devDeps[peerPkg];
      if (declaredVersion && !satisfiesPeerRange(declaredVersion, peerRange)) {
        peerConflicts.push({
          package: pkg,
          requires: peerPkg,
          requiredVersion: peerRange,
          conflictsWith: declaredVersion,
          description: `${pkg} requer ${peerPkg}${peerRange} mas o projeto declara ${peerPkg}@${declaredVersion}`,
        });
      }
    }
  }

  // 3. Risk scoring (0–100)
  let riskScore = 0;

  // Node count contribution (0–40 pts)
  if (totalEstimatedNodes >= THRESHOLDS.totalNodes.critical)    riskScore += 40;
  else if (totalEstimatedNodes >= THRESHOLDS.totalNodes.high)   riskScore += 30;
  else if (totalEstimatedNodes >= THRESHOLDS.totalNodes.medium) riskScore += 15;
  else riskScore += Math.floor(totalEstimatedNodes / THRESHOLDS.totalNodes.medium * 15);

  // Depth contribution (0–25 pts)
  if (maxDepth >= THRESHOLDS.maxDepth.critical)    riskScore += 25;
  else if (maxDepth >= THRESHOLDS.maxDepth.high)   riskScore += 18;
  else if (maxDepth >= THRESHOLDS.maxDepth.medium) riskScore += 10;
  else riskScore += Math.floor(maxDepth / THRESHOLDS.maxDepth.medium * 10);

  // Peer conflicts (0–20 pts)
  riskScore += Math.min(peerConflicts.length * 15, 20);

  // Unknown packages (0–15 pts)
  riskScore += Math.min(unknownPackages.length * 3, 15);

  riskScore = Math.min(riskScore, 100);

  // 4. Risk level
  const riskLevel: GraphAnalysisResult["riskLevel"] =
    riskScore >= 75 ? "critical" :
    riskScore >= 50 ? "high" :
    riskScore >= 25 ? "medium" : "low";

  // 5. Block decision
  const shouldBlock =
    peerConflicts.length >= THRESHOLDS.peerConflicts.block ||
    unknownPackages.length >= THRESHOLDS.unknownPackages.block ||
    riskLevel === "critical";

  // 6. Summary
  const lines: string[] = [
    `Grafo: ~${totalEstimatedNodes} nós estimados / profundidade máx. ${maxDepth} / risco ${riskLevel.toUpperCase()} (score ${riskScore}/100).`,
  ];
  if (peerConflicts.length > 0) lines.push(`⛔ ${peerConflicts.length} conflito(s) de peer deps detectado(s).`);
  if (unknownPackages.length > 0) lines.push(`⚠️ ${unknownPackages.length} pacote(s) fora do registry: ${unknownPackages.join(", ")}.`);
  if (highRiskPackages.length > 0) lines.push(`🔴 High-risk: ${highRiskPackages.join(", ")}.`);
  if (shouldBlock) lines.push("BLOQUEIO RECOMENDADO: resolva os conflitos antes de publicar.");

  return {
    totalEstimatedNodes, maxDepth, peerConflicts, unknownPackages, highRiskPackages,
    riskScore, riskLevel, summary: lines.join(" "), shouldBlock, packageBreakdown,
  };
}

/**
 * Very conservative semver range check.
 * Returns false if the declared version is clearly outside the required range.
 * Errs on the side of NOT flagging false positives.
 */
function satisfiesPeerRange(declared: string, required: string): boolean {
  // Strip operators from both
  const declaredBase = declared.replace(/^[\^~>=<*\s]+/, "").trim().split(".")[0];
  const reqMatch = required.match(/(\d+)/);
  if (!reqMatch) return true; // Can't parse requirement — assume ok
  const requiredMajor = parseInt(reqMatch[1], 10);
  const declaredMajor = parseInt(declaredBase, 10);
  if (isNaN(declaredMajor) || isNaN(requiredMajor)) return true;

  // If requirement is ">= X" and declared major is < X, flag conflict
  if (required.includes(">=") && declaredMajor < requiredMajor) return false;
  // If requirement is "X" (exact major) and declared is different major
  if (/^\d+$/.test(required.trim()) && declaredMajor !== requiredMajor) return false;

  return true;
}
