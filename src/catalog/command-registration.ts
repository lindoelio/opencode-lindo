import { LINDO_COMMANDS, parseCommandArgs } from "./commands.js";
import { MODEL_PROFILE } from "./model-profile.js";
import { applySetupPlan } from "../bootstrap/apply.js";
import { buildSetupPlan, renderPlanText } from "../bootstrap/plan.js";
import { isProviderModelRef } from "../bootstrap/jsonc.js";
import { runDoctor, renderDoctorReport } from "../doctor/checks.js";
import { readState } from "../ledger/store.js";
import { project } from "../ledger/projection.js";
import { projectRootOf, type LindoRuntime } from "../runtime.js";

async function sendSessionText(runtime: LindoRuntime, sessionID: string, text: string): Promise<void> {
  await runtime.ctx.session.synthetic({ sessionID, text } as never);
}

export async function registerCommands(runtime: LindoRuntime): Promise<{ dispose: () => Promise<void> }> {
  const registration = await runtime.ctx.command.transform((editor: any) => {
    for (const cmd of LINDO_COMMANDS) {
      editor.add({
        name: cmd.name,
        description: cmd.description,
        execute: async ({ sessionID, prompt }: any) => {
          const args = String((prompt as unknown as { text?: string }).text ?? "");
          // Lifecycle commands execute locally for determinism.
          if (cmd.name === "lindo/setup") {
            const parsed = parseCommandArgs(stripCommandPrefix(args, "lindo/setup"));
            const scope = parsed.get("scope") === "global" ? "global" : "project";
            const setDefault = parsed.flags.has("set-default") || (!parsed.flags.has("no-default") && scope === "project" && parsed.flags.has("apply"));
            const remapTo = parsed.get("remap-model");
            let modelRemap: { from: string; to: string } | undefined;
            if (remapTo !== undefined) {
              if (!isProviderModelRef(remapTo)) {
                await sendSessionText(runtime, sessionID, `Invalid --remap-model '${remapTo}': expected provider/model (no variant). Nothing was written.`);
                return;
              }
              modelRemap = { from: `${MODEL_PROFILE.providerID}/${MODEL_PROFILE.modelID}`, to: remapTo };
            }
            const plan = await buildSetupPlan({
              scope,
              setDefault: parsed.flags.has("set-default"),
              updateOnly: parsed.flags.has("update"),
              projectRoot: projectRootOf(runtime.ctx),
              pluginPackage: "@lindoelio/opencode-lindo@0.1.3",
              pluginOptions: {
                profile: runtime.options.profile,
                strictEvidence: runtime.options.strictEvidence,
                projectState: runtime.options.projectState,
                model: runtime.options.model,
                telemetry: false,
              },
              includePluginOptions: true,
              modelRemap,
            });
            if (parsed.flags.has("apply")) {
              if (scope === "global" && !parsed.flags.has("confirm")) {
                await sendSessionText(runtime, sessionID, `${renderPlanText(plan)}\n\nGlobal scope needs --confirm. Nothing was written.`);
                return;
              }
              const result = await applySetupPlan({
                scope,
                setDefault: parsed.flags.has("set-default") ? true : setDefault,
                updateOnly: parsed.flags.has("update"),
                projectRoot: projectRootOf(runtime.ctx),
                pluginPackage: "@lindoelio/opencode-lindo@0.1.3",
                pluginOptions: {
                  profile: runtime.options.profile,
                  strictEvidence: runtime.options.strictEvidence,
                  projectState: runtime.options.projectState,
                  model: runtime.options.model,
                  telemetry: false,
                },
                includePluginOptions: true,
                modelRemap,
              });
              await sendSessionText(runtime, sessionID, `Lindo setup applied.\nCreated: ${result.created.join(", ") || "(none)"}\nUpdated: ${result.updated.join(", ") || "(none)"}\nSkipped (user content): ${result.skipped.join(", ") || "(none)"}\nBackups: ${result.backups.length}\nConfig changed: ${result.configChanged}\n\nReload OpenCode and run /lindo/doctor.`);
              return;
            }
            await sendSessionText(runtime, sessionID, `${renderPlanText(plan)}\n\nDry run only. Re-run with --apply (explicit confirmation) to write.`);
            return;
          }
          if (cmd.name === "lindo/doctor") {
            const report = await runDoctor(runtime);
            await sendSessionText(runtime, sessionID, renderDoctorReport(report));
            return;
          }
          if (cmd.name === "lindo/status") {
            const state = await readState(projectRootOf(runtime.ctx));
            if (!state) {
              await sendSessionText(runtime, sessionID, "Verdict: no engagement yet.\n\nNext: run /lindo/start <outcome>.");
              return;
            }
            const p = project(state);
            await sendSessionText(runtime, sessionID, `Verdict: ${state.engagement.phase} / ${state.engagement.status} — ${p.next_action}\n\nPhase: ${p.phase}\nGate: ${JSON.stringify(p.gate_status)}\nEvidence: ${state.evidence.length} records\nRisks: ${p.critical_risks.length} critical/high\nApprovals: ${p.pending_approvals.length} pending`);
            return;
          }
          if (cmd.name === "lindo/export") {
            await sendSessionText(runtime, sessionID, "Lindo export: choose bundle (status | decision-log | evidence | release-readiness | retrospective). Files/fields preview + redaction applied before writing to .lindo/exports/. Re-run with the bundle name as argument to generate.");
            return;
          }
          // Loop commands: structured prompt to lindo in the current session.
          const body = cmd.prompt(stripCommandPrefix(args, cmd.name));
          await runtime.ctx.session.prompt({ sessionID, text: body } as never);
        },
      });
    }
  });
  return { dispose: () => registration.dispose() };
}

function stripCommandPrefix(args: string, name: string): string {
  const trimmed = args.trim();
  if (trimmed.startsWith("/")) {
    const without = trimmed.slice(1);
    if (without.startsWith(name)) return without.slice(name.length).trim();
  }
  if (trimmed.startsWith(name)) return trimmed.slice(name.length).trim();
  return trimmed;
}
