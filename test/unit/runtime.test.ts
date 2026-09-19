import { describe, expect, it } from "vitest";
import { projectRootOf, toolOk, toolErr } from "../../src/runtime.js";

describe("runtime helpers", () => {
  it("prefers canonical project root, then directory, then cwd", () => {
    expect(projectRootOf({ location: { project: { canonical: "/a", directory: "/b" } } } as never)).toBe("/a");
    expect(projectRootOf({ location: { project: { directory: "/b" } } } as never)).toBe("/b");
    expect(projectRootOf({ location: { directory: "/c" } } as never)).toBe("/c");
    expect(projectRootOf({ location: {} } as never)).toBe(process.cwd());
  });
  it("serializes tool results and throws tool errors", () => {
    expect(JSON.parse(toolOk({ a: 1 }).content)).toEqual({ a: 1 });
    expect(() => toolErr("boom")).toThrow("boom");
  });
});
