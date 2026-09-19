import type { DecisionRef, EvidenceRef, GateRef } from "./schemas.js";

export interface GateResult {
  result: "PASS" | "FAIL" | "BLOCKED";
  satisfied: string[];
  missing: string[];
  failed: string[];
  waivers: string[];
  nextAction: string;
}

export function evaluateAcceptGate(input: {
  criteria: string[];
  evidence: EvidenceRef[];
  findings: Array<{ severity: string }>;
  waivers?: string[];
  blockedBy?: string[];
}): GateResult {
  const waivers = input.waivers ?? [];
  const byCriterion = new Map<string, EvidenceRef[]>();
  for (const e of input.evidence) {
    const list = byCriterion.get(e.criterionId) ?? [];
    list.push(e);
    byCriterion.set(e.criterionId, list);
  }
  const satisfied: string[] = [];
  const missing: string[] = [];
  const failed: string[] = [];
  for (const c of input.criteria) {
    if (waivers.includes(c)) continue;
    const evs = byCriterion.get(c) ?? [];
    if (evs.some((e) => e.status === "fail")) {
      failed.push(c);
      continue;
    }
    // pass requires verifiable artifact/command/digest/source reference
    const passing = evs.filter(
      (e) => e.status === "pass" && (e.artifactRef || e.command || e.digest),
    );
    if (passing.length > 0) satisfied.push(c);
    else missing.push(c);
  }
  const blocking = input.findings.some((f) => f.severity === "critical" || f.severity === "high");
  if (input.blockedBy && input.blockedBy.length > 0 && failed.length === 0 && missing.length > 0) {
    return { result: "BLOCKED", satisfied, missing, failed, waivers, nextAction: `Resolve blocker: ${input.blockedBy[0]}` };
  }
  if (failed.length > 0 || blocking) {
    return { result: "FAIL", satisfied, missing, failed, waivers, nextAction: failed.length > 0 ? `Fix failed criteria: ${failed.join(", ")}` : "Resolve critical/high review findings" };
  }
  if (missing.length > 0) {
    return { result: "FAIL", satisfied, missing, failed, waivers, nextAction: `Provide evidence for: ${missing.join(", ")}` };
  }
  return { result: "PASS", satisfied, missing, failed, waivers, nextAction: "Promote per release contract" };
}

export function gateRecordFor(gate: GateRef["gate"], claim: string, result: GateResult): GateRef {
  return {
    gate,
    result: result.result,
    claim,
    satisfied: result.satisfied,
    missing: result.missing,
    failed: result.failed,
    waivers: result.waivers,
    nextAction: result.nextAction,
    evaluatedAt: new Date().toISOString(),
  };
}

export function decisionsTraceable(decisions: DecisionRef[]): boolean {
  return decisions.every((d) => d.drivers.length > 0 && d.options.length >= 2 && d.rationale.length > 0);
}
