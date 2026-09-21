import { z } from "zod";

export const PhaseSchema = z.enum([
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
]);
export type Phase = z.infer<typeof PhaseSchema>;

export const WorkStatusSchema = z.enum([
  "DRAFT",
  "READY",
  "IN_PROGRESS",
  "VERIFYING",
  "REVIEWING",
  "ACCEPTED",
  "RELEASE_READY",
  "RELEASED",
  "FAILED",
  "BLOCKED",
  "CANCELLED",
]);
export type WorkStatus = z.infer<typeof WorkStatusSchema>;

export const EpistemicBasisSchema = z.enum(["USER_STATED", "OBSERVED_PATTERN", "INFERENCE", "PROPOSAL", "VERIFIED", "UNKNOWN"]);
export type EpistemicBasis = z.infer<typeof EpistemicBasisSchema>;

export const AuthorityLevelSchema = z.enum(["ALLOW", "ALLOW_WITH_RECORD", "ASK", "DENY"]);
export type AuthorityLevel = z.infer<typeof AuthorityLevelSchema>;

export const AssumptionRefSchema = z.object({
  id: z.string(),
  statement: z.string().min(1),
  basis: z.enum(["USER_STATED", "OBSERVED_PATTERN", "INFERENCE", "PROPOSAL"]),
  confidence: z.enum(["low", "medium", "high"]),
  impact: z.string(),
  validation: z.string().optional(),
  sourceRefs: z.array(z.string()).default([]),
});
export type AssumptionRef = z.infer<typeof AssumptionRefSchema>;

export const DecisionOptionSchema = z.object({
  name: z.string().min(1),
  benefits: z.array(z.string()),
  costs: z.array(z.string()),
  risks: z.array(z.string()),
});
export type DecisionOption = z.infer<typeof DecisionOptionSchema>;

export const DecisionRefSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  context: z.string(),
  drivers: z.array(z.string()),
  options: z.array(DecisionOptionSchema).min(1),
  decision: z.string().min(1),
  rationale: z.string().min(1),
  consequences: z.array(z.string()),
  reversibility: z.enum(["easy", "moderate", "hard", "irreversible"]),
  authority: z.enum(["ALLOW", "ALLOW_WITH_RECORD", "ASK"]),
  evidenceRefs: z.array(z.string()).default([]),
  createdAt: z.string(),
});
export type DecisionRef = z.infer<typeof DecisionRefSchema>;

export const SliceRefSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  userOutcome: z.string().min(1),
  entryState: z.string(),
  happyPath: z.array(z.string()),
  inScope: z.array(z.string()),
  outOfScope: z.array(z.string()),
  allowedFiles: z.array(z.string()),
  prohibitedFiles: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()).min(1),
  validationCommands: z.array(z.string()),
  runtimeProof: z.array(z.string()),
  visualProof: z.array(z.string()),
  risks: z.array(z.string()),
  rollback: z.string(),
  owner: z.string(),
  status: z.string(),
});
export type SliceRef = z.infer<typeof SliceRefSchema>;

