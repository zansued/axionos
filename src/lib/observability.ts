/**
 * Frontend Observability — Sprint 2
 * Lightweight client-side error capture + reporting utility.
 * Designed to be extensible (Sentry-compatible shape) without external deps.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type ErrorSeverity = "info" | "warning" | "error" | "fatal";

export interface ErrorReport {
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  source: "runtime" | "promise" | "render" | "lazy" | "manual";
  route: string;
  timestamp: string;
  user_agent: string;
  // optional context
  user_id?: string;
  organization_id?: string;
  component?: string;
  metadata?: Record<string, unknown>;
}

// ── Config ───────────────────────────────────────────────────────────────────

const REPORT_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/frontend-errors`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Context enrichment — set by providers at runtime */
let _userId: string | undefined;
let _orgId: string | undefined;

export function setObservabilityUser(userId?: string, orgId?: string) {
  _userId = userId;
  _orgId = orgId;
}

// ── Rate limiting (simple sliding window) ────────────────────────────────────

const REPORT_WINDOW_MS = 60_000;
const MAX_REPORTS_PER_WINDOW = 10;
let _reportTimestamps: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  _reportTimestamps = _reportTimestamps.filter((t) => now - t < REPORT_WINDOW_MS);
  if (_reportTimestamps.length >= MAX_REPORTS_PER_WINDOW) return true;
  _reportTimestamps.push(now);
  return false;
}

// ── Dedup (same message within 5s) ───────────────────────────────────────────

const DEDUP_WINDOW_MS = 5_000;
let _lastReportKey = "";
let _lastReportTime = 0;

function isDuplicate(key: string): boolean {
  const now = Date.now();
  if (key === _lastReportKey && now - _lastReportTime < DEDUP_WINDOW_MS) return true;
  _lastReportKey = key;
  _lastReportTime = now;
  return false;
}

// ── Core reporter ────────────────────────────────────────────────────────────

export function reportError(
  error: unknown,
  context?: {
    source?: ErrorReport["source"];
    severity?: ErrorSeverity;
    component?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const dedupKey = `${err.message}::${context?.source}`;

    if (isDuplicate(dedupKey) || isRateLimited()) return;

    const report: ErrorReport = {
      message: err.message.slice(0, 1000),
      stack: err.stack?.slice(0, 4000),
      severity: context?.severity ?? "error",
      source: context?.source ?? "manual",
      route: globalThis.location?.pathname ?? "unknown",
      timestamp: new Date().toISOString(),
      user_agent: globalThis.navigator?.userAgent?.slice(0, 500) ?? "unknown",
      user_id: _userId,
      organization_id: _orgId,
      component: context?.component,
      metadata: context?.metadata,
    };

    // Fire-and-forget — never block the UI
    sendReport(report);

    // Also log locally for dev visibility
    if (import.meta.env.DEV) {
      console.error("[Observability]", report.source, report.message, report);
    }
  } catch {
    // Observability must never throw
  }
}

async function sendReport(report: ErrorReport): Promise<void> {
  try {
    await fetch(REPORT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
      },
      body: JSON.stringify(report),
      keepalive: true, // survives page unload
    });
  } catch {
    // Silently fail — network issues shouldn't cascade
  }
}

// ── Global handlers ──────────────────────────────────────────────────────────

export function installGlobalErrorHandlers(): void {
  // Unhandled runtime errors
  globalThis.addEventListener("error", (event) => {
    reportError(event.error ?? event.message, { source: "runtime", severity: "error" });
  });

  // Unhandled promise rejections
  globalThis.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, { source: "promise", severity: "error" });
  });
}
