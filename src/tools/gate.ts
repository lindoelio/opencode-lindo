import { EvaluateGateInputSchema } from "../domain/schemas.js";
import { evaluateAcceptGate, gateRecordFor } from "../domain/gates.js";
import { appendEvent, readState, storeContext } from "../ledger/store.js";
import { projectRootOf, toolOk, type LindoRuntime } from "../runtime.js";
import type { ToolContext } from "@opencode/plugin/promise/tool";

export const GATE_TOOL = {
  name: "evaluate_gate",
  description: "Deterministically evaluate a gate from ledger state (result computed by plugin, not chosen by model). REVIEW and ACCEPT require a completed lindo/verifier handoff.",
  input: {
    type: "object",
    properties: {
      gate: { type: "string", enum: ["INTENT", "DISCOVERY", "SLICE", "VERIFY", "REVIEW", "ACCEPT", "RELEASE"] },
      claim: { type: "string" },
      expectedRevision: { type: "number" },
    },
    required: ["gate", "claim", "expectedRevision"],
    additionalProperties: false,
  },
} as const;

export async function executeGate(runtime: LindoRuntime, rawInput: unknown, tool: ToolContext): Promise<{ content: string }> {
  const parsed = EvaluateGateInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error(`invalid gate input: ${parsed.error.message}`);
  const input = parsed.data;
  const projectRoot = projectRootOf(runtime.ctx);
  const current = await readState(projectRoot);
  if (!current) throw new Error("lindo state not initialized");
  if (input.expectedRevision !== current.revision) throw new Error(`stale revision: expected ${input.expectedRevision}, actual ${current.revision}`);

  const criteria = current.activeSlice?.acceptanceCriteria ?? [];
  const findings = current.handoffs.flatMap((h) => {
    const r = h.result as { findings?: Array<{ severity: string }> } | undefined;
    return r?.findings ?? [];
  });
  const pendingApprovals = current.approvals.filter((a) => a.status === "pending").map((a) => a.id);
  const highImpactLowConfidence = current.assumptions.some((a) => a.confidence === "low");
  // Independent review is mechanical, not advisory: REVIEW/ACCEPT require a
  // completed lindo/verifier handoff. Self-verification never passes the gate.
  const independentReview = current.handoffs.some((h) => h.role === "verifier" && h.status === "completed");

  let result;
  if ((input.gate === "REVIEW" || input.gate === "ACCEPT") && !independentReview) {
    result = { result: "FAIL" as const, satisfied: [] as string[], missing: ["independent-verifier-review"], failed: [] as string[], waivers: [] as string[], nextAction: "Prepare a lindo/verifier handoff via lindo_handoff, complete it with evidence, then re-evaluate" };
  } else if (criteria.length === 0 && (input.gate === "VERIFY" || input.gate === "REVIEW" || input.gate === "ACCEPT")) {
    // No slice, nothing to verify: fail honestly instead of passing vacuously.
    result = { result: "FAIL" as const, satisfied: [] as string[], missing: ["active-slice"], failed: [] as string[], waivers: [] as string[], nextAction: "Define an active slice first" };
  } else if (input.gate === "ACCEPT" || input.gate === "VERIFY" || input.gate === "REVIEW") {
    result = evaluateAcceptGate({
      criteria,
      evidence: current.evidence,
      findings: findings.map((f) => ({ severity: f.severity })),
      blockedBy: current.nextAction.blockedBy,
    });
    // High-impact low-confidence assumptions block ACCEPT until waived.
    if (input.gate === "ACCEPT" && highImpactLowConfidence && result.result === "PASS") {
      result = { ...result, result: "FAIL" as const, missing: [...result.missing, "open-assumptions"], nextAction: "Validate or explicitly waive low-confidence high-impact assumptions" };
    }
  } else if (input.gate === "RELEASE") {
    const accept = current.gates.find((g) => g.gate === "ACCEPT");
    if (!accept || accept.result !== "PASS") {
      result = { result: "FAIL" as const, satisfied: [], missing: ["ACCEPT PASS required"], failed: [], waivers: [], nextAction: "Pass ACCEPT before RELEASE" };
    } else if (pendingApprovals.length > 0) {
      result = { result: "BLOCKED" as const, satisfied: [], missing: pendingApprovals, failed: [], waivers: [], nextAction: `Await approvals: ${pendingApprovals.join(", ")}` };
    } else {
      result = { result: "PASS" as const, satisfied: ["accept-pass", "approvals-clear"], missing: [], failed: [], waivers: [], nextAction: "Promote same verified artifact" };
    }
  } else {
    // INTENT/DISCOVERY/SLICE: structural checks with honest satisfied lists.
    const checks: Array<{ id: string; ok: boolean }> = [{ id: "outcome", ok: current.outcome.length > 0 }];
    if (input.gate !== "INTENT") {
      checks.push({ id: "discovery-records", ok: current.assumptions.length + current.decisions.length > 0 });
    }
    if (input.gate === "SLICE") checks.push({ id: "active-slice", ok: current.activeSlice !== undefined });
    const missing = checks.filter((c) => !c.ok).map((c) => c.id);
    const satisfied = checks.filter((c) => c.ok).map((c) => c.id);
    result = missing.length === 0
      ? { result: "PASS" as const, satisfied, missing: [], failed: [], waivers: [], nextAction: "Proceed" }
      : { result: "FAIL" as const, satisfied, missing, failed: [], waivers: [], nextAction: `Provide: ${missing.join(", ")}` };
  }

  const sessionId = String((tool as unknown as { sessionID?: string }).sessionID ?? "unknown");
  const agent = String((tool as unknown as { agent?: string }).agent ?? "lindo");
  const ctx = storeContext(projectRoot, sessionId, agent);
  const record = gateRecordFor(input.gate, input.claim, result);
  const next = await appendEvent(ctx, "gate.evaluated", { gate: input.gate, result: result.result }, (s) => ({
    ...s,
    gates: [...s.gates, record],
  }));
  return toolOk({ ...result, revision: next.revision });
}
