import * as fs from "node:fs";
import * as path from "node:path";
import { atomicWriteFile, appendFileSynced } from "../util/atomic-file.js";
import { sha256Hex } from "../util/hash.js";
import { eventId } from "../util/ids.js";
import { eventsPath, lindoDir, resolveInside, statePath, assertNoSymlinkEscape } from "../util/paths.js";
import { LindoEventSchema, LindoProjectStateSchema, type LindoEventV1, type LindoProjectStateV1 } from "../domain/schemas.js";
import { computeEventHash, GENESIS_HASH, verifyChain } from "./events.js";
import { redactUnknown } from "./redaction.js";

const LOCKS = new Map<string, Promise<void>>();

async function withLock<T>(key: string, fn: () => Promise<T>, timeoutMs = 5000): Promise<T> {
  const started = Date.now();
  while (LOCKS.has(key)) {
    if (Date.now() - started > timeoutMs) throw new Error(`lock timeout: ${key}`);
    await new Promise((r) => setTimeout(r, 25));
  }
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  LOCKS.set(key, gate);
  try {
    return await fn();
  } finally {
    LOCKS.delete(key);
    release();
  }
}

export interface StoreContext {
  projectRoot: string;
  sessionIdHash: string;
  actor: string;
}

function sessionHash(sessionId: string): string {
  return sha256Hex(sessionId).slice(0, 16);
}

export async function ensureLayout(projectRoot: string): Promise<void> {
  const root = path.resolve(projectRoot);
  for (const dir of ["", "ledger", "decisions", "slices", "evidence/artifacts", "approvals", "exports"]) {
    await fs.promises.mkdir(path.join(lindoDir(root), dir), { recursive: true });
  }
  const readme = path.join(lindoDir(root), "README.md");
  try {
    await fs.promises.access(readme);
  } catch {
    await atomicWriteFile(readme, "# .lindo\n\nLindo project ledger. Machine-managed; edit via /lindo commands and tools.\n");
  }
}

