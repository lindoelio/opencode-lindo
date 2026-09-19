import { describe, expect, it } from "vitest";
import { evaluateAcceptGate } from "../../src/domain/gates.js";

describe("evidence gate", () => {
  it("passes only with criterion-linked evidence", () => {
    const r = evaluateAcceptGate({
      criteria: ["AC-001"],
      evidence: [{ id: "EVD-0001", criterionId: "AC-001", kind: "test", status: "pass", summary: "unit pass", command: "npm test", observedAt: new Date().toISOString(), limitations: [] }],
      findings: [],
    });
    expect(r.result).toBe("PASS");
  });
  it("fails without evidence", () => {
    const r = evaluateAcceptGate({ criteria: ["AC-001"], evidence: [], findings: [] });
    expect(r.result).toBe("FAIL");
    expect(r.missing).toContain("AC-001");
  });
  it("fails on tested failure and never passes on skipped", () => {
    const failed = evaluateAcceptGate({
      criteria: ["AC-001"],
      evidence: [{ id: "E1", criterionId: "AC-001", kind: "test", status: "fail", summary: "red", observedAt: new Date().toISOString(), limitations: [] }],
      findings: [],
    });
    expect(failed.result).toBe("FAIL");
    const skipped = evaluateAcceptGate({
      criteria: ["AC-001"],
      evidence: [{ id: "E2", criterionId: "AC-001", kind: "test", status: "skipped", summary: "skip", observedAt: new Date().toISOString(), limitations: [] }],
      findings: [],
    });
    expect(skipped.result).toBe("FAIL");
  });
  it("blocks on external dependency", () => {
    const r = evaluateAcceptGate({ criteria: ["AC-001"], evidence: [], findings: [], blockedBy: ["integration env down"] });
    expect(r.result).toBe("BLOCKED");
  });
});
