import { describe, expect, it } from "vitest";
import { computeEventHash, verifyChain, GENESIS_HASH } from "../../src/ledger/events.js";

describe("event hash chain", () => {
  it("verifies a two-event chain and detects tampering", () => {
    const base = {
      schemaVersion: 1 as const,
      id: "EVT-1",
      sequence: 0,
      timestamp: new Date().toISOString(),
      projectId: "PRJ-X",
      engagementId: "ENG-X",
      sessionIdHash: "abc",
      actor: "lindo",
      type: "engagement.initialized",
      payload: { a: 1 },
      previousHash: GENESIS_HASH,
    };
    const h1 = computeEventHash(base);
    const e1 = { ...base, hash: h1 };
    const b2 = { ...base, id: "EVT-2", sequence: 1, type: "phase.transitioned", previousHash: h1 };
    const e2 = { ...b2, hash: computeEventHash(b2) };
    expect(verifyChain([e1, e2]).ok).toBe(true);
    expect(verifyChain([{ ...e2, payload: { tampered: true } } as never]).ok).toBe(false);
  });
});
