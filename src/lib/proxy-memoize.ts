/**
 * Proxy-Based Memoization — Property Tracking via Proxy
 *
 * Instead of JSON.stringify or shallow comparison on the entire state object,
 * this utility wraps the state in a Proxy that tracks which specific keys
 * are accessed during a computation. The cache is only invalidated when
 * one of those tracked keys changes — not the entire object.
 *
 * Inspired by proxy-memoize patterns for high-performance React selectors.
 */

type AnyObject = Record<string, any>;

interface TrackedAccess {
  /** Top-level keys accessed during computation */
  keys: Set<string>;
  /** Deep paths accessed (dot-separated) */
  paths: Set<string>;
}

interface CacheEntry<R> {
  result: R;
  tracked: TrackedAccess;
  snapshot: Map<string, unknown>;
}

/**
 * Creates a property-tracking proxy around a state object.
 * Returns the proxy and the set of accessed keys/paths.
 */
function createTrackingProxy<T extends AnyObject>(target: T): { proxy: T; tracked: TrackedAccess } {
  const tracked: TrackedAccess = { keys: new Set(), paths: new Set() };

  function createNestedProxy(obj: unknown, parentPath: string): unknown {
    if (obj === null || typeof obj !== "object") return obj;

    return new Proxy(obj as AnyObject, {
      get(innerTarget, prop) {
        if (typeof prop === "symbol") return Reflect.get(innerTarget, prop);
        const key = String(prop);
        const fullPath = parentPath ? `${parentPath}.${key}` : key;

        // Track the access
        if (!parentPath) tracked.keys.add(key);
        tracked.paths.add(fullPath);

        const value = Reflect.get(innerTarget, prop);

        // Recursively proxy nested objects (but not arrays — too expensive)
        if (value !== null && typeof value === "object" && !Array.isArray(value)) {
          return createNestedProxy(value, fullPath);
        }

        return value;
      },
    });
  }

  const proxy = createNestedProxy(target, "") as T;
  return { proxy, tracked };
}

/**
 * Extracts a snapshot of only the tracked keys from the state.
 */
function extractSnapshot(state: AnyObject, tracked: TrackedAccess): Map<string, unknown> {
  const snapshot = new Map<string, unknown>();
  for (const key of tracked.keys) {
    snapshot.set(key, state[key]);
  }
  return snapshot;
}

/**
 * Checks if any tracked key changed between cached snapshot and current state.
 */
function hasTrackedKeysChanged(state: AnyObject, cached: CacheEntry<unknown>): boolean {
  for (const key of cached.tracked.keys) {
    const current = state[key];
    const previous = cached.snapshot.get(key);

    // Reference equality for objects (intentional — forces re-eval on new object refs)
    if (current !== previous) return true;
  }
  return false;
}

/**
 * Creates a proxy-memoized selector function.
 *
 * Usage:
 * ```ts
 * const selectReadinessScore = proxyMemoize((state: InitiativeReadinessInput) => {
 *   // Only accesses state.stage_status, state.description, etc.
 *   return evaluateInitiativeReadiness(state);
 * });
 *
 * // Cache is only invalidated when the specific fields accessed by
 * // evaluateInitiativeReadiness change — not the entire state object.
 * const result = selectReadinessScore(fullState);
 * ```
 */
export function proxyMemoize<T extends AnyObject, R>(
  fn: (state: T) => R,
): (state: T) => R {
  let cache: CacheEntry<R> | null = null;

  return (state: T): R => {
    // If we have a cache, check if tracked keys changed
    if (cache && !hasTrackedKeysChanged(state as AnyObject, cache as CacheEntry<unknown>)) {
      return cache.result;
    }

    // Run computation with tracking proxy
    const { proxy, tracked } = createTrackingProxy(state);
    const result = fn(proxy);

    // Store cache with snapshot of only tracked keys
    cache = {
      result,
      tracked,
      snapshot: extractSnapshot(state as AnyObject, tracked),
    };

    return result;
  };
}

/**
 * Creates a proxy-memoized selector with an additional argument (e.g., counts).
 * The second argument is compared by reference.
 */
export function proxyMemoize2<T extends AnyObject, A, R>(
  fn: (state: T, arg: A) => R,
): (state: T, arg: A) => R {
  let cache: (CacheEntry<R> & { argRef: A }) | null = null;

  return (state: T, arg: A): R => {
    if (
      cache &&
      cache.argRef === arg &&
      !hasTrackedKeysChanged(state as AnyObject, cache as CacheEntry<unknown>)
    ) {
      return cache.result;
    }

    const { proxy, tracked } = createTrackingProxy(state);
    const result = fn(proxy, arg);

    cache = {
      result,
      tracked,
      snapshot: extractSnapshot(state as AnyObject, tracked),
      argRef: arg,
    };

    return result;
  };
}

/**
 * Diagnostic: returns which keys a selector accesses.
 * Useful for debugging and verifying memoization coverage.
 */
export function inspectTrackedKeys<T extends AnyObject>(
  fn: (state: T) => unknown,
  sampleState: T,
): { keys: string[]; paths: string[] } {
  const { proxy, tracked } = createTrackingProxy(sampleState);
  fn(proxy);
  return {
    keys: Array.from(tracked.keys),
    paths: Array.from(tracked.paths),
  };
}
