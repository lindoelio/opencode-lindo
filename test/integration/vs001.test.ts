import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { initializeState, readState, appendEvent, storeContext, readEvents } from "../../src/ledger/store.js";
import { evaluateAcceptGate } from "../../src/domain/gates.js";
import { verifyChain } from "../../src/ledger/events.js";

/**
 * VS-001 (deterministic, model-free): clean install -> intent -> decision ->
 * slice -> builder -> tests -> verifier -> ACCEPT gate. Proves the ledger,
 * gate engine, and restart persistence without spending model budget.
 * Real-model E2E remains opt-in under LINDO_E2E=1.
 */
describe("VS-001 deterministic slice loop", () => {
  it("goes from intent to ACCEPT PASS with criterion-linked evidence", async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lindo-vs001-"));
    const s0 = await initializeState({
      projectRoot: root,
      sessionId: "s-vs001",
      actor: "lindo",
      outcome: "Archive tasks and filter Active/Archived",
      actors: ["board user"],
      acceptance: ["AC-001", "AC-002"],
    });
    expect(s0.engagement.phase).toBe("INTENT");
    const ctx = storeContext(root, "s-vs001", "lindo");

    // DECIDE
    const s1 = await appendEvent(ctx, "decision.recorded", { id: "DEC-0001" }, (s) => ({
      ...s,
      decisions: [...s.decisions, {
        id: "DEC-0001", title: "Archive via capability function", context: "task board fixture",
        drivers: ["reversibility", "testability"], options: [
          { name: "flag mutation", benefits: ["simple"], costs: ["leaky"], risks: ["filter drift"] },
          { name: "capability function + filter contract", benefits: ["bounded"], costs: ["small refactor"], risks: ["none known"] },
        ],
        decision: "capability function + filter contract", rationale: "bounded and reversible",
        consequences: ["board.ts owns archive semantics"], reversibility: "easy" as const,
        authority: "ALLOW_WITH_RECORD" as const, evidenceRefs: [], createdAt: new Date().toISOString(),
      }],
    }));

    // SLICE (single active slice with real-path validation + rollback)
    const s2 = await appendEvent(ctx, "slice.defined", { id: "SLICE-001" }, (s) => ({
      ...s,
      engagement: { ...s.engagement, phase: "IMPLEMENT" as const, status: "IN_PROGRESS" as const },
      activeSlice: {
        id: "SLICE-001", title: "Archive + Active/Archived filter", userOutcome: "user archives and filters tasks",
        entryState: "board without archive", happyPath: ["add task", "archive task", "filter active", "filter archived"],
        inScope: ["src/board.ts"], outOfScope: ["auth", "db", "deploy"], allowedFiles: ["src/board.ts"],
        prohibitedFiles: ["src/auth.ts"], acceptanceCriteria: ["AC-001", "AC-002"],
        validationCommands: ["npm test"], runtimeProof: ["board flow test"], visualProof: [],
        risks: ["none"], rollback: "revert src/board.ts", owner: "lindo", status: "IN_PROGRESS",
      },
      nextAction: { description: "Implement SLICE-001", owner: "lindo/builder" },
    }));
    expect(s2.activeSlice?.id).toBe("SLICE-001");

    // BUILD + VERIFY: criterion-linked evidence (command digest present)
    const s3 = await appendEvent(ctx, "evidence.submitted", { id: "EVD-0001" }, (s) => ({
      ...s,
      engagement: { ...s.engagement, phase: "VERIFY" as const, status: "VERIFYING" as const },
      evidence: [...s.evidence, { id: "EVD-0001", criterionId: "AC-001", kind: "test" as const, status: "pass" as const, summary: "board flow test passes", command: "npm test", digest: "abc123", observedAt: new Date().toISOString(), limitations: [] }],
    }));
    const s4 = await appendEvent(ctx, "evidence.submitted", { id: "EVD-0002" }, (s) => ({
      ...s,
      evidence: [...s.evidence, { id: "EVD-0002", criterionId: "AC-002", kind: "test" as const, status: "pass" as const, summary: "archived filter returns only archived", command: "npm test", digest: "def456", observedAt: new Date().toISOString(), limitations: [] }],
    }));

    // REVIEW (independent verifier, no critical findings) + ACCEPT
    const gate = evaluateAcceptGate({
      criteria: s4.activeSlice?.acceptanceCriteria ?? [],
      evidence: s4.evidence,
      findings: [{ severity: "note" }],
    });
    expect(gate.result).toBe("PASS");
    const s5 = await appendEvent(ctx, "gate.evaluated", { gate: "ACCEPT", result: gate.result }, (s) => ({
      ...s,
      engagement: { ...s.engagement, phase: "ACCEPT" as const, status: "ACCEPTED" as const },
      gates: [...s.gates, { gate: "ACCEPT" as const, result: gate.result, claim: "SLICE-001 done", satisfied: gate.satisfied, missing: gate.missing, failed: gate.failed, waivers: gate.waivers, nextAction: gate.nextAction, evaluatedAt: new Date().toISOString() }],
      nextAction: { description: "Release readiness per contract", owner: "lindo/release" },
    }));

    // Restart persistence: reread + chain verify
    const reread = await readState(root);
    expect(reread?.engagement.status).toBe("ACCEPTED");
    expect(reread?.decisions.map((d) => d.id)).toContain("DEC-0001");
    expect(reread?.nextAction.owner).toBe("lindo/release");
    expect(verifyChain(await readEvents(root)).ok).toBe(true);
    expect(s5.revision).toBeGreaterThan(s1.revision);
  });
});
