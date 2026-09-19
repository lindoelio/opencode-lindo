import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export interface AgentTemplate {
  id: string;
  targetRel: string;
  sourceRel: string;
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  { id: "lindo", targetRel: ".opencode/agents/lindo.md", sourceRel: "assets/agents/lindo.md" },
  { id: "lindo/explorer", targetRel: ".opencode/agents/lindo/explorer.md", sourceRel: "assets/agents/lindo/explorer.md" },
  { id: "lindo/product", targetRel: ".opencode/agents/lindo/product.md", sourceRel: "assets/agents/lindo/product.md" },
  { id: "lindo/architect", targetRel: ".opencode/agents/lindo/architect.md", sourceRel: "assets/agents/lindo/architect.md" },
  { id: "lindo/designer", targetRel: ".opencode/agents/lindo/designer.md", sourceRel: "assets/agents/lindo/designer.md" },
  { id: "lindo/builder", targetRel: ".opencode/agents/lindo/builder.md", sourceRel: "assets/agents/lindo/builder.md" },
  { id: "lindo/verifier", targetRel: ".opencode/agents/lindo/verifier.md", sourceRel: "assets/agents/lindo/verifier.md" },
  { id: "lindo/security", targetRel: ".opencode/agents/lindo/security.md", sourceRel: "assets/agents/lindo/security.md" },
  { id: "lindo/release", targetRel: ".opencode/agents/lindo/release.md", sourceRel: "assets/agents/lindo/release.md" },
];

export function packageRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // src/catalog -> package root
  return path.resolve(here, "..", "..");
}

export async function loadTemplates(): Promise<Map<string, string>> {
  const root = packageRoot();
  const out = new Map<string, string>();
  for (const t of AGENT_TEMPLATES) {
    const abs = path.join(root, t.sourceRel);
    const content = await fs.promises.readFile(abs, "utf8");
    out.set(t.targetRel, content);
  }
  // .lindo/README template
  const readme = path.join(root, "assets", "templates", "lindo-readme.md");
  try {
    const content = await fs.promises.readFile(readme, "utf8");
    out.set(".lindo/README.md", content);
  } catch {
    out.set(".lindo/README.md", "# .lindo\n\nLindo project ledger. Machine-managed; edit via /lindo commands and tools.\n");
  }
  return out;
}
