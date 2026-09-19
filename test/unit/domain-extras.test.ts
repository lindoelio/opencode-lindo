import { describe, expect, it } from "vitest";
import { claimSupported, evidenceSatisfiesCriterion } from "../../src/domain/evidence.js";
import { buildPacket, renderPacketPrompt, validateResult } from "../../src/domain/handoff.js";
import { gateRecordFor, decisionsTraceable } from "../../src/domain/gates.js";
import { statusForPhase, validatePhaseTransition } from "../../src/domain/state-machine.js";
import { needsMigration, migrateUnknown, CURRENT_SCHEMA_VERSION } from "../../src/ledger/migrations.js";
import { project, renderProjectionYaml } from "../../src/ledger/projection.js";
import { containsSecret } from "../../src/ledger/redaction.js";
import type { LindoProjectStateV1 } from "../../src/domain/schemas.js";

function baseState(): LindoProjectStateV1 {
  return {
    schemaVersion: 1,
    revision: 3,
    project: { id: "PRJ-X", canonicalDirectoryHash: "h" },
    engagement: { id: "ENG-X", createdAt: "t", updatedAt: "t", status: "VERIFYING", phase: "VERIFY" },
    outcome: "Ship the slice",
    actors: ["user"],
    constraints: ["c1"],
    nonGoals: [],
    assumptions: [{ id: "ASM-0001", statement: "s", basis: "INFERENCE", confidence: "low", impact: "i", sourceRefs: [] }],
    decisions: [{ id: "DEC-0001", title: "t", context: "c", drivers: ["d"], options: [{ name: "a", benefits: [], costs: [], risks: [] }, { name: "b", benefits: [], costs: [], risks: [] }], decision: "a", rationale: "r", consequences: [], reversibility: "easy", authority: "ALLOW", evidenceRefs: [], createdAt: "t" }],
    risks: [{ id: "R-1", statement: "risk!", severity: "critical" }],
    gates: [{ gate: "VERIFY", result: "FAIL", claim: "c", satisfied: [], missing: ["AC-1"], failed: [], waivers: [], nextAction: "n", evaluatedAt: "t" }],
    evidence: [],
    approvals: [{ id: "APR-0001", category: "release", requestedAction: "publish", resources: ["npm"], reason: "r", risks: [], status: "pending", createdAt: "t" }],
    handoffs: [],
    nextAction: { description: "Verify the slice", owner: "lindo/verifier" },
    modelProfile: { providerID: "opencode", modelID: "muse-spark-1.3", defaultVariant: "high", status: "READY" },
  };
}

describe("domain extras", () => {
  it("bounds claims by evidence strength", () => {
    expect(claimSupported("test", "covered units pass").ok).toBe(true);
    expect(claimSupported("test", "feature works end to end").ok).toBe(false);
    expect(claimSupported("visual", "backend behavior is correct").ok).toBe(false);
    expect(claimSupported("runtime", "request was accepted").ok).toBe(true);
    expect(evidenceSatisfiesCriterion({ id: "E", criterionId: "AC-1", kind: "test", status: "pass", summary: "s", command: "npm test", observedAt: "t", limitations: [] })).toBe(true);
    expect(evidenceSatisfiesCriterion({ id: "E", criterionId: "AC-1", kind: "test", status: "pass", summary: "s", observedAt: "t", limitations: [] })).toBe(false);
    expect(evidenceSatisfiesCriterion({ id: "E", criterionId: "AC-1", kind: "test", status: "skipped", summary: "s", command: "npm test", observedAt: "t", limitations: [] })).toBe(false);
  });
  it("builds and renders handoff packets, validates results", () => {
    const p = buildPacket({ id: "HND-0001", role: "explorer", objective: "map it", context: ["c"], allowedScope: ["src/**"], prohibitedScope: [".env"], questions: ["q?"], requiredEvidence: ["tree"], stopCondition: "done" });
    expect(p.output_schema).toBe("SpecialistResult@1");
    const text = renderPacketPrompt(p);
    expect(text).toContain("HND-0001");
    expect(text).toContain("Do not create subagents");
    expect(() => validateResult({ status: "PASS", summary: "", findings: [], risks: [], unknowns: [], recommended_next_action: "x" })).toThrow();
    expect(() => validateResult({ status: "PASS", summary: "s", findings: [], risks: [], unknowns: [], recommended_next_action: "" })).toThrow();
    validateResult({ status: "ADVISORY", summary: "s", findings: [], risks: [], unknowns: [], recommended_next_action: "x" });
  });
  it("records gates and checks decision traceability", () => {
    const rec = gateRecordFor("ACCEPT", "done", { result: "PASS", satisfied: ["AC-1"], missing: [], failed: [], waivers: [], nextAction: "go" });
    expect(rec.gate).toBe("ACCEPT");
    expect(rec.evaluatedAt.length).toBeGreaterThan(0);
    expect(decisionsTraceable(baseState().decisions)).toBe(true);
    expect(decisionsTraceable([{ ...baseState().decisions[0]!, rationale: "" }])).toBe(false);
  });
  it("maps phases to statuses and rejects bad transitions", () => {
    expect(statusForPhase("INTENT")).toBe("DRAFT");
    expect(statusForPhase("VERIFY")).toBe("VERIFYING");
    expect(statusForPhase("REVIEW")).toBe("REVIEWING");
    expect(statusForPhase("ACCEPT")).toBe("ACCEPTED");
    expect(statusForPhase("RELEASE")).toBe("RELEASE_READY");
    expect(statusForPhase("IMPLEMENT")).toBe("IN_PROGRESS");
    expect(() => validatePhaseTransition("INTENT", "SLICE")).toThrow();
    validatePhaseTransition("VERIFY", "VERIFY");
  });
  it("handles migrations", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
    expect(needsMigration(1)).toBe(false);
    expect(needsMigration(2)).toBe(true);
    expect(migrateUnknown({ schemaVersion: 1 })).toEqual({ schemaVersion: 1 });
    expect(() => migrateUnknown({ schemaVersion: 9 })).toThrow();
    expect(() => migrateUnknown(null)).toThrow();
  });
  it("projects compact state", () => {
    const p = project(baseState());
    expect(p.phase).toBe("VERIFY");
    expect(p.revision).toBe(3);
    expect(p.open_assumptions).toHaveLength(1);
    expect(p.decisions).toEqual(["DEC-0001"]);
    expect(p.pending_approvals).toHaveLength(1);
    expect(p.critical_risks).toHaveLength(1);
    const yaml = renderProjectionYaml(p);
    expect(yaml).toContain("phase: VERIFY");
    expect(yaml).toContain("revision: 3");
    const noSlice = project({ ...baseState(), activeSlice: undefined });
    expect(noSlice.active_slice).toBeUndefined();
  });
  it("detects secrets", () => {
    expect(containsSecret({ api_key: "x" })).toBe(true);
    expect(containsSecret("Bearer abcdefghijklmnop")).toBe(true);
    expect(containsSecret({ note: "hello world" })).toBe(false);
  });
});
