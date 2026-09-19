import type { LindoRuntime } from "../runtime.js";
import { registerContextHook } from "./context.js";
import { registerPromptHook } from "./prompt.js";
import { registerPermissionHook } from "./permission.js";
import { registerRetryHook } from "./retry.js";
import { registerToolAuditHooks } from "./tool-audit.js";

export async function registerHooks(runtime: LindoRuntime): Promise<{ dispose: () => Promise<void> }> {
  const regs = await Promise.all([
    registerContextHook(runtime),
    registerPromptHook(runtime),
    registerPermissionHook(runtime),
    registerRetryHook(runtime),
    registerToolAuditHooks(runtime),
  ]);
  return {
    dispose: async () => {
      await Promise.all(regs.map((r) => r.dispose()));
    },
  };
}
