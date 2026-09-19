import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { managedHeader, checksumOf, isManaged, planManagedFiles, stripHeader, withHeader, mergeProjectConfig, backupFile } from "../../src/bootstrap/jsonc.js";
import { MANAGED_AGENT_FILES, LINDO_METHOD_VERSION, AGENT_TEMPLATE_VERSION } from "../../src/bootstrap/managed-files.js";
import { buildSetupPlan, renderPlanText, fileIsManagedOrMissing, resolveTargetAbs } from "../../src/bootstrap/plan.js";

describe("bootstrap jsonc", () => {
  it("round-trips managed headers (trailing, frontmatter-safe)", () => {
    const body = "---\nmode: primary\n---\nhello\n";
    const stamped = withHeader(body, "1");
    expect(stamped.startsWith("---\n")).toBe(true);
    expect(stamped).toContain("LINDO-MANAGED");
    const meta = isManaged(stamped);
    expect(meta?.version).toBe("1");
    expect(meta?.checksum).toBe(checksumOf(body));
    expect(stripHeader(stamped)).toBe(body);
    expect(isManaged("plain content")).toBeNull();
    expect(managedHeader("1", "abc")).toContain("abc");
    expect(MANAGED_AGENT_FILES.length).toBe(10);
    expect(LINDO_METHOD_VERSION).toBe("1");
    expect(AGENT_TEMPLATE_VERSION).toBe("1");
  });
  it("plans create/keep/update/drift states", async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lindo-plan-"));
    const templates = new Map([[".opencode/agents/lindo.md", "---\nmode: primary\n---\nbody\n"]]);
    let files = await planManagedFiles(root, templates, "1");
    expect(files[0]!.action).toBe("create");
    await fs.promises.mkdir(path.join(root, ".opencode", "agents"), { recursive: true });
    await fs.promises.writeFile(path.join(root, ".opencode", "agents", "lindo.md"), withHeader("---\nmode: primary\n---\nbody\n", "1"));
    files = await planManagedFiles(root, templates, "1");
    expect(files[0]!.action).toBe("keep");
    // user content without marker is never touched
    await fs.promises.writeFile(path.join(root, ".opencode", "agents", "lindo.md"), "USER EDIT");
    files = await planManagedFiles(root, templates, "1");
    expect(files[0]!.action).toBe("keep-drifted");
    // drifted managed content is never overwritten silently
    await fs.promises.writeFile(path.join(root, ".opencode", "agents", "lindo.md"), withHeader("---\nmode: primary\n---\nbody\n", "1").replace("body", "tampered"));
    files = await planManagedFiles(root, templates, "1");
    expect(files[0]!.action).toBe("keep-drifted");
    // newer template triggers managed update
    await fs.promises.writeFile(path.join(root, ".opencode", "agents", "lindo.md"), withHeader("---\nmode: primary\n---\nbody\n", "1"));
    const v2 = new Map([[".opencode/agents/lindo.md", "---\nmode: primary\n---\nbody v2\n"]]);
    files = await planManagedFiles(root, v2, "2");
    expect(files[0]!.action).toBe("update-managed");
  });
  it("merges project config safely", async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lindo-jsonc-"));
    // empty dir: creates config
    let m = await mergeProjectConfig({ projectRoot: root, setDefault: true, pluginPackage: "pkg@1", pluginOptions: { a: 1 }, includePluginOptions: true });
    expect(m.changed).toBe(true);
    expect(m.after).toContain('"default_agent": "lindo"');
    await fs.promises.writeFile(m.path, m.after);
    // idempotent second merge
    m = await mergeProjectConfig({ projectRoot: root, setDefault: true, pluginPackage: "pkg@1", pluginOptions: { a: 1 }, includePluginOptions: true });
    expect(m.changed).toBe(false);
    // preserves comments and appends second plugin
    await fs.promises.writeFile(m.path, `{\n  // user comment\n  "default_agent": "build"\n}\n`);
    m = await mergeProjectConfig({ projectRoot: root, setDefault: false, pluginPackage: "pkg@1", pluginOptions: {}, includePluginOptions: true });
    expect(m.after).toContain("// user comment");
    expect(m.after).toContain("pkg@1");
    // divergent plugins array: appends without duplicating
    await fs.promises.writeFile(m.path, `{\n  "plugins": ["other-pkg", { "package": "pkg@1", "options": {} }]\n}\n`);
    m = await mergeProjectConfig({ projectRoot: root, setDefault: false, pluginPackage: "pkg@1", pluginOptions: {}, includePluginOptions: true });
    expect(m.changed).toBe(false);
    await fs.promises.writeFile(m.path, `{\n  "plugins": ["other-pkg"]\n}\n`);
    m = await mergeProjectConfig({ projectRoot: root, setDefault: false, pluginPackage: "pkg@1", pluginOptions: {}, includePluginOptions: true });
    expect(m.changed).toBe(true);
    expect(m.after).toContain("other-pkg");
    expect(m.after).toContain("pkg@1");
    // parse errors fail closed
    await fs.promises.writeFile(m.path, "{ invalid jsonc !!!");
    await expect(mergeProjectConfig({ projectRoot: root, setDefault: true, pluginPackage: "pkg@1", pluginOptions: {}, includePluginOptions: false })).rejects.toThrow();
  });
  it("backs up files with timestamp", async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lindo-backup-"));
    const target = path.join(root, "opencode.jsonc");
    await fs.promises.writeFile(target, "{}");
    const dest = await backupFile(root, target);
    expect(dest).toContain(".lindo/setup-backups/");
    expect(await fs.promises.readFile(dest, "utf8")).toBe("{}");
    const missing = await backupFile(root, path.join(root, "nope.json"));
    expect(missing).toContain(".missing");
  });
  it("builds setup plans for project and global scopes", async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lindo-setupplan-"));
    const plan = await buildSetupPlan({ scope: "project", setDefault: true, updateOnly: false, projectRoot: root, pluginPackage: "pkg@1", pluginOptions: {}, includePluginOptions: false });
    expect(plan.root).toBe(root);
    expect(plan.files.length).toBeGreaterThan(5);
    expect(renderPlanText(plan)).toContain("Lindo setup plan");
    const global = await buildSetupPlan({ scope: "global", setDefault: false, updateOnly: false, projectRoot: root, pluginPackage: "pkg@1", pluginOptions: {}, includePluginOptions: false, homeDir: root });
    expect(global.warnings.join()).toContain("global");
    expect(renderPlanText(global)).toContain("warning:");
    // unreadable config degrades to a warning instead of throwing
    await fs.promises.writeFile(path.join(root, "opencode.jsonc"), "{ broken !!!");
    const broken = await buildSetupPlan({ scope: "project", setDefault: true, updateOnly: false, projectRoot: root, pluginPackage: "pkg@1", pluginOptions: {}, includePluginOptions: false });
    expect(broken.warnings.join()).toContain("config merge unavailable");
    expect(resolveTargetAbs(root, ".opencode/agents/lindo.md", "global")).toContain(path.join(".config", "opencode"));
    expect(resolveTargetAbs(root, ".opencode/agents/lindo.md", "project")).toBe(path.join(root, ".opencode/agents/lindo.md"));
    expect(await fileIsManagedOrMissing(path.join(root, "missing.md"))).toBe(true);
  });
  it("remaps pinned model refs only on explicit choice", async () => {
    const { applyModelRemapToTemplates, isProviderModelRef, readModelRemap, writeModelRemap } = await import("../../src/bootstrap/jsonc.js");
    expect(isProviderModelRef("opencode-go/muse-spark-1.3-contributor")).toBe(true);
    expect(isProviderModelRef("opencode/muse-spark-1.3#low")).toBe(false);
    expect(isProviderModelRef("novariant")).toBe(false);
    const remap = { from: "opencode/muse-spark-1.3", to: "opencode-go/muse-spark-1.3-contributor" };
    const templates = new Map([
      [".opencode/agents/lindo.md", "---\nmodel: opencode/muse-spark-1.3#high\n---\nbody\n"],
      [".opencode/agents/lindo/explorer.md", "---\nmodel: opencode/muse-spark-1.3#low\n---\nbody\n"],
      [".lindo/README.md", "# readme without model\n"],
    ]);
    const out = applyModelRemapToTemplates(templates, remap);
    expect(out.get(".opencode/agents/lindo.md")).toContain("model: opencode-go/muse-spark-1.3-contributor#high");
    expect(out.get(".opencode/agents/lindo/explorer.md")).toContain("model: opencode-go/muse-spark-1.3-contributor#low");
    expect(out.get(".lindo/README.md")).toBe("# readme without model\n");
    expect(out.get(".opencode/agents/lindo.md")!.startsWith("---\n")).toBe(true);
    // persistence round-trips explicit choices; garbage and absence read as null
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lindo-remap-"));
    expect(await readModelRemap(root)).toBeNull();
    await writeModelRemap(root, remap);
    expect(await readModelRemap(root)).toEqual(remap);
    await expect(writeModelRemap(root, { from: "a/b", to: "bad ref!" })).rejects.toThrow();
    await fs.promises.writeFile(path.join(root, ".lindo", "setup.json"), "{ broken");
    expect(await readModelRemap(root)).toBeNull();
  });
  it("plans and applies with a persisted remap without drifting", async () => {
    const { writeModelRemap } = await import("../../src/bootstrap/jsonc.js");
    const { buildSetupPlan } = await import("../../src/bootstrap/plan.js");
    const { applySetupPlan } = await import("../../src/bootstrap/apply.js");
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lindo-remap-"));
    const remap = { from: "opencode/muse-spark-1.3", to: "opencode-go/muse-spark-1.3-contributor" };
    const plan = await buildSetupPlan({ scope: "project", setDefault: false, updateOnly: false, projectRoot: root, pluginPackage: "pkg@1", pluginOptions: {}, includePluginOptions: false, modelRemap: remap });
    expect(plan.warnings.join()).toContain("model remap active");
    const applied = await applySetupPlan({ scope: "project", setDefault: false, updateOnly: false, projectRoot: root, pluginPackage: "pkg@1", pluginOptions: {}, includePluginOptions: false, modelRemap: remap });
    expect(applied.created.join()).toContain(".opencode/agents/lindo.md");
    const agent = await fs.promises.readFile(path.join(root, ".opencode", "agents", "lindo.md"), "utf8");
    expect(agent).toContain("model: opencode-go/muse-spark-1.3-contributor#high");
    expect(agent.startsWith("---\n")).toBe(true);
    // second plan without the flag reuses the persisted choice and reports keep
    const again = await buildSetupPlan({ scope: "project", setDefault: false, updateOnly: false, projectRoot: root, pluginPackage: "pkg@1", pluginOptions: {}, includePluginOptions: false });
    expect(again.files.find((f) => f.path === ".opencode/agents/lindo.md")?.action).toBe("keep");
  });
});
