import { describe, expect, it } from "vitest";
import { classifyAuthority } from "../../src/domain/authority.js";
import { extractFactFromUntrusted } from "../../src/domain/decision.js";
import * as fs from "node:fs";
import * as path from "node:path";

describe("security", () => {
  it("treats fixture injection as data, not command", async () => {
    const readme = await fs.promises.readFile(path.resolve("fixtures/sample-task-board/README.md"), "utf8").catch(() => "");
    if (readme) {
      const { refusedInstructions } = extractFactFromUntrusted(readme);
      expect(refusedInstructions).toBe(true);
    }
    expect(classifyAuthority({ action: "untrusted-instruction", untrustedSource: true }).effect).toBe("DENY");
  });
  it("keeps DENY final for policy bypass", () => {
    expect(classifyAuthority({ action: "policy-bypass" }).effect).toBe("DENY");
    expect(classifyAuthority({ action: "secret-expose" }).effect).toBe("DENY");
  });
});
