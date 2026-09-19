import { RecordDecisionInputSchema } from "../domain/schemas.js";
import { appendEvent, readState, storeContext, writeDecisionDoc } from "../ledger/store.js";
import { decisionId } from "../util/ids.js";
import { projectRootOf, toolOk, type LindoRuntime } from "../runtime.js";
import type { ToolContext } from "@opencode/plugin/promise/tool";

export const DECISION_TOOL = {
  name: "record_decision",
  description: "Record a Decision Record with options, trade-offs, reversibility, and authority",
  input: {
    type: "object",
    properties: {
      expectedRevision: { type: "number" },
      title: { type: "string" },
      context: { type: "string" },
      drivers: { type: "array", items: { type: "string" } },
      options: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            benefits: { type: "array", items: { type: "string" } },
            costs: { type: "array", items: { type: "string" } },
            risks: { type: "array", items: { type: "string" } },
          },
          required: ["name", "benefits", "costs", "risks"],
          additionalProperties: false,
        },
      },
      decision: { type: "string" },
      rationale: { type: "string" },
      consequences: { type: "array", items: { type: "string" } },
      reversibility: { type: "string", enum: ["easy", "moderate", "hard", "irreversible"] },
      authority: { type: "string", enum: ["ALLOW", "ALLOW_WITH_RECORD", "ASK"] },
      evidenceRefs: { type: "array", items: { type: "string" } },
    },
    required: ["expectedRevision", "title", "context", "drivers", "options", "decision", "rationale", "consequences", "reversibility", "authority"],
    additionalProperties: false,
  },
} as const;

export async function executeDecision(runtime: LindoRuntime, rawInput: unknown, tool: ToolContext): Promise<{ content: string }> {
  const parsed = RecordDecisionInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error(`invalid decision input: ${parsed.error.message}`);
  const input = parsed.data;
  const projectRoot = projectRootOf(runtime.ctx);
  const current = await readState(projectRoot);
  if (!current) throw new Error("lindo state not initialized");
  if (input.expectedRevision !== current.revision) throw new Error(`stale revision: expected ${input.expectedRevision}, actual ${current.revision}`);
  const sessionId = String((tool as unknown as { sessionID?: string }).sessionID ?? "unknown");
  const agent = String((tool as unknown as { agent?: string }).agent ?? "lindo");
  const id = decisionId(current.decisions.length + 1);
  const record = {
    id,
    title: input.title,
    context: input.context,
    drivers: input.drivers,
    options: input.options,
    decision: input.decision,
    rationale: input.rationale,
    consequences: input.consequences,
    reversibility: input.reversibility,
    authority: input.authority,
    evidenceRefs: input.evidenceRefs ?? [],
    createdAt: new Date().toISOString(),
  };
  const ctx = storeContext(projectRoot, sessionId, agent);
  const next = await appendEvent(ctx, "decision.recorded", { id, title: input.title }, (s) => ({
    ...s,
    decisions: [...s.decisions, record],
  }));
  const markdown = [
    `# ${id}: ${input.title}`,
    ``,
    `## Context`,
    input.context,
    ``,
    `## Drivers`,
    ...input.drivers.map((d) => `- ${d}`),
    ``,
    `## Options`,
    ...input.options.flatMap((o) => [`### ${o.name}`, `- Benefits: ${o.benefits.join("; ")}`, `- Costs: ${o.costs.join("; ")}`, `- Risks: ${o.risks.join("; ")}`, ``]),
    `## Decision`,
    input.decision,
    ``,
    `## Rationale`,
    input.rationale,
    ``,
    `## Consequences`,
    ...input.consequences.map((c) => `- ${c}`),
    ``,
    `- Reversibility: ${input.reversibility}`,
    `- Authority: ${input.authority}`,
  ].join("\n");
  await writeDecisionDoc(projectRoot, id, markdown);
  return toolOk({ id, revision: next.revision });
}
