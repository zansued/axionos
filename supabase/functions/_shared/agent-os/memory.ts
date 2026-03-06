// Agent OS — Runtime Memory
// In-memory key-value store scoped to a single run.
// Future: back with persistent storage (agent_memory table).

import type { IMemory } from "./types.ts";

export class RuntimeMemory implements IMemory {
  private store = new Map<string, unknown>();

  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  snapshot(): Record<string, unknown> {
    return Object.fromEntries(this.store.entries());
  }

  clear(): void {
    this.store.clear();
  }

  keys(): string[] {
    return [...this.store.keys()];
  }
}
