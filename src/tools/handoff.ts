import { HandoffInputSchema } from "../domain/schemas.js";
import { buildPacket, renderPacketPrompt, HANDOFF_ROLES } from "../domain/handoff.js";
import { appendEvent, readState, storeContext } from "../ledger/store.js";
import { handoffId } from "../util/ids.js";
import { projectRootOf, toolOk, type LindoRuntime } from "../runtime.js";
import type { ToolContext } from "@opencode/plugin/promise/tool";

export const HANDOFF_TOOL = {
  name: "handoff",
  description: "Prepare/complete/cancel a bounded specialist handoff (prepare returns the prompt packet; it does not fake execution)",
  input: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["prepare", "complete", "cancel"] },
      expectedRevision: { type: "number" },
      role: { type: "string", enum: ["explorer", "product", "architect", "designer", "builder", "verifier", "security", "release"] },
      objective: { type: "string" },
      context: { type: "array", items: { type: "string" } },
      allowedScope: { type: "array", items: { type: "string" } },
      prohibitedScope: { type: "array", items: { type: "string" } },
      questions: { type: "array", items: { type: "string" } },
      requiredEvidence: { type: "array", items: { type: "string" } },
      stopCondition: { type: "string" },
      handoffId: { type: "string" },
      result: { type: "object" },
      reason: { type: "string" },
    },
    required: ["action", "expectedRevision"],
    additionalProperties: false,
  },
} as const;

export async function executeHandoff(runtime: LindoRuntime, rawInput: unknown, tool: ToolContext): Promise<{ content: string }> {
  const parsed = HandoffInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error(`invalid handoff input: ${parsed.error.message}`);
  const input = parsed.data;
  const projectRoot = projectRootOf(runtime.ctx);
  const current = await readState(projectRoot);
  if (!current) throw new Error("lindo state not initialized");
  if (input.expectedRevision !== current.revision) throw new Error(`stale revision: expected ${input.expectedRevision}, actual ${current.revision}`);
  const sessionId = String((tool as unknown as { sessionID?: string }).sessionID ?? "unknown");
  const agent = String((tool as unknown as { agent?: string }).agent ?? "lindo");
  // Only lindo may orchestrate.
  if (!agent.startsWith("lindo") || (agent.includes("/") && agent !== "lindo")) {
    // agent values like "lindo" pass; "lindo/builder" etc. cannot prepare new handoffs.
    if (input.action === "prepare" && agent !== "lindo") throw new Error("only lindo may prepare handoffs");
  }
  const ctx = storeContext(projectRoot, sessionId, agent);
  void HANDOFF_ROLES;

  if (input.action === "prepare") {
    // Concurrency guard: max 3 open handoffs.
    const open = current.handoffs.filter((h) => h.status === "prepared");
    if (open.length >= 3) throw new Error("max 3 concurrent handoffs; complete or cancel one first");
    const id = handoffId(current.handoffs.length + 1);
    const record = {
      id,
      role: input.role,
      objective: input.objective,
      context: input.context,
      allowedScope: input.allowedScope,
      prohibitedScope: input.prohibitedScope,
      questions: input.questions,
      requiredEvidence: input.requiredEvidence,
      stopCondition: input.stopCondition,
      status: "prepared" as const,
    };
    const next = await appendEvent(ctx, "handoff.prepared", { id, role: input.role }, (s) => ({
      ...s,
      handoffs: [...s.handoffs, record],
    }));
    const packet = buildPacket({
      id,
      role: input.role,
      objective: input.objective,
      context: input.context,
      allowedScope: input.allowedScope,
      prohibitedScope: input.prohibitedScope,
      questions: input.questions,
      requiredEvidence: input.requiredEvidence,
      stopCondition: input.stopCondition,
    });
    return toolOk({ id, packet, prompt: renderPacketPrompt(packet), revision: next.revision });
  }
  if (input.action === "complete") {
    const existing = current.handoffs.find((h) => h.id === input.handoffId);
    if (!existing) throw new Error(`unknown handoff ${input.handoffId}`);
    if (existing.status !== "prepared") throw new Error(`handoff ${input.handoffId} already ${existing.status}`);
    const next = await appendEvent(ctx, "handoff.completed", { id: input.handoffId, status: input.result.status }, (s) => ({
      ...s,
      handoffs: s.handoffs.map((h) => (h.id === input.handoffId ? { ...h, status: "completed" as const, result: input.result } : h)),
    }));
    void runtime;
    return toolOk({ id: input.handoffId, revision: next.revision });
  }
  const existing = current.handoffs.find((h) => h.id === input.handoffId);
  if (!existing) throw new Error(`unknown handoff ${input.handoffId}`);
  const next = await appendEvent(ctx, "handoff.cancelled", { id: input.handoffId, reason: input.reason }, (s) => ({
    ...s,
    handoffs: s.handoffs.map((h) => (h.id === input.handoffId ? { ...h, status: "cancelled" as const } : h)),
  }));
  return toolOk({ id: input.handoffId, revision: next.revision });
}
