import * as fs from "node:fs";
import * as path from "node:path";

export const LINDO_DIR_NAME = ".lindo";
export const STATE_FILE = "state.json";
export const EVENTS_FILE = "ledger/events.jsonl";

export function lindoDir(projectRoot: string): string {
  return path.join(projectRoot, LINDO_DIR_NAME);
}

export function statePath(projectRoot: string): string {
  return path.join(lindoDir(projectRoot), STATE_FILE);
}

export function eventsPath(projectRoot: string): string {
  return path.join(lindoDir(projectRoot), EVENTS_FILE);
}

/** Normalize and refuse traversal outside projectRoot. Returns absolute path. */
export function resolveInside(projectRoot: string, target: string): string {
  const root = path.resolve(projectRoot);
  const abs = path.resolve(root, target);
  const rel = path.relative(root, abs);
  if (rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))) return abs;
  throw new Error(`path escapes project root: ${target}`);
}

/** Refuse any symlink on intermediate components; resolves the real path and re-checks containment. */
export async function assertNoSymlinkEscape(projectRoot: string, targetAbs: string): Promise<string> {
  const root = path.resolve(projectRoot);
  const parts = path.relative(root, targetAbs).split(path.sep);
  if (parts.some((p) => p === "..")) throw new Error(`path escapes project root: ${targetAbs}`);
  let cursor = root;
  for (const part of parts) {
    if (!part || part === ".") continue;
    cursor = path.join(cursor, part);
    let stat: fs.Stats;
    try {
      stat = await fs.promises.lstat(cursor);
    } catch {
      break; // not created yet — nothing to escape through
    }
    if (stat.isSymbolicLink()) {
      const real = await fs.promises.realpath(cursor);
      const rel = path.relative(root, real);
      if (rel.startsWith("..") || path.isAbsolute(rel)) {
        throw new Error(`symlink escapes project root: ${cursor}`);
      }
    }
  }
  return targetAbs;
}

export function isLindoManagedAgentPath(rel: string): boolean {
  return (
    rel === ".opencode/agents/lindo.md" ||
    rel.startsWith(".opencode/agents/lindo/") ||
    rel === ".lindo/README.md"
  );
}
