/**
 * Edge Function client with retry + exponential backoff.
 * Drop-in wrapper for supabase.functions.invoke().
 */

import { supabase } from "@/integrations/supabase/client";

interface InvokeOptions {
  body?: Record<string, unknown>;
  /** Max retry attempts (default 3) */
  maxRetries?: number;
  /** Base delay in ms (default 1000) */
  baseDelay?: number;
  /** HTTP methods that are safe to retry (default: all for idempotent backends) */
  retryableStatuses?: number[];
}

interface InvokeResult<T = unknown> {
  data: T | null;
  error: string | null;
  attempts: number;
}

const DEFAULT_RETRYABLE = [429, 500, 502, 503, 504];

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Invoke an edge function with automatic retry on transient failures.
 *
 * @example
 * const { data, error } = await invokeWithRetry("brain-sync", {
 *   body: { action: "get_nodes", initiativeId: "..." },
 * });
 */
export async function invokeWithRetry<T = unknown>(
  functionName: string,
  options: InvokeOptions = {}
): Promise<InvokeResult<T>> {
  const {
    body,
    maxRetries = 3,
    baseDelay = 1000,
    retryableStatuses = DEFAULT_RETRYABLE,
  } = options;

  let lastError: string | null = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const { data, error } = await supabase.functions.invoke(functionName, { body });

    // Success
    if (!error) {
      return { data: data as T, error: null, attempts: attempt };
    }

    lastError = typeof error === "object" && "message" in error
      ? (error as { message: string }).message
      : String(error);

    // Check if retryable
    const statusMatch = retryableStatuses.some(s => lastError?.includes(String(s)));
    const isTransient = statusMatch
      || lastError?.toLowerCase().includes("timeout")
      || lastError?.toLowerCase().includes("network");

    if (!isTransient || attempt > maxRetries) {
      break;
    }

    // Exponential backoff with jitter
    const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500;
    console.warn(`[EdgeFn] ${functionName} attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`);
    await sleep(delay);
  }

  return { data: null, error: lastError, attempts: maxRetries + 1 };
}
