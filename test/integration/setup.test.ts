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
      pluginPackage: "@lindoelio/opencode-lindo@0.1.0",
      pluginOptions: { profile: "public", strictEvidence: true, projectState: ".lindo", model: { providerID: "opencode", modelID: "muse-spark-1.3", defaultVariant: "high" }, telemetry: false },
      includePluginOptions: false,
    });
    expect(plan.files.some((f) => f.path === ".opencode/agents/lindo.md" && f.action === "create")).toBe(true);
    const result = await applySetupPlan({
      scope: "project",
      setDefault: true,
      updateOnly: false,
      projectRoot: root,
      pluginPackage: "@lindoelio/opencode-lindo@0.1.0",
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
      pluginPackage: "@lindoelio/opencode-lindo@0.1.0",
      pluginOptions: {},
      includePluginOptions: false,
    });
    const content = await fs.promises.readFile(agentPath, "utf8");
    expect(content).toContain("USER EDITED");
    expect(result2.skipped.join()).toContain(".opencode/agents/lindo.md");
  });
});
