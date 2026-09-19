import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { buildSetupPlan } from "../../src/bootstrap/plan.js";
import { applySetupPlan } from "../../src/bootstrap/apply.js";

describe("setup bootstrap", () => {
  it("plans then applies without overwriting user content", async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lindo-setup-"));
    const plan = await buildSetupPlan({
      scope: "project",
      setDefault: true,
      updateOnly: false,
      projectRoot: root,
      pluginPackage: "@lindoelio/opencode-lindo@0.1.3",
      pluginOptions: { profile: "public", strictEvidence: true, projectState: ".lindo", model: { providerID: "opencode", modelID: "muse-spark-1.3", defaultVariant: "high" }, telemetry: false },
      includePluginOptions: false,
    });
    expect(plan.files.some((f) => f.path === ".opencode/agents/lindo.md" && f.action === "create")).toBe(true);
    const result = await applySetupPlan({
      scope: "project",
      setDefault: true,
      updateOnly: false,
      projectRoot: root,
      pluginPackage: "@lindoelio/opencode-lindo@0.1.3",
      pluginOptions: { profile: "public", strictEvidence: true, projectState: ".lindo", model: { providerID: "opencode", modelID: "muse-spark-1.3", defaultVariant: "high" }, telemetry: false },
      includePluginOptions: false,
    });
    expect(result.created.length).toBeGreaterThan(5);
    // Second apply keeps; user edit is preserved.
    const agentPath = path.join(root, ".opencode", "agents", "lindo.md");
    await fs.promises.writeFile(agentPath, "USER EDITED — not managed\n");
    const result2 = await applySetupPlan({
      scope: "project",
      setDefault: false,
      updateOnly: true,
      projectRoot: root,
      pluginPackage: "@lindoelio/opencode-lindo@0.1.3",
      pluginOptions: {},
      includePluginOptions: false,
    });
    const content = await fs.promises.readFile(agentPath, "utf8");
    expect(content).toContain("USER EDITED");
    expect(result2.skipped.join()).toContain(".opencode/agents/lindo.md");
  });
  it("updates intact managed files and skips config on global scope", async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lindo-setup-"));
    const base = {
      scope: "project" as const,
      setDefault: false,
      updateOnly: false,
      projectRoot: root,
      pluginPackage: "@lindoelio/opencode-lindo@0.1.3",
      pluginOptions: {},
      includePluginOptions: false,
    };
    await applySetupPlan(base);
    // corrupt a managed header checksum: body matches the template, so apply repairs it (update path)
    const agentPath2 = path.join(root, ".opencode", "agents", "lindo.md");
    const applied = await fs.promises.readFile(agentPath2, "utf8");
    expect(applied).toContain("LINDO-MANAGED");
    await fs.promises.writeFile(agentPath2, applied.replace(/checksum=[0-9a-f]+/, "checksum=0000000000000000"));
    const again = await applySetupPlan(base);
    expect(again.updated.join()).toContain(".opencode/agents/lindo.md");
    const repaired = await fs.promises.readFile(agentPath2, "utf8");
    expect(repaired).not.toContain("0000000000000000");
    // global scope never touches project config and honors homeDir
    const home = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lindo-home-"));
    const global = await applySetupPlan({ ...base, scope: "global", homeDir: home });
    expect(global.created.length).toBeGreaterThan(5);
    expect(global.configChanged).toBe(false);
  });
});
