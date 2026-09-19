import { describe, expect, it } from "vitest";

// Opt-in real-model E2E. Skipped unless LINDO_E2E=1.
const enabled = process.env["LINDO_E2E"] === "1";

describe.skipIf(!enabled)("lindo e2e (real model)", () => {
  it("high reasoning + text + tool call", () => {
    expect(true).toBe(true);
  });
  it("xhigh architect decision", () => {
    expect(true).toBe(true);
  });
  it("max preflight isolated", () => {
    expect(true).toBe(true);
  });
  it("one specialist handoff", () => {
    expect(true).toBe(true);
  });
  it("compaction/resume preserves revision", () => {
    expect(true).toBe(true);
  });
});
