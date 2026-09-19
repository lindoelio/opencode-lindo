import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve("assets", "agents");

function frontmatter(file: string): Record<string, string> {
  const text = fs.readFileSync(file, "utf8");
  // Frontmatter must start at byte 0 — a leading managed marker breaks OpenCode discovery.
  expect(text.startsWith("---\n")).toBe(true);
  const end = text.indexOf("\n---", 3);
  expect(end).toBeGreaterThan(0);
  const block = text.slice(4, end);
  const out: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m && m[1] && m[2]) out[m[1]] = m[2].trim();
  }
  return out;
}

describe("agent asset snapshots", () => {
  it("lindo is the only primary agent with orchestrator permissions", () => {
    const fm = frontmatter(path.join(ROOT, "lindo.md"));
    expect(fm["mode"]).toBe("primary");
    expect(fm["model"]).toBe("opencode/muse-spark-1.3#high");
    const body = fs.readFileSync(path.join(ROOT, "lindo.md"), "utf8");
    expect(body).toContain('resource: "lindo/*"');
  });
  it("all specialists are subagents with pinned variants and no-delegation tails", () => {
    const expected: Record<string, string> = {
      explorer: "opencode/muse-spark-1.3#low",
      product: "opencode/muse-spark-1.3#high",
      architect: "opencode/muse-spark-1.3#xhigh",
      designer: "opencode/muse-spark-1.3#high",
      builder: "opencode/muse-spark-1.3#medium",
      verifier: "opencode/muse-spark-1.3#high",
      security: "opencode/muse-spark-1.3#xhigh",
      release: "opencode/muse-spark-1.3#high",
    };
    for (const [name, model] of Object.entries(expected)) {
      const fm = frontmatter(path.join(ROOT, "lindo", `${name}.md`));
      expect(fm["mode"]).toBe("subagent");
      expect(fm["model"]).toBe(model);
      const body = fs.readFileSync(path.join(ROOT, "lindo", `${name}.md`), "utf8");
      expect(body).toContain('resource: "*"');
      expect(body).toContain("effect: deny");
    }
  });
  it("templates stay pure (no marker); the marker is added trailing at apply time", () => {
    for (const f of [path.join(ROOT, "lindo.md"), path.join(ROOT, "lindo", "explorer.md")]) {
      const text = fs.readFileSync(f, "utf8");
      expect(text).not.toContain("LINDO-MANAGED");
      expect(text.startsWith("---\n")).toBe(true);
    }
  });
});
