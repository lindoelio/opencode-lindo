import * as fs from "node:fs";
import * as path from "node:path";
import { packageRoot } from "./agents.js";

export interface SkillDef {
  id: string;
  dirRel: string;
}

export const SKILL_IDS = [
  "lindo-intent-framing",
  "lindo-product-thesis",
  "lindo-domain-discovery",
  "lindo-architecture-decision",
  "lindo-vertical-slice",
  "lindo-spec-build-validate",
  "lindo-design-direction",
  "lindo-api-first-investigation",
  "lindo-safe-autonomy",
  "lindo-evidence-gate",
  "lindo-operational-readiness",
  "lindo-release-contract",
  "lindo-retrospective",
  "lindo-twin-calibration",
] as const;

export async function loadSkillContents(): Promise<Map<string, string>> {
  const root = packageRoot();
  const out = new Map<string, string>();
  for (const id of SKILL_IDS) {
    const abs = path.join(root, "assets", "skills", id, "SKILL.md");
    const content = await fs.promises.readFile(abs, "utf8");
    out.set(id, content);
  }
  return out;
}

export function skillDisplayName(id: string): string {
  const m = id.match(/^lindo-(.+)$/);
  const rest = (m?.[1] ?? id).split("-").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
  return `Lindo ${rest}`;
}

export async function skillDescriptions(): Promise<Array<{ id: string; description: string }>> {
  const contents = await loadSkillContents();
  const out: Array<{ id: string; description: string }> = [];
  for (const [id, md] of contents) {
    const d = md.match(/description:\s*(.+)/)?.[1]?.trim() ?? id;
    out.push({ id, description: d });
  }
  return out;
}

export function frontmatterName(content: string): string {
  return content.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? "Lindo Skill";
}

export function frontmatterDescription(content: string): string {
  return content.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? "";
}
