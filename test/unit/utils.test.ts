import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { sha256Hex, hashEventPayload, newId, shortHash } from "../../src/util/hash.js";
import { engagementId, eventId, decisionId, sliceId, evidenceId, approvalId, handoffId } from "../../src/util/ids.js";
import { lindoDir, statePath, eventsPath, resolveInside, assertNoSymlinkEscape, isLindoManagedAgentPath } from "../../src/util/paths.js";

describe("util", () => {
  it("hashes deterministically", () => {
    expect(sha256Hex("abc")).toBe(sha256Hex("abc"));
    expect(sha256Hex("abc")).toHaveLength(64);
    expect(hashEventPayload("p", "prev")).toBe(sha256Hex("prev\np"));
    expect(newId("X")).toMatch(/^X-[0-9A-F]{8}$/);
    expect(shortHash("abc")).toBe(sha256Hex("abc").slice(0, 16));
    expect(shortHash("abc", 8)).toHaveLength(8);
  });
  it("generates well-formed ids", () => {
    expect(engagementId()).toMatch(/^ENG-/);
    expect(eventId()).toMatch(/^EVT-/);
    expect(decisionId(1)).toBe("DEC-0001");
    expect(sliceId(2)).toBe("SLICE-002");
    expect(evidenceId(3)).toBe("EVD-0003");
    expect(approvalId(4)).toBe("APR-0004");
    expect(handoffId(5)).toBe("HND-0005");
  });
  it("builds ledger paths and guards traversal", () => {
    expect(lindoDir("/p")).toBe("/p/.lindo");
    expect(statePath("/p")).toBe("/p/.lindo/state.json");
    expect(eventsPath("/p")).toBe("/p/.lindo/ledger/events.jsonl");
    expect(() => resolveInside("/p", "../evil")).toThrow();
    expect(resolveInside("/p", ".lindo/state.json")).toBe(path.resolve("/p/.lindo/state.json"));
    expect(isLindoManagedAgentPath(".opencode/agents/lindo.md")).toBe(true);
    expect(isLindoManagedAgentPath(".opencode/agents/lindo/explorer.md")).toBe(true);
    expect(isLindoManagedAgentPath(".lindo/README.md")).toBe(true);
    expect(isLindoManagedAgentPath("src/index.ts")).toBe(false);
  });
  it("refuses symlink escape but allows in-root links", async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lindo-paths-"));
    const outside = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lindo-outside-"));
    await fs.promises.writeFile(path.join(outside, "secret.txt"), "x");
    await fs.promises.symlink(path.join(outside, "secret.txt"), path.join(root, "evil-link"));
    await expect(assertNoSymlinkEscape(root, path.join(root, "evil-link"))).rejects.toThrow();
    await fs.promises.writeFile(path.join(root, "real.txt"), "y");
    await fs.promises.symlink(path.join(root, "real.txt"), path.join(root, "ok-link"));
    await expect(assertNoSymlinkEscape(root, path.join(root, "ok-link"))).resolves.toBe(path.join(root, "ok-link"));
    await expect(assertNoSymlinkEscape(root, path.join(root, "..", "escape"))).rejects.toThrow();
  });
});
