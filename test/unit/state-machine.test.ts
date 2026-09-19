import { describe, expect, it } from "vitest";
import { canTransitionPhase, canTransitionStatus } from "../../src/domain/state-machine.js";

describe("state machine", () => {
  it("allows canonical forward steps", () => {
    expect(canTransitionPhase("INTENT", "DISCOVER")).toBe(true);
    expect(canTransitionPhase("SLICE", "IMPLEMENT")).toBe(true);
    expect(canTransitionPhase("VERIFY", "REVIEW")).toBe(true);
  });
  it("rejects forward jumps", () => {
    expect(canTransitionPhase("INTENT", "SLICE")).toBe(false);
    expect(canTransitionPhase("DISCOVER", "IMPLEMENT")).toBe(false);
  });
  it("allows documented backward returns", () => {
    expect(canTransitionPhase("VERIFY", "IMPLEMENT")).toBe(true);
    expect(canTransitionPhase("REVIEW", "VERIFY")).toBe(true);
  });
  it("handles work status terminal + reopen", () => {
    expect(canTransitionStatus("IN_PROGRESS", "FAILED")).toBe(true);
    expect(canTransitionStatus("VERIFYING", "BLOCKED")).toBe(true);
    expect(canTransitionStatus("FAILED", "IN_PROGRESS")).toBe(true);
    expect(canTransitionStatus("RELEASED", "FAILED")).toBe(false);
    expect(canTransitionStatus("DRAFT", "READY")).toBe(true);
  });
});