export const RiskRefSchema = z.object({
  id: z.string(),
  statement: z.string(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  mitigation: z.string().optional(),
});
export type RiskRef = z.infer<typeof RiskRefSchema>;

export const GateRefSchema = z.object({
  gate: z.enum(["INTENT", "DISCOVERY", "SLICE", "VERIFY", "REVIEW", "ACCEPT", "RELEASE"]),
  result: z.enum(["PASS", "FAIL", "BLOCKED"]),
  claim: z.string(),
  satisfied: z.array(z.string()),
  missing: z.array(z.string()),
  failed: z.array(z.string()),
  waivers: z.array(z.string()),
  nextAction: z.string(),
  evaluatedAt: z.string(),
});
export type GateRef = z.infer<typeof GateRefSchema>;

export const EvidenceRefSchema = z.object({
  id: z.string(),
  criterionId: z.string().min(1),
  kind: z.enum(["test", "runtime", "visual", "source", "review", "release"]),
  status: z.enum(["pass", "fail", "partial", "skipped"]),
  summary: z.string().min(1),
  artifactRef: z.string().optional(),
  command: z.string().optional(),
  digest: z.string().optional(),
  observedAt: z.string(),
  limitations: z.array(z.string()).default([]),
});
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export const ApprovalRefSchema = z.object({
  id: z.string(),
  category: z.enum(["external_write", "release", "production", "destructive", "financial", "legal", "scope"]),
  requestedAction: z.string(),
  resources: z.array(z.string()),
  reason: z.string(),
  risks: z.array(z.string()),
  rollback: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected", "expired"]),
  createdAt: z.string(),
  expiresAt: z.string().optional(),
  resolvedAt: z.string().optional(),
});
export type ApprovalRef = z.infer<typeof ApprovalRefSchema>;

export const HandoffRefSchema = z.object({
  id: z.string(),
  role: z.enum(["explorer", "product", "architect", "designer", "builder", "verifier", "security", "release"]),
  objective: z.string().min(1),
  context: z.array(z.string()),
  allowedScope: z.array(z.string()),
  prohibitedScope: z.array(z.string()),
  questions: z.array(z.string()),
  requiredEvidence: z.array(z.string()),
  stopCondition: z.string(),
  status: z.enum(["prepared", "completed", "cancelled"]),
  result: z.unknown().optional(),
});
export type HandoffRef = z.infer<typeof HandoffRefSchema>;

export const SpecialistResultSchema = z.object({
  status: z.enum(["PASS", "FAIL", "BLOCKED", "ADVISORY"]),
  summary: z.string().min(1),
  findings: z.array(
    z.object({
      severity: z.enum(["critical", "high", "medium", "low", "note"]),
      claim: z.string(),
      evidence: z.array(z.string()),
    }),
  ),
  risks: z.array(z.string()),
  unknowns: z.array(z.string()),
  recommended_next_action: z.string(),
});
export type SpecialistResult = z.infer<typeof SpecialistResultSchema>;

export const LindoProjectStateSchema = z.object({
  schemaVersion: z.literal(1),
  revision: z.number().int().min(0),
  project: z.object({
    id: z.string().min(1),
    canonicalDirectoryHash: z.string().min(1),
  }),
  engagement: z.object({
    id: z.string().min(1),
    createdAt: z.string(),
    updatedAt: z.string(),
    status: WorkStatusSchema,
    phase: PhaseSchema,
  }),
  thesis: z
    .object({
      version: z.number().int().min(1),
      statement: z.string(),
      actor: z.string(),
      problem: z.string(),
      outcome: z.string(),
      differentiator: z.string().optional(),
      validation: z.array(z.string()),
    })
    .optional(),
  outcome: z.string(),
  actors: z.array(z.string()),
  constraints: z.array(z.string()),
  nonGoals: z.array(z.string()),
  /** User-registered guardrails: patterns that require asking before matching actions. Empty = nothing is asked. */
  guardrails: z.array(z.string()).default([]),
  /** State-level override for autonomy. Falls back to plugin options (`yolo` by default). */
  autonomyMode: z.enum(["yolo", "guarded"]).optional(),
  assumptions: z.array(AssumptionRefSchema),
  decisions: z.array(DecisionRefSchema),
  activeSlice: SliceRefSchema.optional(),
  risks: z.array(RiskRefSchema),
  gates: z.array(GateRefSchema),
  evidence: z.array(EvidenceRefSchema),
  approvals: z.array(ApprovalRefSchema),
  handoffs: z.array(HandoffRefSchema),
  nextAction: z.object({
    description: z.string(),
    owner: z.string(),
    blockedBy: z.array(z.string()).optional(),
  }),
  modelProfile: z.object({
    providerID: z.string(),
    modelID: z.string(),
    defaultVariant: z.string(),
    verifiedAt: z.string().optional(),
    status: z.enum(["READY", "DEGRADED", "UNAVAILABLE"]),
  }),
});
export type LindoProjectStateV1 = z.infer<typeof LindoProjectStateSchema>;

export const LindoEventSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  sequence: z.number().int().min(0),
  timestamp: z.string(),
  projectId: z.string(),
  engagementId: z.string(),
  sessionIdHash: z.string(),
  actor: z.string(),
  type: z.string(),
  payload: z.unknown(),
  previousHash: z.string(),
  hash: z.string(),
});
export type LindoEventV1 = z.infer<typeof LindoEventSchema>;

// ---- Tool input schemas (closed) ----

export const StateReadInput = z.object({ action: z.literal("read") }).strict();
export const StateInitInput = z
  .object({
    action: z.literal("initialize"),
    outcome: z.string().min(1),
    actors: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
    nonGoals: z.array(z.string()).optional(),
    acceptance: z.array(z.string()).optional(),
  })
  .strict();
export const StateTransitionInput = z
  .object({
    action: z.literal("transition"),
    expectedRevision: z.number().int().min(0),
    to: PhaseSchema,
    reason: z.string().min(1),
    nextAction: z.string().min(1),
  })
  .strict();
