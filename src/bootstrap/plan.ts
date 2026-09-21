import * as fs from "node:fs";
import * as path from "node:path";
import { loadTemplates } from "../catalog/agents.js";
import { isManaged, mergeProjectConfig, planManagedFiles, readModelRemap, applyModelRemapToTemplates, type ModelRemap, type SetupPlan } from "./jsonc.js";

export interface SetupOptions {
  scope: "project" | "global";
  setDefault: boolean;
  updateOnly: boolean;
  projectRoot: string;
  pluginPackage: string;
  pluginOptions: Record<string, unknown>;
  includePluginOptions: boolean;
  homeDir?: string;
  /** Explicit model remediation (from setup --remap-model); persisted to .lindo/setup.json on apply. */
  modelRemap?: ModelRemap;
}

export async function resolveEffectiveRemap(root: string, explicit?: ModelRemap): Promise<ModelRemap | null> {
  if (explicit) return explicit;
  return readModelRemap(root);
}

export function targetRoot(opts: SetupOptions): string {
  if (opts.scope === "global") return opts.homeDir ?? process.env["HOME"] ?? "~";
  return opts.projectRoot;
}

export async function buildSetupPlan(opts: SetupOptions): Promise<SetupPlan & { root: string }> {
  const root = targetRoot(opts);
  const templates = await loadTemplates();
  const warnings: string[] = [];
  const modelRemap = await resolveEffectiveRemap(root, opts.modelRemap);
  const effective = modelRemap ? applyModelRemapToTemplates(templates, modelRemap) : templates;
  if (modelRemap) warnings.push(`model remap active: ${modelRemap.from} -> ${modelRemap.to} (explicit choice recorded in .lindo/setup.json)`);
  // Remap agent targets for global scope.
  const remapped = new Map<string, string>();
  for (const [rel, content] of effective) {
    if (opts.scope === "global" && rel.startsWith(".opencode/agents/")) {
      warnings.push(`global scope remaps ${rel} under the global config dir`);
      remapped.set(rel, content);
    } else {
      remapped.set(rel, content);
    }
  }
  const files = await planManagedFiles(root, remapped, "1");
  let configDiff: string | undefined;
  try {
    const merged = await mergeProjectConfig({
      projectRoot: root,
      setDefault: opts.setDefault,
      pluginPackage: opts.pluginPackage,
      pluginOptions: opts.pluginOptions,
      includePluginOptions: opts.includePluginOptions,
    });
    if (merged.changed) configDiff = `--- ${merged.path}\n+++ planned\n${merged.after.slice(0, 4000)}`;
  } catch (err) {
    warnings.push(`config merge unavailable: ${(err as Error).message}`);
  }
  if (opts.scope === "global") warnings.push("global scope writes under the global config dir; project config is not touched");
  return { files, configDiff, warnings, root };
}

export function renderPlanText(plan: SetupPlan & { root: string }): string {
  const lines = [`Lindo setup plan — root: ${plan.root}`, ""];
  for (const f of plan.files) lines.push(`- ${f.action} ${f.path} (${f.reason})`);
  if (plan.configDiff) lines.push("", plan.configDiff);
  if (plan.warnings.length > 0) lines.push("", ...plan.warnings.map((w) => `warning: ${w}`));
  return lines.join("\n");
}

export async function fileIsManagedOrMissing(abs: string): Promise<boolean> {
  try {
    const content = await fs.promises.readFile(abs, "utf8");
    return isManaged(content) !== null;
  } catch {
    return true;
  }
}

export function resolveTargetAbs(root: string, rel: string, scope: "project" | "global"): string {
  if (scope === "global" && rel.startsWith(".opencode/")) {
    return path.join(root, ".config", "opencode", rel.slice(".opencode/".length));
  }
  return path.join(root, rel);
}
