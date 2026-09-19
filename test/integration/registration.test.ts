import { describe, expect, it } from "vitest";
import { LINDO_COMMANDS } from "../../src/catalog/commands.js";
import { SKILL_IDS } from "../../src/catalog/skills.js";
import { AGENT_TEMPLATES } from "../../src/catalog/agents.js";

describe("registration contracts", () => {
  it("exposes 14 commands", () => {
    expect(LINDO_COMMANDS).toHaveLength(14);
    const names = LINDO_COMMANDS.map((c) => c.name);
    for (const expected of ["lindo/start", "lindo/discover", "lindo/thesis", "lindo/decide", "lindo/slice", "lindo/build", "lindo/review", "lindo/release", "lindo/status", "lindo/why", "lindo/calibrate", "lindo/setup", "lindo/doctor", "lindo/export"]) {
      expect(names).toContain(expected);
    }
  });
  it("exposes 14 skills and 9 agent templates", () => {
    expect(SKILL_IDS).toHaveLength(14);
    expect(AGENT_TEMPLATES).toHaveLength(9);
  });
});
