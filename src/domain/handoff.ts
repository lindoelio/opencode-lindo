import type { SpecialistResult } from "./schemas.js";

export const HANDOFF_ROLES = [
  "explorer",
  "product",
  "architect",
  "designer",
  "builder",
  "verifier",
  "security",
  "release",
] as const;
export type HandoffRole = (typeof HANDOFF_ROLES)[number];

export interface HandoffPacket {
  handoff_id: string;
  role: HandoffRole;
  objective: string;
  context: string[];
  scope: { allowed: string[]; prohibited: string[] };
  questions_to_answer: string[];
  required_evidence: string[];
  output_schema: "SpecialistResult@1";
  stop_condition: string;
}

export function buildPacket(input: {
  id: string;
  role: HandoffRole;
  objective: string;
  context: string[];
  allowedScope: string[];
  prohibitedScope: string[];
  questions: string[];
  requiredEvidence: string[];
  stopCondition: string;
}): HandoffPacket {
  return {
    handoff_id: input.id,
    role: input.role,
    objective: input.objective,
    context: input.context,
    scope: { allowed: input.allowedScope, prohibited: input.prohibitedScope },
    questions_to_answer: input.questions,
    required_evidence: input.requiredEvidence,
    output_schema: "SpecialistResult@1",
    stop_condition: input.stopCondition,
  };
}

export function renderPacketPrompt(p: HandoffPacket): string {
  return [
    `You are lindo/${p.role}. Bounded handoff ${p.handoff_id}.`,
    `Objective: ${p.objective}`,
    `Allowed scope: ${p.scope.allowed.join(", ") || "(none)"}`,
    `Prohibited scope: ${p.scope.prohibited.join(", ") || "(none)"}`,
    `Questions to answer: ${p.questions_to_answer.join(" | ") || "(none)"}`,
    `Required evidence: ${p.required_evidence.join(" | ") || "(none)"}`,
    `Stop when: ${p.stop_condition}`,
    `Return SpecialistResult@1 JSON: status PASS|FAIL|BLOCKED|ADVISORY, summary, findings[{severity,claim,evidence}], risks, unknowns, recommended_next_action.`,
    `Do not create subagents. Do not claim completion without evidence.`,
  ].join("\n");
}

export function validateResult(result: SpecialistResult): void {
  if (!result.summary) throw new Error("specialist result missing summary");
  if (!result.recommended_next_action) throw new Error("specialist result missing next action");
}
