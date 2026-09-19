import { Plugin } from "@opencode/plugin";
import type { LindoOptions } from "./options.js";

export type LindoContext = Parameters<Parameters<typeof Plugin.define>[0]["setup"]>[0];

export interface LindoRuntime {
  ctx: LindoContext;
  options: LindoOptions;
}

export function createRuntime(ctx: LindoContext, options: LindoOptions): LindoRuntime {
  return { ctx, options };
}

export function projectRootOf(ctx: LindoContext): string {
  const loc = ctx.location as unknown as {
    project?: { canonical?: string; directory?: string };
    directory?: string;
  };
  return loc.project?.canonical ?? loc.project?.directory ?? loc.directory ?? process.cwd();
}

export function toolOk(data: unknown): { content: string } {
  return { content: JSON.stringify(data, null, 2) };
}

export function toolErr(message: string): never {
  throw new Error(message);
}
