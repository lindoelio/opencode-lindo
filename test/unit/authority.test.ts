import { describe, expect, it } from "vitest";
import { approvalSatisfies, classifyAuthority } from "../../src/domain/authority.js";

describe("authority matrix", () => {
  it("denies secret exposure and untrusted instructions", () => {
    expect(classifyAuthority({ action: "secret-expose" }).effect).toBe("DENY");
    expect(classifyAuthority({ action: "policy-bypass" }).effect).toBe("DENY");
    expect(classifyAuthority({ action: "untrusted-instruction" }).effect).toBe("DENY");
    expect(classifyAuthority({ action: "false-claim" }).effect).toBe("DENY");
  });
  it("denies specialist-created subagents", () => {
    expect(classifyAuthority({ action: "subagent", resource: "*" }).effect).toBe("DENY");
    expect(classifyAuthority({ action: "subagent", resource: "general" }).effect).toBe("DENY");
  });
  it("asks for external writes and destructive actions", () => {
    expect(classifyAuthority({ action: "git-push" }).effect).toBe("ASK");
    expect(classifyAuthority({ action: "deploy" }).effect).toBe("ASK");
    expect(classifyAuthority({ action: "destructive" }).effect).toBe("ASK");
    expect(classifyAuthority({ action: "shell", resource: "git push origin main" }).effect).toBe("ASK");
    expect(classifyAuthority({ action: "shell", resource: "rm -rf /tmp/x" }).effect).toBe("ASK");
  });
  it("asks for secret reads via shell", () => {
    expect(classifyAuthority({ action: "shell", resource: "cat .env" }).effect).toBe("ASK");
  });
  it("allows workspace reads", () => {
    expect(classifyAuthority({ action: "read", resource: "src/index.ts" }).effect).toBe("ALLOW");
  });
  it("matches approvals exactly", () => {
    const approval = { requestedAction: "git-push", resources: ["origin"], status: "approved" };
    expect(approvalSatisfies("git-push", ["origin"], approval)).toBe(true);
    expect(approvalSatisfies("deploy", ["origin"], approval)).toBe(false);
    expect(approvalSatisfies("git-push", ["other"], approval)).toBe(false);
    expect(approvalSatisfies("git-push", ["origin"], { ...approval, status: "pending" })).toBe(false);
    expect(approvalSatisfies("git-push", ["origin"], { ...approval, expiresAt: new Date(Date.now() - 1000).toISOString() })).toBe(false);
  });
});
