import { describe, expect, it } from "vitest";
import { parseOptions } from "../../src/options.js";

describe("options", () => {
  it("applies defaults", () => {
    const o = parseOptions({});
    expect(o.profile).toBe("public");
    expect(o.strictEvidence).toBe(true);
    expect(o.projectState).toBe(".lindo");
    expect(o.model).toEqual({ providerID: "opencode", modelID: "muse-spark-1.3", defaultVariant: "high" });
    expect(o.telemetry).toBe(false);
  });
  it("rejects telemetry:true (v0.1 invariant)", () => {
    expect(() => parseOptions({ telemetry: true })).toThrow();
  });
  it("rejects invalid shapes", () => {
    expect(() => parseOptions({ profile: "team" })).toThrow();
    expect(() => parseOptions({ model: { providerID: 42 } })).toThrow();
  });
  it("accepts private profile", () => {
    expect(parseOptions({ profile: "private" }).profile).toBe("private");
  });
});
