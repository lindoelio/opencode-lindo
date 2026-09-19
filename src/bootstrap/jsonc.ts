import * as fs from "node:fs";
import * as path from "node:path";
import { parse, modify, applyEdits } from "jsonc-parser";
import { atomicWriteFile } from "../util/atomic-file.js";
import { sha256Hex } from "../util/hash.js";

export interface SetupPlanFile {
  path: string;
  action: "create" | "update-managed" | "keep-drifted" | "keep";
  reason: string;
}

export interface SetupPlan {
  files: SetupPlanFile[];
  configDiff?: string | undefined;
  warnings: string[];
}

export function managedHeader(version: string, checksum: string): string {
  return `\n<!-- LINDO-MANAGED version=${version} checksum=${checksum} -->\n`;
}

export function checksumOf(content: string): string {
  return sha256Hex(content).slice(0, 16);
}

export function isManaged(content: string): { version: string; checksum: string } | null {
  const m = content.match(/LINDO-MANAGED version=([^\s]+) checksum=([^\s>]+)/);
  if (!m) return null;
  return { version: m[1] ?? "?", checksum: (m[2] ?? "?").replace(/-->$/, "") };
}

export async function planManagedFiles(projectRoot: string, templates: Map<string, string>, version: string): Promise<SetupPlanFile[]> {
  const files: SetupPlanFile[] = [];
  for (const [rel, template] of templates) {
    const abs = path.join(projectRoot, rel);
    let existing: string | null = null;
    try {
      existing = await fs.promises.readFile(abs, "utf8");
    } catch {
      existing = null;
    }
    if (existing === null) {
      files.push({ path: rel, action: "create", reason: "missing" });
      continue;
    }
    const meta = isManaged(existing);
    if (!meta) {
      files.push({ path: rel, action: "keep-drifted", reason: "not managed; user content preserved" });
      continue;
    }
    const body = stripHeader(existing);
    const templateBody = stripHeader(template);
    if (body === templateBody) {
      if (meta.checksum === checksumOf(body)) files.push({ path: rel, action: "keep", reason: "up to date" });
      else files.push({ path: rel, action: "update-managed", reason: `repair header v${meta.version}` });
      continue;
    }
    if (meta.checksum === checksumOf(body)) {
      // Intact managed file; the template evolved.
      files.push({ path: rel, action: "update-managed", reason: `update v${meta.version} -> v${version}` });
      continue;
    }
    // Content matches neither the recorded checksum nor the template: user drift.
    files.push({ path: rel, action: "keep-drifted", reason: `managed file drifted (v${meta.version})` });
  }
  return files;
}

export function stripHeader(content: string): string {
  // Managed marker is a trailing HTML comment on its own line; frontmatter must stay at byte 0.
  // Legacy leading markers are also stripped for migration.
  return content.replace(/<!-- LINDO-MANAGED[^>]*-->\n?$/, "").replace(/^<!-- LINDO-MANAGED[^>]*-->\n?/, "");
}

export function withHeader(template: string, version: string): string {
  let body = stripHeader(template);
  if (!body.endsWith("\n")) body += "\n";
  return body + managedHeader(version, checksumOf(body)).slice(1);
}

