// Agent OS — Event Bus
// Append-only event log for full run observability.
// Supports filtering by type for downstream consumers.

import type { RuntimeEvent, RuntimeEventType } from "./types.ts";

export type EventListener = (event: RuntimeEvent) => void;

export class EventBus {
  private events: RuntimeEvent[] = [];
  private listeners: EventListener[] = [];

  emit(event: RuntimeEvent): void {
    this.events.push(event);
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // listeners must not break the pipeline
      }
    }
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  all(): RuntimeEvent[] {
    return [...this.events];
  }

  byType(type: RuntimeEventType): RuntimeEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  count(): number {
    return this.events.length;
  }

  clear(): void {
    this.events = [];
  }
}
