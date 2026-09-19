import type { LindoRuntime } from "../runtime.js";

/**
 * session.retry: bounded retries for transient failures only.
 * Never auto-retry permissions, deterministic validation failures, or invalid requests.
 */
export async function registerRetryHook(runtime: LindoRuntime): Promise<{ dispose: () => Promise<void> }> {
  const reg = await runtime.ctx.session.hook("retry", async (event: any) => {
    const err = event.error as { type?: string; status?: number; message?: string };
    const msg = `${err.type ?? ""} ${err.message ?? ""}`.toLowerCase();
    if (/permission|invalid-request|validation|deterministic|denied/i.test(msg)) {
      event.decision = { retry: false };
      return;
    }
    if (err.status === 429 || (err.status !== undefined && err.status >= 500)) {
      if (event.attempt >= 3) event.decision = { retry: false };
      else event.decision = { retry: true, delay: Math.min(10_000, 500 * 2 ** event.attempt) + Math.floor(Math.random() * 250) };
      return;
    }
    event.decision = { retry: false };
    });
  return { dispose: () => reg.dispose() };
}