export const StateGuardInput = z
  .object({
    action: z.literal("guard"),
    expectedRevision: z.number().int().min(0),
    mode: z.enum(["yolo", "guarded"]).optional(),
    add: z.array(z.string()).optional(),
    remove: z.array(z.string()).optional(),
    clear: z.boolean().optional(),
  })
  .strict();
export const LindoStateInputSchema = z.union([StateReadInput, StateInitInput, StateTransitionInput, StateGuardInput]);

export const RecordAssumptionInputSchema = z
  .object({
    expectedRevision: z.number().int().min(0),
    statement: z.string().min(1),
    basis: z.enum(["USER_STATED", "OBSERVED_PATTERN", "INFERENCE", "PROPOSAL"]),
    confidence: z.enum(["low", "medium", "high"]),
    impact: z.string().min(1),
    validation: z.string().optional(),
    sourceRefs: z.array(z.string()).optional(),
  })
  .strict();

export const RecordDecisionInputSchema = z
  .object({
    expectedRevision: z.number().int().min(0),
    title: z.string().min(1),
    context: z.string().min(1),
    drivers: z.array(z.string()).min(1),
    options: z.array(DecisionOptionSchema).min(2).max(4),
    decision: z.string().min(1),
    rationale: z.string().min(1),
    consequences: z.array(z.string()),
    reversibility: z.enum(["easy", "moderate", "hard", "irreversible"]),
    authority: z.enum(["ALLOW", "ALLOW_WITH_RECORD", "ASK"]),
    evidenceRefs: z.array(z.string()).optional(),
  })
  .strict();

export const SubmitEvidenceInputSchema = z
  .object({
    expectedRevision: z.number().int().min(0),
    criterionId: z.string().min(1),
    kind: z.enum(["test", "runtime", "visual", "source", "review", "release"]),
    status: z.enum(["pass", "fail", "partial", "skipped"]),
    summary: z.string().min(1),
    artifactRef: z.string().optional(),
    command: z.string().optional(),
    digest: z.string().optional(),
    observedAt: z.string().min(1),
    limitations: z.array(z.string()).optional(),
  })
  .strict();

export const EvaluateGateInputSchema = z
  .object({
    gate: z.enum(["INTENT", "DISCOVERY", "SLICE", "VERIFY", "REVIEW", "ACCEPT", "RELEASE"]),
    claim: z.string().min(1),
    expectedRevision: z.number().int().min(0),
  })
  .strict();

export const ApprovalOpenInputSchema = z
  .object({
    action: z.literal("open"),
    expectedRevision: z.number().int().min(0),
    category: z.enum(["external_write", "release", "production", "destructive", "financial", "legal", "scope"]),
    requestedAction: z.string().min(1),
    resources: z.array(z.string()).min(1),
    reason: z.string().min(1),
    risks: z.array(z.string()),
    rollback: z.string().optional(),
    expiresAt: z.string().optional(),
  })
  .strict();
export const ApprovalResolveInputSchema = z
  .object({
    action: z.literal("resolve"),
    expectedRevision: z.number().int().min(0),
    approvalId: z.string().min(1),
    decision: z.enum(["approved", "rejected"]),
    userMessageId: z.string().min(1),
  })
  .strict();
export const ApprovalInputSchema = z.union([ApprovalOpenInputSchema, ApprovalResolveInputSchema]);

export const HandoffPrepareInputSchema = z
  .object({
    action: z.literal("prepare"),
    expectedRevision: z.number().int().min(0),
    role: z.enum(["explorer", "product", "architect", "designer", "builder", "verifier", "security", "release"]),
    objective: z.string().min(1),
    context: z.array(z.string()),
    allowedScope: z.array(z.string()),
    prohibitedScope: z.array(z.string()),
    questions: z.array(z.string()),
    requiredEvidence: z.array(z.string()),
    stopCondition: z.string().min(1),
  })
  .strict();
export const HandoffCompleteInputSchema = z
  .object({
    action: z.literal("complete"),
    expectedRevision: z.number().int().min(0),
    handoffId: z.string().min(1),
    result: SpecialistResultSchema,
  })
  .strict();
export const HandoffCancelInputSchema = z
  .object({
    action: z.literal("cancel"),
    expectedRevision: z.number().int().min(0),
    handoffId: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();
export const HandoffInputSchema = z.union([
  HandoffPrepareInputSchema,
  HandoffCompleteInputSchema,
  HandoffCancelInputSchema,
]);
