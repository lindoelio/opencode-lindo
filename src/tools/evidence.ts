import { SubmitEvidenceInputSchema } from "../domain/schemas.js";
import { appendEvent, readState, storeContext, writeEvidenceDoc } from "../ledger/store.js";
import { evidenceId } from "../util/ids.js";
import { sha256Hex } from "../util/hash.js";
import { projectRootOf, toolOk, type LindoRuntime } from "../runtime.js";
import type { ToolContext } from "@opencode/plugin/promise/tool";

export const EVIDENCE_TOOL = {
  name: "submit_evidence",
  description: "Submit criterion-linked evidence (pass requires artifact, command digest, or source ref)",
  input: {
    type: "object",
    properties: {
      expectedRevision: { type: "number" },
      criterionId: { type: "string" },
      kind: { type: "string", enum: ["test", "runtime", "visual", "source", "review", "release"] },
      status: { type: "string", enum: ["pass", "fail", "partial", "skipped"] },
      summary: { type: "string" },
      artifactRef: { type: "string" },
      command: { type: "string" },
      digest: { type: "string" },
      observedAt: { type: "string" },
      limitations: { type: "array", items: { type: "string" } },
    },
    required: ["expectedRevision", "criterionId", "kind", "status", "summary", "observedAt"],
    additionalProperties: false,
  },
} as const;

export async function executeEvidence(runtime: LindoRuntime, rawInput: unknown, tool: ToolContext): Promise<{ content: string }> {
  const parsed = SubmitEvidenceInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error(`invalid evidence input: ${parsed.error.message}`);
  const input = parsed.data;
  if (input.status === "pass" && !input.artifactRef && !input.command && !input.digest) {
    throw new Error("pass requires artifactRef, command, or digest (exit code alone is not evidence)");
  }
  const projectRoot = projectRootOf(runtime.ctx);
  const current = await readState(projectRoot);
  if (!current) throw new Error("lindo state not initialized");
  if (input.expectedRevision !== current.revision) throw new Error(`stale revision: expected ${input.expectedRevision}, actual ${current.revision}`);
  // Refuse evidence for unknown criterion unless the slice declares it — prevents unlinked claims.
  const criteria = current.activeSlice?.acceptanceCriteria ?? [];
  if (criteria.length > 0 && !criteria.includes(input.criterionId)) {
    throw new Error(`unknown criterionId ${input.criterionId}; active slice declares: ${criteria.join(", ")}`);
  }
  const sessionId = String((tool as unknown as { sessionID?: string }).sessionID ?? "unknown");
  const agent = String((tool as unknown as { agent?: string }).agent ?? "lindo");
  const id = evidenceId(current.evidence.length + 1);
  const digest = input.digest ?? (input.command ? sha256Hex(`${input.command}\n${input.summary}`.slice(0, 4000)) : undefined);
  const record = {
    id,
    criterionId: input.criterionId,
    kind: input.kind,
    status: input.status,
    summary: input.summary.slice(0, 2000),
    artifactRef: input.artifactRef,
    command: input.command?.slice(0, 500),
    digest,
    observedAt: input.observedAt,
    limitations: input.limitations ?? [],
  };
  const ctx = storeContext(projectRoot, sessionId, agent);
  const next = await appendEvent(ctx, "evidence.submitted", { id, criterionId: input.criterionId, status: input.status }, (s) => ({
    ...s,
    evidence: [...s.evidence, record],
  }));
  await writeEvidenceDoc(projectRoot, id, record);
  return toolOk({ id, revision: next.revision, digest });
}
