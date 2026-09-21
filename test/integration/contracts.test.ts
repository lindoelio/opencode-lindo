import { describe, expect, it } from "vitest";
import { createRuntime, type LindoRuntime } from "../../src/runtime.js";
import { registerTools } from "../../src/tools/index.js";
import { registerCommands } from "../../src/catalog/command-registration.js";
import { registerSkills } from "../../src/catalog/skill-registration.js";
import { registerHooks } from "../../src/hooks/index.js";

function mockCtx(): { ctx: never; calls: Record<string, number> } {
  const calls: Record<string, number> = {};
  const editor = {
    added: [] as Array<{ name?: string; id?: string }>,
    add(def: { name?: string; id?: string }) { (this as { added: Array<unknown> }).added.push(def); },
    namespace() {},
    update() {},
    remove() {},
    list() { return []; },
    get() { return undefined; },
    default() {},
  };
  const transform = async (cb: (e: unknown) => void) => {
    calls["transform"] = (calls["transform"] ?? 0) + 1;
    cb({ ...editor, added: [] });
    return { dispose: async () => {} };
  };
  const hook = async () => ({ dispose: async () => {} });
  const ctx = {
    options: {},
    location: { project: { canonical: "/tmp/lindo-test" } },
    tool: { transform, reload: async () => {}, list: async () => [], hook },
    command: { transform, reload: async () => {}, list: async () => [] },
    skill: { transform, reload: async () => {}, list: async () => [] },
    session: { hook, synthetic: async () => {}, prompt: async () => {} },
    permission: { hook },
    agent: { list: async () => [] },
    model: { list: async () => [] },
    storage: { set: async () => {}, get: async () => undefined, remove: async () => {} },
    generate: { text: async () => ({ text: "ok" }) },
    app: { version: "2.0.10" },
  };
  return { ctx: ctx as never, calls };
}

describe("plugin registration contracts", () => {
  it("registers 7 lindo tools, 15 commands, 14 skills, 5 hook groups without throwing", async () => {
    const { ctx } = mockCtx();
    const runtime = createRuntime(ctx as never, { profile: "public", strictEvidence: true, projectState: ".lindo", model: { providerID: "opencode", modelID: "muse-spark-1.3", defaultVariant: "high" }, telemetry: false } as never);
    const addedTools: string[] = [];
    const toolExecutes: Array<(input: unknown, tool: unknown) => Promise<unknown>> = [];
    const toolEditor = {
      namespace() {},
      add(def: { name: string; execute: (input: unknown, tool: unknown) => Promise<unknown> }) {
        addedTools.push(`lindo_${def.name}`);
        toolExecutes.push(def.execute);
      },
      update() {}, remove() {}, list() { return []; }, get() { return undefined; },
    };
    (ctx as unknown as { tool: { transform: unknown } }).tool.transform = async (cb: (e: unknown) => void) => {
      cb(toolEditor);
      return { dispose: async () => {} };
    };
    const addedCommands: string[] = [];
    (ctx as unknown as { command: { transform: unknown } }).command.transform = async (cb: (e: unknown) => void) => {
      cb({ add(def: { name: string }) { addedCommands.push(def.name); } });
      return { dispose: async () => {} };
    };
    const addedSkills: string[] = [];
    const skillDefs: Array<Record<string, unknown>> = [];
    (ctx as unknown as { skill: { transform: unknown } }).skill.transform = async (cb: (e: unknown) => void) => {
      cb({ add(def: { id: string }) { addedSkills.push(def.id); skillDefs.push(def as unknown as Record<string, unknown>); }, list: () => [], get: () => undefined, update: () => {}, remove: () => {} });
      return { dispose: async () => {} };
    };
    await registerTools(runtime as LindoRuntime);
    await registerCommands(runtime as LindoRuntime);
    await registerSkills(runtime as LindoRuntime);
    await registerHooks(runtime as LindoRuntime);
    expect(addedTools.sort()).toEqual(["lindo_evaluate_gate", "lindo_handoff", "lindo_record_assumption", "lindo_record_decision", "lindo_request_approval", "lindo_state", "lindo_submit_evidence"]);
    expect(addedCommands).toHaveLength(15);
    expect(addedSkills).toHaveLength(14);
    // Regression: Skill.Info requires absolute `path` (server disables the
    // plugin on schema mismatch); `location` is not a valid key.
    for (const def of skillDefs) {
      expect(def["path"]).toMatch(/^\//);
      expect(def).not.toHaveProperty("location");
      expect(def["content"]).toContain("## ");
    }
    // Execute every registered wrapper once (validation errors still cover the wiring).
    expect(toolExecutes).toHaveLength(7);
    for (const execute of toolExecutes) {
      await (execute as (input: unknown, tool: unknown) => Promise<unknown>)({}, { sessionID: "s", agent: "lindo" }).catch(() => undefined);
    }
  });
});
