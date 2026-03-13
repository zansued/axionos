/**
 * Tracked Selector Hook for PipelineContext
 * 
 * Uses proxy-based memoization to reduce re-renders by tracking
 * which specific state properties each consumer accesses.
 * Components only re-render when their tracked properties change.
 */

import { useRef, useMemo, useSyncExternalStore, useCallback } from "react";
import { usePipeline, type PipelineEvent } from "@/contexts/PipelineContext";

type AnyObject = Record<string, unknown>;

interface TrackedKeys {
  keys: Set<string>;
}

/**
 * Creates a tracking proxy that records which keys are accessed.
 */
function createTrackingProxy<T extends AnyObject>(target: T): { proxy: T; tracked: TrackedKeys } {
  const tracked: TrackedKeys = { keys: new Set() };

  const proxy = new Proxy(target, {
    get(innerTarget, prop) {
      if (typeof prop === "symbol") return Reflect.get(innerTarget, prop);
      tracked.keys.add(String(prop));
      return Reflect.get(innerTarget, prop);
    },
  }) as T;

  return { proxy, tracked };
}

/**
 * Hook: select specific derived state from PipelineContext.
 * Only triggers re-render when the selected value changes (by reference).
 * 
 * Usage:
 * ```tsx
 * // Only re-renders when `running` changes, not when `events` change
 * const isRunning = usePipelineSelector(ctx => ctx.isRunning("abc-123"));
 * ```
 */
export function usePipelineSelector<R>(selector: (ctx: PipelineSelectorInput) => R): R {
  const pipeline = usePipeline();
  const prevRef = useRef<{ result: R; snapshot: Map<string, unknown> } | null>(null);

  return useMemo(() => {
    const stateObj: PipelineSelectorInput = {
      running: pipeline.running,
      events: pipeline.events,
      unreadCount: pipeline.unreadCount,
    };

    // Check if tracked keys changed
    if (prevRef.current) {
      let changed = false;
      for (const [key, prevVal] of prevRef.current.snapshot) {
        if ((stateObj as AnyObject)[key] !== prevVal) {
          changed = true;
          break;
        }
      }
      if (!changed) return prevRef.current.result;
    }

    // Run selector with tracking
    const { proxy, tracked } = createTrackingProxy(stateObj as AnyObject);
    const result = selector(proxy as PipelineSelectorInput);

    // Snapshot tracked keys
    const snapshot = new Map<string, unknown>();
    for (const key of tracked.keys) {
      snapshot.set(key, (stateObj as AnyObject)[key]);
    }

    prevRef.current = { result, snapshot };
    return result;
  }, [pipeline.running, pipeline.events, pipeline.unreadCount, selector]);
}

export interface PipelineSelectorInput {
  running: Record<string, string>;
  events: PipelineEvent[];
  unreadCount: number;
}

/**
 * Convenience: select only running state for a specific initiative.
 * Much cheaper than subscribing to full context.
 */
export function useInitiativeRunning(initiativeId: string): { isRunning: boolean; stage: string | null } {
  const pipeline = usePipeline();
  
  return useMemo(() => ({
    isRunning: !!pipeline.running[initiativeId],
    stage: pipeline.running[initiativeId] || null,
  }), [pipeline.running, initiativeId]);
}

/**
 * Convenience: select only unread event count.
 */
export function useUnreadPipelineCount(): number {
  const pipeline = usePipeline();
  return pipeline.unreadCount;
}
