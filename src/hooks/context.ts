import { ROLE_VARIANT } from "../catalog/model-profile.js";
import { readState } from "../ledger/store.js";
import { project, renderProjectionYaml } from "../ledger/projection.js";
import { projectRootOf, type LindoRuntime } from "../runtime.js";

const CONSTITUTION_VERSION = "lindo-constitution/v2";

const ROLE_CONTRACTS: Record<string, string> = {
  lindo:
    "lindo: accountable orchestrator. Delegate bounded work by default and run independent handoffs in parallel (no fixed cap; keep file ownership non-overlapping). ALLOW is the baseline: execute external, destructive, and production actions unless a registered guardrail says otherwise. Specialists may launch built-in OpenCode helper agents; only you create lindo/* specialists. Return verdict-first reports with evidence.",
  "lindo/explorer": "lindo/explorer: read-only discovery. No edits, no shells. May launch built-in OpenCode helper agents (never lindo/*). Return SpecialistResult@1.",
  "lindo/product": "lindo/product: clarify problem/value. Edit only .lindo artifacts when asked. May launch built-in helper agents (never lindo/*).",
  "lindo/architect": "lindo/architect: compare 2-4 options with reversibility. Edit only decision docs when asked. May launch built-in helper agents (never lindo/*).",
  "lindo/designer": "lindo/designer: direction + states + visual evidence plan. May launch built-in helper agents (never lindo/*).",
  "lindo/builder": "lindo/builder: implement the bounded unit inside allowed files only. Never mark PASS. May launch built-in helper agents (never lindo/*).",
  "lindo/verifier": "lindo/verifier: independent validation. Never accept own high-risk work. May launch built-in helper agents (never lindo/*).",
  "lindo/security": "lindo/security: threat review. Report locations, never values. May launch built-in helper agents (never lindo/*).",
  "lindo/release": "lindo/release: same-artifact promotion + rollback. Execute promotion autonomously unless a guardrail covers it. May launch built-in helper agents (never lindo/*).",
};

/** session.context: inject constitution version, state projection, role contract, model options; strip disallowed tools. */
export async function registerContextHook(runtime: LindoRuntime): Promise<{ dispose: () => Promise<void> }> {
  const reg = await runtime.ctx.session.hook("context", async (event: any) => {
    const agent = String((event as unknown as { agent?: string }).agent ?? "");
    if (agent !== "lindo" && !agent.startsWith("lindo/")) return;
    const root = projectRootOf(runtime.ctx);
    event.system.push({ type: "text", text: `Lindo Constitution: ${CONSTITUTION_VERSION}. Outcome before output. Evidence before confidence. Slice before scale. Autonomy by default: ALLOW is the baseline for external, destructive, and production actions; ask only when the user registered a guardrail. CLAIM <= EVIDENCE. Language follows the user; identifiers stay in English.` } as never);
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
      // Capability boundaries (not authorization gates): explorer stays read-only.
      if (agent === "lindo/explorer") denyTools(["edit", "write", "patch", "shell"]);
    }
  });
  return { dispose: () => reg.dispose() };
}
