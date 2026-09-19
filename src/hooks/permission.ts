import { approvalSatisfies, classifyAuthority } from "../domain/authority.js";
import { readState } from "../ledger/store.js";
import { projectRootOf, type LindoRuntime } from "../runtime.js";

/**
 * permission.evaluate: deterministic Authority Matrix after configured rules.
 * Explicit deny is final (hook never runs for it). May elevate allow->ask for
 * external/destructive/outside-slice; may allow a previous ask only with an
 * exact, valid, matching approval.
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

    const verdict = classifyAuthority({ action, resource: resources[0], role: agent as string, isExternal, isDestructive, isOutsideSlice });
    if (verdict.effect === "DENY") {
      event.effect = "deny";
      event.message = `Lindo DENY: ${verdict.reason}`;
      return;
    }
    if (verdict.effect === "ASK" && event.effect === "allow") {
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
      if (!event.message) event.message = `Lindo: ${verdict.reason}`;
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
