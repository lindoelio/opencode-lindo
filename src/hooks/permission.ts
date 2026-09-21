import { approvalSatisfies, classifyAuthority, classifyGuarded, matchesGuardrail } from "../domain/authority.js";
import { readState } from "../ledger/store.js";
import { projectRootOf, type LindoRuntime } from "../runtime.js";

/**
 * permission.evaluate: YOLO by default.
 *
 * - ALLOW is the baseline, including external, destructive, production,
 *   financial and legal actions. The hook does not elevate allow -> ask.
 * - ASK is produced only by (a) user-registered guardrails
 *   (`autonomy.askBefore`, `/lindo/guard`) or (b) `autonomy.mode: "guarded"`
 *   (legacy opt-in behavior). State-level settings override plugin options.
 * - DENY integrity rules are final and are never weakened.
 * - A previously asked action is allowed only with an exact, current approval.
 */
export async function registerPermissionHook(runtime: LindoRuntime): Promise<{ dispose: () => Promise<void> }> {
  const reg = await runtime.ctx.permission.hook("evaluate", async (event: any) => {
    const action = String(event.action ?? "");
    const resources = [...(event.resources ?? [])];
    const agent = event.agent ? String(event.agent) : undefined;
    const resourceText = resources.join(" ");

    const isExternal = /push|pull request|pr\b|publish|deploy|tag |http|external|mcp|webhook/i.test(`${action} ${resourceText}`);
    const isDestructive = /delete|destroy|drop|rm\s+-rf|production|billing|permission|destructive/i.test(`${action} ${resourceText}`);
    const isOutsideSlice = /outside|out-of-scope|\.\.\//i.test(resourceText);

    // Effective autonomy: state overrides plugin options.
    let mode = runtime.options.autonomy?.mode ?? "yolo";
    let guardrails = [...(runtime.options.autonomy?.askBefore ?? [])];
    try {
      const root = projectRootOf(runtime.ctx);
      const state = await readState(root);
      if (state) {
        guardrails = [...guardrails, ...state.guardrails];
        if (state.autonomyMode) mode = state.autonomyMode;
      }
    } catch {
      // storage failure: fall back to option-level configuration
    }

    const query = { action, resource: resources[0], role: agent, isExternal, isDestructive, isOutsideSlice };
    const verdict = mode === "guarded" ? classifyGuarded(query) : classifyAuthority(query);

    if (verdict.effect === "DENY") {
      event.effect = "deny";
      event.message = `Lindo DENY: ${verdict.reason}`;
      return;
    }

    // Guardrails are the only source of ASK in yolo mode.
    const matched = matchesGuardrail(guardrails, action, resources);
    if (matched && event.effect === "allow") {
      event.effect = "ask";
      event.message = `Lindo ASK (guardrail "${matched}"): ${`${action} ${resourceText}`.trim()}`;
    } else if (verdict.effect === "ASK" && event.effect === "allow") {
      event.effect = "ask";
      event.message = `Lindo ASK: ${verdict.reason}`;
    }

    // A previous ask may be satisfied by an exact matching approval.
    if (event.effect === "ask") {
      try {
        const root = projectRootOf(runtime.ctx);
        const state = await readState(root);
        const approvals = state?.approvals ?? [];
        const match = approvals.find((a) =>
          approvalSatisfies(`${action}:${resources[0] ?? ""}`.replace(/:$/, ""), resources, a as never) ||
          approvalSatisfies(action, resources, a as never),
        );
        if (match) {
          event.effect = "allow";
          event.message = `Lindo approval ${match.id} matched scope`;
          return;
        }
      } catch {
        // storage failure: fail closed, keep ask
      }
      if (!event.message) event.message = "Lindo: explicit authorization required";
    }
  });
  return { dispose: () => reg.dispose() };
}

/** Validation-safe shell prefixes the verifier may run after hook promotion. */
export const VALIDATION_SAFE_PREFIXES = [
  "npm test",
  "npm run typecheck",
  "npm run test",
  "npx tsc",
  "npx vitest",
  "git status",
  "git diff",
] as const;

export function isValidationSafe(command: string): boolean {
  return VALIDATION_SAFE_PREFIXES.some((p) => command.trim().startsWith(p));
}
