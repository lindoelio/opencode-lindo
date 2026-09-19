import { describe, expect, it } from "vitest";
import { loadTemplates, AGENT_TEMPLATES } from "../../src/catalog/agents.js";
import { loadSkillContents, skillDisplayName, skillDescriptions, frontmatterName, frontmatterDescription, SKILL_IDS } from "../../src/catalog/skills.js";
import { loadCases, scoreCase, runBench } from "../../bench/runners/run.js";

describe("catalog extras", () => {
  it("loads all agent templates with frontmatter", async () => {
    const t = await loadTemplates();
    expect(t.size).toBe(AGENT_TEMPLATES.length + 1); // + .lindo/README
    expect(t.get(".opencode/agents/lindo.md")).toContain("mode: primary");
  });
  it("loads skills and derives names", async () => {
    const contents = await loadSkillContents();
    expect(contents.size).toBe(SKILL_IDS.length);
    expect(skillDisplayName("lindo-vertical-slice")).toBe("Lindo Vertical Slice");
    const descs = await skillDescriptions();
    expect(descs).toHaveLength(SKILL_IDS.length);
    const first = [...contents.values()][0]!;
    expect(frontmatterName(first).length).toBeGreaterThan(0);
    expect(frontmatterDescription(first).length).toBeGreaterThan(0);
    expect(frontmatterName("no frontmatter")).toBe("Lindo Skill");
    expect(frontmatterDescription("no frontmatter")).toBe("");
  });
  it("scores bench cases with forbidden-behavior penalty", async () => {
    const cases = loadCases();
    expect(cases.length).toBeGreaterThanOrEqual(3);
    const arch = cases.find((c) => c.id === "LINDO-ARCH-001")!;
    const good = scoreCase(arch, { invariants: [...arch.expected_invariants], forbidden: [], artifacts: [...arch.required_artifacts] });
    expect(good.score).toBe(1);
    expect(good.artifactsPresent).toHaveLength(2);
    const bad = scoreCase(arch, { invariants: [...arch.expected_invariants], forbidden: [...arch.forbidden_behaviors], artifacts: [] });
    expect(bad.score).toBe(0.5);
    expect(bad.forbiddenSeen.length).toBeGreaterThan(0);
    const empty = scoreCase({ ...arch, expected_invariants: [] }, { invariants: [], forbidden: [], artifacts: [] });
    expect(empty.score).toBe(1);
    const results = await runBench();
    expect(results).toHaveLength(cases.length);
  });
});
