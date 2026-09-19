import { ROLE_VARIANT } from "../catalog/model-profile.js";
import { readState } from "../ledger/store.js";
import { project, renderProjectionYaml } from "../ledger/projection.js";
import { projectRootOf, type LindoRuntime } from "../runtime.js";

const CONSTITUTION_VERSION = "lindo-constitution/v1";

const ROLE_CONTRACTS: Record<string, string> = {
  "lindo/explorer": "lindo/explorer: read-only discovery. No edits, no shells, no subagents. Return SpecialistResult@1.",
  "lindo/product": "lindo/product: clarify problem/value. Edit only .lindo artifacts when asked. No subagents.",
  "lindo/architect": "lindo/architect: compare 2-4 options with reversibility. Edit only decision docs when asked. No subagents.",
  "lindo/designer": "lindo/designer: direction + states + visual evidence plan. No subagents.",
  "lindo/builder": "lindo/builder: implement the bounded unit inside allowed files only. Never mark PASS. No subagents.",
  "lindo/verifier": "lindo/verifier: independent validation. Shell ask-by-default. Never accept own high-risk work. No subagents.",
  "lindo/security": "lindo/security: threat review. Report locations, never values. No subagents.",
  "lindo/release": "lindo/release: same-artifact promotion + rollback. External actions need approval. No subagents.",
};

/** session.context: inject constitution version, state projection, role contract, model options; strip disallowed tools. */
export async function registerContextHook(runtime: LindoRuntime): Promise<{ dispose: () => Promise<void> }> {
  const reg = await runtime.ctx.session.hook("context", async (event: any) => {
    const agent = String((event as unknown as { agent?: string }).agent ?? "");
    if (agent !== "lindo" && !agent.startsWith("lindo/")) return;
    const root = projectRootOf(runtime.ctx);
    event.system.push({ type: "text", text: `Lindo Constitution: ${CONSTITUTION_VERSION}. Outcome before output. Evidence before confidence. Slice before scale. Authority before action. CLAIM <= EVIDENCE. Language follows the user; identifiers stay in English.` } as never);
    try {
      const state = await readState(root);
      if (state) {
        const p = project(state);
        event.system.push({ type: "text", text: `Lindo state (rev ${p.revision}):\n${renderProjectionYaml(p)}` } as never);
      }
    } catch {
      // storage unavailable: continue without projection
    }
    const contract = ROLE_CONTRACTS[agent];
    if (contract) event.system.push({ type: "text", text: contract } as never);
    // Per-role reasoning + output budget (provider option; harmless if unsupported).
    const variant = ROLE_VARIANT[agent] ?? ROLE_VARIANT["lindo"];
    (event.options as Record<string, unknown>)["reasoningEffort"] = variant;
    (event.options as Record<string, unknown>)["maxTokens"] = 8000;
    // Defense in depth: hide tools the role must not see.
    const tools = (event as unknown as { tools?: Record<string, unknown> }).tools;
    if (tools) {
      const denyTools = (names: string[]): void => { for (const n of names) delete tools[n]; };
      if (agent === "lindo/explorer") denyTools(["edit", "write", "patch", "shell", "subagent"]);
      else if (agent.startsWith("lindo/") && agent !== "lindo/builder" && agent !== "lindo/designer") denyTools(["subagent"]);
      if (agent === "lindo/verifier" || agent === "lindo/security") denyTools(["subagent"]);
    }
  });
  return { dispose: () => reg.dispose() };
}
