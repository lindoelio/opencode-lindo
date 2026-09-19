import { describe, expect, it } from "vitest";
import { redactText, redactUnknown, REDACTED } from "../../src/ledger/redaction.js";

describe("redaction", () => {
  it("redacts key names", () => {
    const out = redactUnknown({ api_key: "abc", nested: { token: "xyz" }, ok: "fine" }) as Record<string, string>;
    expect(out["api_key"]).toBe(REDACTED);
    expect((out["nested"] as unknown as Record<string, string>)["token"]).toBe(REDACTED);
    expect(out["ok"]).toBe("fine");
  });
  it("redacts bearer tokens and private keys", () => {
    expect(redactText("Authorization: Bearer abcdefghijklmnop")).toContain(REDACTED);
    expect(redactText("key sk-abcdefghijklmnop123")).toContain(REDACTED);
  });
});
