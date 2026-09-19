import { SKILL_IDS, frontmatterDescription, frontmatterName, loadSkillContents } from "./skills.js";
import { packageRoot } from "./agents.js";
import * as path from "node:path";
import type { LindoRuntime } from "../runtime.js";

export async function registerSkills(runtime: LindoRuntime): Promise<{ dispose: () => Promise<void> }> {
  const contents = await loadSkillContents();
  const root = packageRoot();
  const registration = await runtime.ctx.skill.transform((editor: any) => {
    for (const id of SKILL_IDS) {
      const md = contents.get(id);
      if (!md) continue;
      const body = md.replace(/^---\n[\s\S]*?---\n/, "").trim();
      editor.add({
        id,
        name: frontmatterName(md),
        description: frontmatterDescription(md),
        // Skill.Info requires an absolute `path`; resolve into the installed package.
        path: path.join(root, "assets", "skills", id, "SKILL.md"),
        content: body,
        autoinvoke: false,
      } as never);
    }
  });
  return { dispose: () => registration.dispose() };
}