export async function readState(projectRoot: string): Promise<LindoProjectStateV1 | null> {
  try {
    const raw = await fs.promises.readFile(statePath(projectRoot), "utf8");
    const parsed = JSON.parse(raw);
    return LindoProjectStateSchema.parse(parsed);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function readEvents(projectRoot: string): Promise<LindoEventV1[]> {
  try {
    const raw = await fs.promises.readFile(eventsPath(projectRoot), "utf8");
    const lines = raw.split("\n").filter((l) => l.trim().length > 0);
    return lines.map((l) => LindoEventSchema.parse(JSON.parse(l)));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function appendEvent(
  ctx: StoreContext,
  type: string,
  payload: unknown,
  mutate: (state: LindoProjectStateV1) => LindoProjectStateV1,
): Promise<LindoProjectStateV1> {
  const root = path.resolve(ctx.projectRoot);
  return withLock(`lindo:${root}`, async () => {
    await ensureLayout(root);
    const current = await readState(root);
    if (!current) throw new Error("lindo state not initialized; run lindo_state initialize");
    const events = await readEvents(root);
    const chain = verifyChain(events);
    if (!chain.ok) throw new Error(`ledger chain broken at index ${chain.badIndex}; recover from backup`);
    const sanitized = redactUnknown(payload);
    const sequence = events.length;
    const previousHash = sequence === 0 ? GENESIS_HASH : (events[events.length - 1]?.hash ?? GENESIS_HASH);
    const base = {
      schemaVersion: 1 as const,
      id: eventId(),
      sequence,
      timestamp: new Date().toISOString(),
      projectId: current.project.id,
      engagementId: current.engagement.id,
      sessionIdHash: ctx.sessionIdHash,
      actor: ctx.actor,
      type,
      payload: sanitized,
      previousHash,
    };
    const hash = computeEventHash(base);
    const event: LindoEventV1 = { ...base, hash };
    const next = mutate(structuredClone(current));
    next.revision = current.revision + 1;
    next.engagement.updatedAt = event.timestamp;
    const validated = LindoProjectStateSchema.parse(redactUnknown(next));
    await appendFileSynced(eventsPath(root), JSON.stringify(event) + "\n");
    await atomicWriteFile(statePath(root), JSON.stringify(validated, null, 2));
    return validated;
  });
}

export async function initializeState(input: {
  projectRoot: string;
  sessionId: string;
  actor: string;
  outcome: string;
  actors?: string[];
  constraints?: string[];
  nonGoals?: string[];
  acceptance?: string[];
}): Promise<LindoProjectStateV1> {
  const root = path.resolve(input.projectRoot);
  return withLock(`lindo:${root}`, async () => {
    await ensureLayout(root);
    const existing = await readState(root);
    if (existing) return existing;
    const now = new Date().toISOString();
    const { engagementId } = await import("../util/ids.js");
    const state: LindoProjectStateV1 = {
      schemaVersion: 1,
      revision: 0,
      project: { id: `PRJ-${sha256Hex(root).slice(0, 8).toUpperCase()}`, canonicalDirectoryHash: sha256Hex(root) },
      engagement: { id: engagementId(), createdAt: now, updatedAt: now, status: "DRAFT", phase: "INTENT" },
      outcome: input.outcome,
      actors: input.actors ?? [],
      constraints: input.constraints ?? [],
      nonGoals: input.nonGoals ?? [],
      guardrails: [],
      assumptions: [],
      decisions: [],
      risks: [],
      gates: [],
      evidence: [],
      approvals: [],
      handoffs: [],
      nextAction: { description: "Run /lindo/discover to inventory the current state", owner: "lindo" },
      modelProfile: { providerID: "opencode", modelID: "muse-spark-1.3", defaultVariant: "high", status: "READY" },
    };
    const validated = LindoProjectStateSchema.parse(state);
    const event: LindoEventV1 = {
      schemaVersion: 1,
      id: eventId(),
      sequence: 0,
      timestamp: now,
      projectId: validated.project.id,
      engagementId: validated.engagement.id,
      sessionIdHash: sessionHash(input.sessionId),
      actor: input.actor,
      type: "engagement.initialized",
      payload: redactUnknown({ outcome: input.outcome, acceptance: input.acceptance ?? [] }),
      previousHash: GENESIS_HASH,
      hash: "",
    };
    event.hash = computeEventHash({ ...event, hash: undefined as never } as Omit<LindoEventV1, "hash">);
    await appendFileSynced(eventsPath(root), JSON.stringify(event) + "\n");
    await atomicWriteFile(statePath(root), JSON.stringify(validated, null, 2));
    return validated;
  });
}

export function storeContext(projectRoot: string, sessionId: string, actor: string): StoreContext {
  return { projectRoot: path.resolve(projectRoot), sessionIdHash: sessionHash(sessionId), actor };
}

export async function writeDecisionDoc(projectRoot: string, id: string, markdown: string): Promise<string> {
  const abs = resolveInside(projectRoot, `.lindo/decisions/${id}.md`);
  await assertNoSymlinkEscape(path.resolve(projectRoot), abs);
  await atomicWriteFile(abs, markdown);
  return abs;
}

export async function writeSliceDoc(projectRoot: string, id: string, yaml: string): Promise<string> {
  const abs = resolveInside(projectRoot, `.lindo/slices/${id}.yaml`);
  await assertNoSymlinkEscape(path.resolve(projectRoot), abs);
  await atomicWriteFile(abs, yaml);
  return abs;
}

export async function writeEvidenceDoc(projectRoot: string, id: string, json: unknown): Promise<string> {
  const abs = resolveInside(projectRoot, `.lindo/evidence/${id}.json`);
  await assertNoSymlinkEscape(path.resolve(projectRoot), abs);
  await atomicWriteFile(abs, JSON.stringify(redactUnknown(json), null, 2));
  return abs;
}
