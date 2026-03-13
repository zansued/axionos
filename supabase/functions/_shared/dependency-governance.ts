/**
 * Dependency Governance Agent — AXIONOS
 *
 * Proactively validates and upgrades dependencies in generated package.json
 * before they are committed to GitHub. Queries the npm registry in parallel
 * using Deno's native fetch (no external dependencies).
 *
 * Flow:
 *   1. Parse the incoming package.json content
 *   2. Query registry.npmjs.org for each package (batched, 8s timeout)
 *   3. Compare declared versions vs latest
 *   4. Auto-apply upgrades and flag deprecated/blocked packages
 *   5. Return updated package.json + governance report
 */

import { CANONICAL_DEPS, BLOCKED_PACKAGES, BLOCKED_REPLACEMENTS } from "./canonical-deps.ts";

// ── Types ──────────────────────────────────────────────────────────────────

export interface DepUpgrade {
  name: string;
  declared: string;
  upgraded: string;
  reason: "outdated" | "deprecated" | "blocked" | "canonical_min";
}

export interface GovernanceReport {
  upgrades: DepUpgrade[];
  deprecated: string[];
  blocked: string[];
  unresolved: string[];   // packages that couldn't be resolved from registry
  risk: "low" | "medium" | "high" | "critical";
  summary: string;
  registry_consulted: boolean;
}

interface NpmPackageInfo {
  "dist-tags"?: { latest?: string };
  deprecated?: string;
  versions?: Record<string, unknown>;
}

// ── Constants ──────────────────────────────────────────────────────────────

const NPM_REGISTRY = "https://registry.npmjs.org";
const FETCH_TIMEOUT_MS = 8_000;
const BATCH_SIZE = 10;

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Run dependency governance on a package.json string.
 * Returns the (possibly upgraded) package.json content and a governance report.
 */
