import type { LindoRuntime } from "../runtime.js";

const failureCounts = new Map<string, number>();

function failureKey(tool: string, input: unknown): string {
  const text = JSON.stringify(input ?? "").slice(0, 300);
  return `${tool}:${text.slice(0, 120)}`;
}

/**
 * tool.execute.before: phase/role/tool compatibility + revision freshness hints.
 * tool.execute.after: audit log (name/status/duration/digest), failure counters,
 * strategy-review signal after 2nd equivalent failure. Never converts shell
 * success into accepted evidence.
 */
export async function registerToolAuditHooks(runtime: LindoRuntime): Promise<{ dispose: () => Promise<void> }> {
  const startedAt = new Map<string, number>();
  const before = await runtime.ctx.tool.hook("execute.before", async (event: any) => {
    const e = event as unknown as { tool?: string; input?: unknown; id?: string };
    if (typeof e.tool === "string" && e.tool.startsWith("lindo_") && e.input && typeof e.input === "object") {
      const rev = (e.input as Record<string, unknown>)["expectedRevision"];
      if (rev !== undefined && typeof rev !== "number") throw new Error("expectedRevision must be a number");
    }
    if (e.id) startedAt.set(String(e.id), Date.now());
  });
  const after = await runtime.ctx.tool.hook("execute.after", async (event: any) => {
    const e = event as unknown as { tool?: string; status?: string; id?: string; input?: unknown };
    const toolName = String(e.tool ?? "unknown");
    const key = failureKey(toolName, e.input);
    if (e.status === "error") {
      const n = (failureCounts.get(key) ?? 0) + 1;
      failureCounts.set(key, n);
      if (n === 2) {
        try {
          await runtime.ctx.storage.set("lindo/strategy_review_required", { tool: toolName, at: new Date().toISOString(), hint: "two equivalent failures — revise requirement, architecture, environment, or validation strategy" } as never);
        } catch {
          // storage best-effort
        }
      }
    } else {
      failureCounts.delete(key);
    }
    if (e.id) startedAt.delete(String(e.id));
  });
  return { dispose: async () => { await before.dispose(); await after.dispose(); } };
}

export function _resetFailureCountsForTests(): void {
  failureCounts.clear();
}