/** Safe JSONC merge: preserve comments/order, insert default_agent + plugin options only when asked. */
export async function mergeProjectConfig(input: {
  projectRoot: string;
  setDefault: boolean;
  pluginPackage: string;
  pluginOptions: Record<string, unknown>;
  includePluginOptions: boolean;
}): Promise<{ path: string; before: string; after: string; changed: boolean }> {
  const configPath = path.join(input.projectRoot, "opencode.jsonc");
  let before = "";
  try {
    before = await fs.promises.readFile(configPath, "utf8");
  } catch {
    before = "";
  }
  const errors: unknown[] = [];
  const parsed = before.trim().length === 0 ? {} : (parse(before, errors as never, { allowTrailingComma: true }) as Record<string, unknown>);
  if ((errors as unknown[]).length > 0) {
    throw new Error(`opencode.jsonc has parse errors: ${JSON.stringify(errors).slice(0, 500)}`);
  }
  let after = before.trim().length === 0 ? "{\n}\n" : before;
  if (input.setDefault && (parsed as Record<string, unknown>)["default_agent"] !== "lindo") {
    after = applyJsoncEdit(after, ["default_agent"], "lindo");
  }
  if (input.includePluginOptions) {
    const plugins = (parsed as Record<string, unknown>)["plugins"];
    const entry = { package: input.pluginPackage, options: input.pluginOptions };
    if (!Array.isArray(plugins)) {
      after = applyJsoncEdit(after, ["plugins"], [entry]);
    } else {
      const idx = plugins.findIndex(
        (p) => (typeof p === "string" && p === input.pluginPackage) || (p && typeof p === "object" && (p as Record<string, unknown>)["package"] === input.pluginPackage),
      );
      if (idx === -1) {
        const next = [...plugins, entry];
        after = applyJsoncEdit(after, ["plugins"], next);
      }
    }
  }
  return { path: configPath, before, after, changed: after !== before };
}

function applyJsoncEdit(text: string, jsonPath: (string | number)[], value: unknown): string {
  const edits = modify(text, jsonPath as never, value as never, { formattingOptions: { insertSpaces: true, tabSize: 2 } });
  return applyEdits(text, edits);
}

export async function backupFile(projectRoot: string, absPath: string): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(projectRoot, ".lindo", "setup-backups", stamp, path.basename(absPath));
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  try {
    const content = await fs.promises.readFile(absPath, "utf8");
    await atomicWriteFile(dest, content);
    return dest;
  } catch {
    // missing file: record intention only
    await atomicWriteFile(dest + ".missing", "");
    return dest + ".missing";
  }
}

export interface ModelRemap {
  from: string;
  to: string;
}

const SETUP_STATE_FILE = ".lindo/setup.json";

/**
 * Explicit model remediation, persisted per setup root. Never inferred:
 * a remap only exists after the user confirmed it (setup --remap-model).
 */
export async function readModelRemap(root: string): Promise<ModelRemap | null> {
  try {
    const raw = await fs.promises.readFile(path.join(root, SETUP_STATE_FILE), "utf8");
    const parsed = JSON.parse(raw) as { version?: number; modelRemap?: ModelRemap };
    if (parsed.version !== 1 || !parsed.modelRemap) return null;
    const { from, to } = parsed.modelRemap;
    if (typeof from !== "string" || typeof to !== "string" || !isProviderModelRef(to)) return null;
    return { from, to };
  } catch {
    return null;
  }
}

export async function writeModelRemap(root: string, remap: ModelRemap): Promise<string> {
  if (!isProviderModelRef(remap.to)) throw new Error(`invalid model ref: ${remap.to} (expected provider/model)`);
  const dest = path.join(root, SETUP_STATE_FILE);
  await atomicWriteFile(dest, JSON.stringify({ version: 1, modelRemap: remap, updatedAt: new Date().toISOString() }, null, 2) + "\n");
  return dest;
}

/** `provider/model` without variant. Variants (`#low`) stay on the agent lines. */
export function isProviderModelRef(ref: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(ref);
}

/**
 * Rewrite `model: <from>#<variant>` frontmatter lines to `<to>#<variant>`.
 * Frontmatter stays at byte 0; only model lines change.
 */
export function applyModelRemapToTemplates(templates: Map<string, string>, remap: ModelRemap): Map<string, string> {
  const out = new Map<string, string>();
  const pattern = new RegExp(`^(model:\\s*)${escapeRegExp(remap.from)}(#[A-Za-z0-9_-]+)?\\s*$`, "m");
  for (const [rel, content] of templates) {
    if (!rel.endsWith(".md")) {
      out.set(rel, content);
      continue;
    }
    out.set(rel, content.replace(pattern, (_m, prefix: string, variant: string | undefined) => `${prefix}${remap.to}${variant ?? ""}`));
  }
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
