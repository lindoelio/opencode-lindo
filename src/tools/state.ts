import { LindoStateInputSchema } from "../domain/schemas.js";
import { validatePhaseTransition, statusForPhase } from "../domain/state-machine.js";
import { initializeState, readState, appendEvent, storeContext } from "../ledger/store.js";
import { projectRootOf, toolOk, type LindoRuntime } from "../runtime.js";
import type { ToolContext } from "@opencode/plugin/promise/tool";

export const LINDO_STATE_TOOL = {
  name: "state",
  description:
    "Initialize, read, transition, or register guardrails for the Lindo engagement (optimistic revision, state machine validated). Guardrails are the only mechanism that makes Lindo ask before an action; the default is autonomous execution.",
  input: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["read", "initialize", "transition", "guard"] },
      outcome: { type: "string" },
      actors: { type: "array", items: { type: "string" } },
      constraints: { type: "array", items: { type: "string" } },
      nonGoals: { type: "array", items: { type: "string" } },
      acceptance: { type: "array", items: { type: "string" } },
      expectedRevision: { type: "number" },
      to: { type: "string" },
      reason: { type: "string" },
      nextAction: { type: "string" },
      mode: { type: "string", enum: ["yolo", "guarded"] },
      add: { type: "array", items: { type: "string" } },
      remove: { type: "array", items: { type: "string" } },
      clear: { type: "boolean" },
    },
    required: ["action"],
    additionalProperties: false,
  },
} as const;

export async function executeState(runtime: LindoRuntime, rawInput: unknown, tool: ToolContext): Promise<{ content: string }> {
  const parsed = LindoStateInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error(`invalid lindo_state input: ${parsed.error.message}`);
  const input = parsed.data;
  const projectRoot = projectRootOf(runtime.ctx);
  const sessionId = String((tool as unknown as { sessionID?: string }).sessionID ?? "unknown");
  const agent = String((tool as unknown as { agent?: string }).agent ?? "lindo");

  if (input.action === "read") {
    const state = await readState(projectRoot);
    if (!state) return toolOk({ initialized: false, hint: "run lindo_state initialize via /lindo/start" });
    return toolOk({ initialized: true, state });
  }
  if (input.action === "initialize") {
    const state = await initializeState({
      projectRoot,
      sessionId,
      actor: agent,
      outcome: input.outcome,
      ...(input.actors ? { actors: input.actors } : {}),
      ...(input.constraints ? { constraints: input.constraints } : {}),
      ...(input.nonGoals ? { nonGoals: input.nonGoals } : {}),
      ...(input.acceptance ? { acceptance: input.acceptance } : {}),
    });
    return toolOk({ initialized: true, state });
  }
  const current = await readState(projectRoot);
  if (!current) throw new Error("lindo state not initialized");
  if (input.expectedRevision !== current.revision) {
    throw new Error(`stale revision: expected ${input.expectedRevision}, actual ${current.revision}`);
  }
  const ctx = storeContext(projectRoot, sessionId, agent);

  if (input.action === "guard") {
    const next = await appendEvent(ctx, "guardrails.updated", {
      mode: input.mode,
      add: input.add ?? [],
      remove: input.remove ?? [],
      clear: input.clear === true,
    }, (s) => {
      let guardrails = [...s.guardrails];
      if (input.clear === true) guardrails = [];
      if (input.remove && input.remove.length > 0) guardrails = guardrails.filter((g) => !input.remove!.includes(g));
      if (input.add && input.add.length > 0) guardrails = [...new Set([...guardrails, ...input.add])];
      return { ...s, guardrails, ...(input.mode ? { autonomyMode: input.mode } : {}) };
    });
    return toolOk({
      guardrails: next.guardrails,
      mode: next.autonomyMode ?? runtime.options.autonomy?.mode ?? "yolo",
      note: next.guardrails.length === 0 && (next.autonomyMode ?? runtime.options.autonomy?.mode ?? "yolo") === "yolo"
        ? "No guardrails: Lindo asks nothing and executes autonomously."
        : "Matching actions now require explicit authorization.",
      revision: next.revision,
    });
  }

  // transition
  validatePhaseTransition(current.engagement.phase, input.to);
  const nextStatus = statusForPhase(input.to);
  const next = await appendEvent(ctx, "phase.transitioned", { from: current.engagement.phase, to: input.to, reason: input.reason }, (s) => ({
    ...s,
    engagement: { ...s.engagement, phase: input.to, status: nextStatus },
    nextAction: { description: input.nextAction, owner: "lindo" },
  }));
  return toolOk({ state: next });
}
