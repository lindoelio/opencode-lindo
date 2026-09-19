import type { EvidenceRef } from "./schemas.js";

/** CLAIM strength ≤ EVIDENCE strength. Maps evidence kinds to the claims they support. */
const SUPPORTS: Record<EvidenceRef["kind"], string[]> = {
  test: ["covered units pass", "types compile"],
  runtime: ["request was accepted", "rendered state observed"],
  visual: ["rendered state observed"],
  source: ["source inspected"],
  review: ["independent review completed"],
  release: ["release candidate passed defined checks"],
};

const FORBIDDEN: Array<{ evidence: EvidenceRef["kind"]; claim: RegExp; reason: string }> = [
  { evidence: "test", claim: /end.?to.?end|integration.*healthy|production.*ready/i, reason: "unit tests do not prove integration/production" },
  { evidence: "runtime", claim: /delivery completed|backend.*correct|no defects/i, reason: "single response does not prove async completion" },
  { evidence: "visual", claim: /backend.*correct|api.*correct/i, reason: "screenshot does not prove backend" },
  { evidence: "review", claim: /production.*healthy|deployed/i, reason: "review is not deploy proof" },
];

export function claimSupported(kind: EvidenceRef["kind"], claim: string): { ok: boolean; reason?: string } {
  for (const f of FORBIDDEN) {
    if (f.evidence === kind && f.claim.test(claim)) return { ok: false, reason: f.reason };
  }
  const supported = SUPPORTS[kind] ?? [];
  if (supported.some((s) => claim.toLowerCase().includes(s))) return { ok: true };
  // Conservative default: unknown claims need explicit review evidence.
  return { ok: false, reason: `claim exceeds ${kind} evidence strength` };
}

export function evidenceSatisfiesCriterion(e: EvidenceRef): boolean {
  if (e.status !== "pass") return false;
  return Boolean(e.artifactRef || e.command || e.digest);
}
