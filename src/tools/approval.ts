import { ApprovalInputSchema } from "../domain/schemas.js";
import { appendEvent, readState, storeContext } from "../ledger/store.js";
import { approvalId } from "../util/ids.js";
import { projectRootOf, toolOk, type LindoRuntime } from "../runtime.js";
import type { ToolContext } from "@opencode/plugin/promise/tool";

export const APPROVAL_TOOL = {
  name: "request_approval",
  description: "Open or resolve a scoped approval (resolve requires an explicit current user message)",
  input: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["open", "resolve"] },
      expectedRevision: { type: "number" },
      category: { type: "string", enum: ["external_write", "release", "production", "destructive", "financial", "legal", "scope"] },
      requestedAction: { type: "string" },
      resources: { type: "array", items: { type: "string" } },
      reason: { type: "string" },
      risks: { type: "array", items: { type: "string" } },
      rollback: { type: "string" },
      expiresAt: { type: "string" },
      approvalId: { type: "string" },
      decision: { type: "string", enum: ["approved", "rejected"] },
      userMessageId: { type: "string" },
    },
    required: ["action", "expectedRevision"],
    additionalProperties: false,
  },
} as const;

export async function executeApproval(runtime: LindoRuntime, rawInput: unknown, tool: ToolContext): Promise<{ content: string }> {
  const parsed = ApprovalInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error(`invalid approval input: ${parsed.error.message}`);
  const input = parsed.data;
  const projectRoot = projectRootOf(runtime.ctx);
  const current = await readState(projectRoot);
  if (!current) throw new Error("lindo state not initialized");
  if (input.expectedRevision !== current.revision) throw new Error(`stale revision: expected ${input.expectedRevision}, actual ${current.revision}`);
  const sessionId = String((tool as unknown as { sessionID?: string }).sessionID ?? "unknown");
  const agent = String((tool as unknown as { agent?: string }).agent ?? "lindo");
  const ctx = storeContext(projectRoot, sessionId, agent);

  if (input.action === "open") {
    const id = approvalId(current.approvals.length + 1);
    const record = {
      id,
      category: input.category,
      requestedAction: input.requestedAction,
      resources: input.resources,
      reason: input.reason,
      risks: input.risks,
      rollback: input.rollback,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
    };
    const next = await appendEvent(ctx, "approval.opened", { id, category: input.category }, (s) => ({
      ...s,
      approvals: [...s.approvals, record],
    }));
    return toolOk({ id, status: "pending", revision: next.revision });
  }
  // resolve: only an explicit current user message approves — assistant/specialist text never approves.
  if (!input.userMessageId || input.userMessageId.trim().length === 0) {
    throw new Error("resolve requires userMessageId of an explicit current user message");
  }
  const existing = current.approvals.find((a) => a.id === input.approvalId);
  if (!existing) throw new Error(`unknown approval ${input.approvalId}`);
  if (existing.status !== "pending") throw new Error(`approval ${input.approvalId} already ${existing.status}`);
  const next = await appendEvent(ctx, "approval.resolved", { id: input.approvalId, decision: input.decision }, (s) => ({
    ...s,
    approvals: s.approvals.map((a) => (a.id === input.approvalId ? { ...a, status: input.decision, resolvedAt: new Date().toISOString() } : a)),
  }));
  return toolOk({ id: input.approvalId, status: input.decision, revision: next.revision });
}
