// Agent OS — Shared Utilities

import type { Artifact } from "./types.ts";

export function nowIso(): string {
  return new Date().toISOString();
}

export function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2, 10)}`;
}

export function createArtifact(
  kind: string,
  title: string,
  content: unknown,
  metadata?: Record<string, unknown>,
): Artifact {
  return {
    id: cryptoRandomId(),
    kind,
    title,
    content,
    version: 1,
    createdAt: nowIso(),
    metadata,
  };
}
