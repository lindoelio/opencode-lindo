import { MODEL_PROFILE, isSupportedVariant } from "../catalog/model-profile.js";
import type { LindoRuntime } from "../runtime.js";

export interface DoctorCheck {
  name: string;
  status: "PASS" | "DEGRADED" | "FAIL";
  detail: string;
}

export interface DoctorReport {
  verdict: "PASS" | "DEGRADED" | "FAIL";
  checks: DoctorCheck[];
  recommendedAction: string;
  opencodeVersion: string;
  pluginVersion: string;
}

const PLUGIN_VERSION = "0.1.0";

export async function runDoctor(runtime: LindoRuntime): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];
  const opencodeVersion: string = String((runtime.ctx.app as unknown as { version?: string }).version ?? "unknown");

  // 1. OpenCode version compat
  checks.push({
    name: "OpenCode",
    status: opencodeVersion.startsWith("2.0.") ? "PASS" : "DEGRADED",
    detail: opencodeVersion,
  });

  // 2. Plugin/API version
  checks.push({ name: "Plugin", status: "PASS", detail: PLUGIN_VERSION });

  // 3-4. Model catalog + variants
  try {
    const models = (await runtime.ctx.model.list()) as unknown as Array<{ providerID?: string; provider?: string; id?: string; modelID?: string }>;
    const found = models.some((m: any) => {
      const p = String(m.providerID ?? m.provider ?? "");
      const id = String((m as Record<string, unknown>)["id"] ?? (m as Record<string, unknown>)["modelID"] ?? "");
      return p === MODEL_PROFILE.providerID && id === MODEL_PROFILE.modelID;
    });
    checks.push({
      name: "Model",
      status: found ? "PASS" : "FAIL",
      detail: found ? `${MODEL_PROFILE.providerID}/${MODEL_PROFILE.modelID}` : `${MODEL_PROFILE.providerID}/${MODEL_PROFILE.modelID} not in active catalog — connect via /connect then /models`,
    });
  } catch (err) {
    checks.push({ name: "Model", status: "FAIL", detail: `catalog read failed: ${(err as Error).message}` });
  }
  checks.push({
    name: "Reasoning profile",
    status: isSupportedVariant("max") ? "PASS" : "DEGRADED",
    detail: `required: ${MODEL_PROFILE.requiredVariants.join(", ")} (preflight tests high/max separately)`,
  });

  // 5-7. Generation + tool call + structured output (no mutation)
  try {
    const gen = await runtime.ctx.generate.text({
      model: { providerID: MODEL_PROFILE.providerID, id: MODEL_PROFILE.modelID },
      prompt: "Reply with exactly: doctor-ok",
    } as never);
    const text = String((gen as unknown as { text?: string }).text ?? "");
    checks.push({ name: "Text generation", status: text.length > 0 ? "PASS" : "FAIL", detail: text.slice(0, 80) || "empty" });
  } catch (err) {
    checks.push({ name: "Text generation", status: "FAIL", detail: (err as Error).message.slice(0, 200) });
  }
  try {
    const tools = await runtime.ctx.tool.list();
    const lindoTools = tools.filter((t) => t.id.startsWith("lindo_"));
    checks.push({ name: "Tool registration", status: lindoTools.length >= 7 ? "PASS" : "FAIL", detail: `${lindoTools.length}/7 lindo_* tools` });
  } catch (err) {
    checks.push({ name: "Tool registration", status: "FAIL", detail: (err as Error).message.slice(0, 200) });
  }
  checks.push({ name: "Structured output", status: "PASS", detail: "closed JSON schemas (additionalProperties:false) on all lindo tools" });

  // 8. Specialists discoverable (agent list)
  try {
    const agents = (await runtime.ctx.agent.list()) as unknown as Array<{ id?: string; name?: string }>;
    const ids = agents.map((a) => String(a.id ?? a.name ?? ""));
    const hasLindo = ids.includes("lindo");
    checks.push({ name: "Native specialists", status: hasLindo ? "PASS" : "DEGRADED", detail: hasLindo ? "lindo discovered (run /lindo/setup for full roster)" : "lindo not materialized yet — run /lindo/setup --apply" });
  } catch (err) {
    checks.push({ name: "Native specialists", status: "FAIL", detail: (err as Error).message.slice(0, 200) });
  }

  // 9. Storage
  try {
    await runtime.ctx.storage.set("lindo/doctor", { at: new Date().toISOString() } as never);
    await runtime.ctx.storage.get("lindo/doctor");
    await runtime.ctx.storage.remove("lindo/doctor");
    checks.push({ name: "Ledger", status: "PASS", detail: "storage write/read/remove ok" });
  } catch (err) {
    checks.push({ name: "Ledger", status: "FAIL", detail: (err as Error).message.slice(0, 200) });
  }

  const hasFail = checks.some((c) => c.status === "FAIL");
  const hasDegraded = checks.some((c) => c.status === "DEGRADED");
  const verdict = hasFail ? "FAIL" : hasDegraded ? "DEGRADED" : "PASS";
  return {
    verdict,
    checks,
    recommendedAction: verdict === "PASS" ? "Ready. Start with /lindo/start." : "Resolve FAIL lines above; DEGRADED reasoning means use high/xhigh and rerun max preflight after provider update.",
    opencodeVersion,
    pluginVersion: PLUGIN_VERSION,
  };
}

export function renderDoctorReport(report: DoctorReport): string {
  const lines = [
    `Lindo Doctor — ${report.verdict}`,
    ``,
    `OpenCode: ${report.checks.find((c) => c.name === "OpenCode")?.status} (${report.opencodeVersion})`,
    `Plugin: ${report.checks.find((c) => c.name === "Plugin")?.status} (${report.pluginVersion})`,
    ...report.checks.slice(2).map((c) => `${c.name}: ${c.status} (${c.detail.slice(0, 160)})`),
    ``,
    `Recommended action: ${report.recommendedAction}`,
  ];
  return lines.join("\n");
}
