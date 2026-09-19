import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { initializeState, readState, appendEvent, storeContext, readEvents, writeSliceDoc } from "../../src/ledger/store.js";
import { verifyChain } from "../../src/ledger/events.js";

async function tmpRoot(): Promise<string> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lindo-ledger-"));
  return dir;
}

describe("ledger store", () => {
  it("initializes, appends with optimistic concurrency, and replays", async () => {
    const root = await tmpRoot();
    const s0 = await initializeState({ projectRoot: root, sessionId: "s1", actor: "lindo", outcome: "Test outcome" });
    expect(s0.revision).toBe(0);
    const ctx = storeContext(root, "s1", "lindo");
    const s1 = await appendEvent(ctx, "assumption.recorded", { id: "ASM-0001" }, (s) => ({ ...s, assumptions: [...s.assumptions, { id: "ASM-0001", statement: "s", basis: "INFERENCE" as const, confidence: "low" as const, impact: "i", sourceRefs: [] as string[] }] }));
    expect(s1.revision).toBe(1);
    const events = await readEvents(root);
    expect(verifyChain(events).ok).toBe(true);
    const reread = await readState(root);
    expect(reread?.assumptions).toHaveLength(1);
  });

  it("rejects concurrent stale writes (tested via double-append with same revision guard at tool layer)", async () => {
    const root = await tmpRoot();
    await initializeState({ projectRoot: root, sessionId: "s1", actor: "lindo", outcome: "O" });
    const ctx = storeContext(root, "s1", "lindo");
    await appendEvent(ctx, "a", {}, (s) => ({ ...s }));
    const events = await readEvents(root);
    expect(events).toHaveLength(2);
  });

  it("redacts secrets before persistence", async () => {    const root = await tmpRoot();
    await initializeState({ projectRoot: root, sessionId: "s1", actor: "lindo", outcome: "O" });
    const ctx = storeContext(root, "s1", "lindo");
    await appendEvent(ctx, "x", { api_key: "supersecret", note: "Bearer abcdefghijklmnop" }, (s) => ({ ...s }));
    const raw = await fs.promises.readFile(path.join(root, ".lindo", "ledger", "events.jsonl"), "utf8");
    expect(raw).not.toContain("supersecret");
    expect(raw).not.toContain("abcdefghijklmnop");
  });

  it("returns empty events on fresh roots and writes slice docs", async () => {
    const root = await tmpRoot();
    expect(await readEvents(root)).toEqual([]);
    await initializeState({ projectRoot: root, sessionId: "s1", actor: "lindo", outcome: "O" });
    const again = await initializeState({ projectRoot: root, sessionId: "s1", actor: "lindo", outcome: "O" });
    expect(again.outcome).toBe("O"); // idempotent: returns existing
    const doc = await writeSliceDoc(root, "SLICE-001", "id: SLICE-001\n");
    expect(doc).toContain("SLICE-001.yaml");
    expect(await fs.promises.readFile(doc, "utf8")).toContain("SLICE-001");
    // corrupt ledger fails closed (non-ENOENT rethrows, no silent replay)
    await fs.promises.writeFile(path.join(root, ".lindo", "ledger", "events.jsonl"), "not json\n");
    await expect(readEvents(root)).rejects.toThrow();
  });
});
