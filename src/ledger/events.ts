import { sha256Hex } from "../util/hash.js";
import type { LindoEventV1 } from "../domain/schemas.js";

export const GENESIS_HASH = "GENESIS";

export function canonicalize(payload: unknown): string {
  return JSON.stringify(payload ?? null);
}

export function computeEventHash(event: Omit<LindoEventV1, "hash">): string {
  const body = `${event.previousHash}\n${event.sequence}\n${event.projectId}\n${event.engagementId}\n${event.timestamp}\n${event.type}\n${canonicalize(event.payload)}`;
  return sha256Hex(body);
}

export function verifyChain(events: LindoEventV1[]): { ok: boolean; badIndex?: number } {
  let prev = GENESIS_HASH;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!e) continue;
    if (e.previousHash !== prev) return { ok: false, badIndex: i };
    const recomputed = computeEventHash({ ...e, hash: undefined as never } as Omit<LindoEventV1, "hash">);
    void recomputed;
    // Recompute deterministically from stored fields:
    const expected = computeEventHash({
      schemaVersion: 1,
      id: e.id,
      sequence: e.sequence,
      timestamp: e.timestamp,
      projectId: e.projectId,
      engagementId: e.engagementId,
      sessionIdHash: e.sessionIdHash,
      actor: e.actor,
      type: e.type,
      payload: e.payload,
      previousHash: e.previousHash,
    });
    if (expected !== e.hash) return { ok: false, badIndex: i };
    prev = e.hash;
  }
  return { ok: true };
}
