import type { Phase, WorkStatus } from "./schemas.js";

const PHASE_ORDER: Phase[] = [
  "INTENT",
  "DISCOVER",
  "FRAME",
  "DECIDE",
  "SLICE",
  "IMPLEMENT",
  "VERIFY",
  "REVIEW",
  "ACCEPT",
  "RELEASE",
];

/** Allowed forward step plus documented backward returns. Forward jumps of >1 are rejected. */
const BACKWARD_EDGES: Record<Phase, Phase[]> = {
  INTENT: [],
  DISCOVER: ["INTENT"],
  FRAME: ["INTENT", "DISCOVER"],
  DECIDE: ["FRAME", "DISCOVER"],
  SLICE: ["DECIDE", "FRAME"],
  IMPLEMENT: ["SLICE"],
  VERIFY: ["IMPLEMENT", "SLICE"],
  REVIEW: ["VERIFY", "IMPLEMENT"],
  ACCEPT: ["REVIEW", "VERIFY"],
  RELEASE: ["ACCEPT"],
};

export function canTransitionPhase(from: Phase, to: Phase): boolean {
  if (from === to) return true;
  const fi = PHASE_ORDER.indexOf(from);
  const ti = PHASE_ORDER.indexOf(to);
  if (ti === fi + 1) return true; // canonical forward step
  return (BACKWARD_EDGES[to] ?? []).includes(from) || (BACKWARD_EDGES[from] ?? []).includes(to);
}

export function validatePhaseTransition(from: Phase, to: Phase): void {
  if (!canTransitionPhase(from, to)) {
    throw new Error(`invalid phase transition: ${from} -> ${to}`);
  }
}

const STATUS_ORDER: WorkStatus[] = [
  "DRAFT",
  "READY",
  "IN_PROGRESS",
  "VERIFYING",
  "REVIEWING",
  "ACCEPTED",
  "RELEASE_READY",
  "RELEASED",
];

const TERMINAL: WorkStatus[] = ["FAILED", "BLOCKED", "CANCELLED"];

export function canTransitionStatus(from: WorkStatus, to: WorkStatus): boolean {
  if (from === to) return true;
  if (TERMINAL.includes(to)) {
    // Terminal states reachable from any active state, but never from RELEASED.
    return from !== "RELEASED";
  }
  if (TERMINAL.includes(from)) {
    // Reopen allowed back to IN_PROGRESS (records reason), nothing else silent.
    return to === "IN_PROGRESS";
  }
  const fi = STATUS_ORDER.indexOf(from);
  const ti = STATUS_ORDER.indexOf(to);
  return ti === fi + 1 || ti === fi; // single forward step or self
}

export function statusForPhase(phase: Phase): WorkStatus {
  switch (phase) {
    case "INTENT":
      return "DRAFT";
    case "DISCOVER":
    case "FRAME":
    case "DECIDE":
    case "SLICE":
      return "IN_PROGRESS";
    case "IMPLEMENT":
      return "IN_PROGRESS";
    case "VERIFY":
      return "VERIFYING";
    case "REVIEW":
      return "REVIEWING";
    case "ACCEPT":
      return "ACCEPTED";
    case "RELEASE":
      return "RELEASE_READY";
  }
}