export async function runDependencyGovernance(packageJsonContent: string): Promise<{
  updatedContent: string;
  report: GovernanceReport;
}> {
  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(packageJsonContent);
  } catch {
    // Unparseable — return as-is, no-op
    return {
      updatedContent: packageJsonContent,
      report: { upgrades: [], deprecated: [], blocked: [], unresolved: [], risk: "low", summary: "package.json parse error — skipped", registry_consulted: false },
    };
  }

  const deps: Record<string, string> = (pkg.dependencies as Record<string, string>) || {};
  const devDeps: Record<string, string> = (pkg.devDependencies as Record<string, string>) || {};

  const allDeps = new Map<string, { version: string; key: "dependencies" | "devDependencies" }>();
  for (const [name, ver] of Object.entries(deps)) allDeps.set(name, { version: ver, key: "dependencies" });
  for (const [name, ver] of Object.entries(devDeps)) allDeps.set(name, { version: ver, key: "devDependencies" });

  const packageNames = [...allDeps.keys()];

  // ── Query npm registry in parallel batches ──
  const registryData = new Map<string, NpmPackageInfo | null>();
  let registryConsulted = false;

  try {
    for (let i = 0; i < packageNames.length; i += BATCH_SIZE) {
      const batch = packageNames.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((name) => fetchPackageInfo(name))
      );
      for (let j = 0; j < batch.length; j++) {
        const r = results[j];
        registryData.set(batch[j], r.status === "fulfilled" ? r.value : null);
      }
      registryConsulted = true;
    }
  } catch {
    // Registry unreachable — fall through to canonical-only mode
    console.warn("[DEP-GOV] npm registry unreachable — using canonical fallback");
  }

  // ── Analyze and upgrade ──
  const upgrades: DepUpgrade[] = [];
  const deprecated: string[] = [];
  const blocked: string[] = [];
  const unresolved: string[] = [];

  for (const [name, { version, key }] of allDeps.entries()) {
    // 1. Check blocked packages (exact name match)
    if (BLOCKED_PACKAGES.has(name)) {
      blocked.push(name);
      delete (pkg[key] as Record<string, string>)[name];
      upgrades.push({ name, declared: version, upgraded: "(removed)", reason: "blocked" });
      console.log(`[DEP-GOV] Removed blocked package: ${name}`);

      // Auto-inject canonical replacement if one exists
      const replacement = BLOCKED_REPLACEMENTS[name];
      if (replacement) {
        const replKey = replacement.dev ? "devDependencies" : "dependencies";
        if (!pkg[replKey]) pkg[replKey] = {};
        const target = pkg[replKey] as Record<string, string>;
        if (!target[replacement.name]) {
          target[replacement.name] = replacement.version;
          upgrades.push({ name: replacement.name, declared: "(added)", upgraded: replacement.version, reason: "blocked" });
          console.log(`[DEP-GOV] Auto-replaced ${name} -> ${replacement.name}@${replacement.version}`);
        }
      }
      continue;
    }

    // 1b. Check version-blocked packages (e.g. "eslint@10" blocks eslint if major >= 10)
    for (const blockedEntry of BLOCKED_PACKAGES) {
      if (!blockedEntry.includes("@") || blockedEntry.startsWith("@")) continue;
      const [blockedName, blockedMajorStr] = blockedEntry.split("@");
      if (blockedName !== name) continue;
      const blockedMajor = parseInt(blockedMajorStr, 10);
      if (isNaN(blockedMajor)) continue;
      // Extract declared major version
      const declaredMajor = parseInt(version.replace(/[^0-9]/g, "").slice(0, String(blockedMajor).length), 10);
      if (declaredMajor >= blockedMajor) {
        // Downgrade to canonical preferred version
        const canonical = CANONICAL_DEPS[name];
        if (canonical) {
          (pkg[key] as Record<string, string>)[name] = canonical.preferred;
          upgrades.push({ name, declared: version, upgraded: canonical.preferred, reason: "blocked" });
          console.log(`[DEP-GOV] Downgraded ${name}@${version} -> ${canonical.preferred} (v${blockedMajor}+ blocked)`);
        }
      }
    }

    const npmInfo = registryData.get(name);
    const canonical = CANONICAL_DEPS[name];

    // 2. Check deprecated flag from registry
    if (npmInfo?.deprecated) {
      deprecated.push(`${name}: ${npmInfo.deprecated}`);
      console.warn(`[DEP-GOV] Deprecated: ${name} — ${npmInfo.deprecated}`);
    }

    // 3. Determine target version (registry latest → canonical preferred → keep)
    let targetVersion: string | null = null;
    let reason: DepUpgrade["reason"] = "outdated";

    if (npmInfo !== null && npmInfo !== undefined) {
      const latest = npmInfo["dist-tags"]?.latest;
      if (latest && isUpgrade(version, `^${latest}`)) {
        targetVersion = `^${latest}`;
        reason = "outdated";
      }
    } else if (!registryConsulted && canonical) {
      // Offline mode: enforce canonical minimum
      if (isUpgrade(version, canonical.minAcceptable)) {
        targetVersion = canonical.preferred;
        reason = "canonical_min";
      }
    }

    // 4. If registry returned null (unresolved) but package isn't in canonical, note it
    if (npmInfo === null && !canonical) {
      unresolved.push(name);
    }

    // 5. Apply upgrade if needed
    if (targetVersion) {
      const targetDeps = pkg[key] as Record<string, string>;
      targetDeps[name] = targetVersion;
      upgrades.push({ name, declared: version, upgraded: targetVersion, reason });
      console.log(`[DEP-GOV] Upgraded ${name}: ${version} → ${targetVersion} (${reason})`);
    }
  }

  // ── Compute risk level ──
  const risk = computeRisk({ upgrades, deprecated, blocked, unresolved });

  const report: GovernanceReport = {
    upgrades,
    deprecated,
    blocked,
    unresolved,
    risk,
    summary: buildSummary({ upgrades, deprecated, blocked, unresolved, risk }),
    registry_consulted: registryConsulted,
  };

  return {
    updatedContent: JSON.stringify(pkg, null, 2),
    report,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

async function fetchPackageInfo(packageName: string): Promise<NpmPackageInfo | null> {
  const encodedName = packageName.startsWith("@")
    ? packageName.replace("/", "%2F")
    : packageName;
  const url = `${NPM_REGISTRY}/${encodedName}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/vnd.npm.install-v1+json, application/json" },
    });
    clearTimeout(timer);

    if (!resp.ok) return null;
    const data = await resp.json() as NpmPackageInfo;
    return data;
  } catch {
    return null;
  }
}

/**
 * Returns true if `candidate` represents a version strictly newer than `declared`.
 * Compares only the major.minor.patch numeric parts after stripping range operators.
 */
function isUpgrade(declared: string, candidate: string): boolean {
  const strip = (v: string) => v.replace(/^[\^~>=<\s]+/, "").split(".").map(Number);
  try {
    const [dMaj, dMin, dPatch] = strip(declared);
    const [cMaj, cMin, cPatch] = strip(candidate);
    if (cMaj !== dMaj) return cMaj > dMaj;
    if (cMin !== dMin) return cMin > dMin;
    return cPatch > dPatch;
  } catch {
    return false;
  }
}

function computeRisk({ upgrades, deprecated, blocked, unresolved }: {
  upgrades: DepUpgrade[];
  deprecated: string[];
  blocked: string[];
  unresolved: string[];
}): GovernanceReport["risk"] {
  // If all blocked packages were auto-replaced, downgrade from critical to medium
  const unreplaceableBlocked = blocked.filter(name => !BLOCKED_REPLACEMENTS[name]);
  if (unreplaceableBlocked.length > 0) return "critical";
  if (blocked.length > 0) return "medium"; // all were auto-replaced
  if (deprecated.length > 2 || upgrades.length > 10) return "high";
  if (deprecated.length > 0 || upgrades.length > 5) return "medium";
  return "low";
}

function buildSummary({ upgrades, deprecated, blocked, unresolved, risk }: {
  upgrades: DepUpgrade[];
  deprecated: string[];
  blocked: string[];
  unresolved: string[];
  risk: GovernanceReport["risk"];
}): string {
  const parts: string[] = [];
  if (blocked.length) parts.push(`${blocked.length} blocked removed`);
  if (deprecated.length) parts.push(`${deprecated.length} deprecated`);
  if (upgrades.length) parts.push(`${upgrades.length} upgraded`);
  if (unresolved.length) parts.push(`${unresolved.length} unresolved`);
  return parts.length
    ? `[DEP-GOV] risk=${risk} — ${parts.join(", ")}`
    : `[DEP-GOV] All dependencies OK (risk=low)`;
}
