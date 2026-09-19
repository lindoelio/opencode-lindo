import * as fs from "node:fs";
import { loadTemplates } from "../catalog/agents.js";
import { backupFile, mergeProjectConfig, withHeader } from "./jsonc.js";
import { resolveTargetAbs, type SetupOptions } from "./plan.js";
import { atomicWriteFile } from "../util/atomic-file.js";

export interface ApplyResult {
  created: string[];
  updated: string[];
  skipped: string[];
  backups: string[];
  configChanged: boolean;
}

export async function applySetupPlan(opts: SetupOptions): Promise<ApplyResult> {
  const { default: osHome } = await import("node:os");
  const root = opts.scope === "global" ? (opts.homeDir ?? osHome.homedir()) : opts.projectRoot;
  const templates = await loadTemplates();
  const created: string[] = [];
  const updated: string[] = [];
  const skipped: string[] = [];
  const backups: string[] = [];

  for (const [rel, template] of templates) {
    // --update: only touch managed-undrifted files.
    const abs = resolveTargetAbs(root, rel, opts.scope);
    let existing: string | null = null;
    try {
      existing = await fs.promises.readFile(abs, "utf8");
    } catch {
      existing = null;
    }
    const { isManaged } = await import("./jsonc.js");
    if (opts.updateOnly && existing !== null && isManaged(existing) === null) {
      skipped.push(rel);
      continue;
    }
    if (existing !== null && isManaged(existing) === null) {
      skipped.push(rel); // never overwrite user content
      continue;
    }
    const next = withHeader(template, "1");
    if (existing === next) {
      skipped.push(rel);
      continue;
    }
    if (existing !== null) backups.push(await backupFile(root, abs));
    await atomicWriteFile(abs, next);
    if (existing === null) created.push(rel);
    else updated.push(rel);
  }

  // opencode.jsonc merge (project scope only writes config; global never touches project config)
  let configChanged = false;
  if (opts.scope === "project") {
    const merged = await mergeProjectConfig({
      projectRoot: root,
      setDefault: opts.setDefault,
      pluginPackage: opts.pluginPackage,
      pluginOptions: opts.pluginOptions,
      includePluginOptions: opts.includePluginOptions,
    });
    if (merged.changed) {
      try {
        backups.push(await backupFile(root, merged.path));
      } catch {
        // config missing: no backup needed
      }
      await atomicWriteFile(merged.path, merged.after);
      configChanged = true;
    }
  }
  return { created, updated, skipped, backups, configChanged };
}
