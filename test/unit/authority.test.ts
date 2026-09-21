import { describe, expect, it } from "vitest";
import { approvalSatisfies, classifyAuthority, classifyGuarded, matchesGuardrail } from "../../src/domain/authority.js";

describe("authority matrix (yolo default)", () => {
  it("denies integrity violations only", () => {
    expect(classifyAuthority({ action: "secret-expose" }).effect).toBe("DENY");
    expect(classifyAuthority({ action: "policy-bypass" }).effect).toBe("DENY");
    expect(classifyAuthority({ action: "untrusted-instruction" }).effect).toBe("DENY");
    expect(classifyAuthority({ action: "false-claim" }).effect).toBe("DENY");
  });
  it("allows external, destructive, production, financial and legal actions by default", () => {
    expect(classifyAuthority({ action: "git-push" }).effect).toBe("ALLOW");
    expect(classifyAuthority({ action: "deploy" }).effect).toBe("ALLOW");
    expect(classifyAuthority({ action: "release" }).effect).toBe("ALLOW");
    expect(classifyAuthority({ action: "tag" }).effect).toBe("ALLOW");
    expect(classifyAuthority({ action: "production" }).effect).toBe("ALLOW");
    expect(classifyAuthority({ action: "financial" }).effect).toBe("ALLOW");
    expect(classifyAuthority({ action: "legal" }).effect).toBe("ALLOW");
    expect(classifyAuthority({ action: "destructive" }).effect).toBe("ALLOW");
    expect(classifyAuthority({ action: "shell", resource: "git push origin main" }).effect).toBe("ALLOW");
    expect(classifyAuthority({ action: "shell", resource: "rm -rf /tmp/x" }).effect).toBe("ALLOW");
    expect(classifyAuthority({ action: "read", resource: ".env" }).effect).toBe("ALLOW");
    expect(classifyAuthority({ action: "read", resource: "src/index.ts" }).effect).toBe("ALLOW");
  });
  it("scopes subagents: built-ins allowed for everyone, lindo/* only by lindo", () => {
    expect(classifyAuthority({ action: "subagent", resource: "general", role: "lindo/builder" }).effect).toBe("ALLOW");
    expect(classifyAuthority({ action: "subagent", resource: "explore", role: "lindo/explorer" }).effect).toBe("ALLOW");
    expect(classifyAuthority({ action: "subagent", resource: "lindo/builder", role: "lindo" }).effect).toBe("ALLOW");
    expect(classifyAuthority({ action: "subagent", resource: "lindo/builder", role: "lindo/builder" }).effect).toBe("DENY");
  });
  it("guarded mode restores ask-before-external behavior (opt-in)", () => {
    expect(classifyGuarded({ action: "git-push" }).effect).toBe("ASK");
    expect(classifyGuarded({ action: "deploy" }).effect).toBe("ASK");
    expect(classifyGuarded({ action: "destructive" }).effect).toBe("ASK");
    expect(classifyGuarded({ action: "production" }).effect).toBe("ASK");
    expect(classifyGuarded({ action: "shell", resource: "git push origin main" }).effect).toBe("ASK");
    expect(classifyGuarded({ action: "shell", resource: "rm -rf /tmp/x" }).effect).toBe("ASK");
    expect(classifyGuarded({ action: "shell", resource: "cat .env" }).effect).toBe("ASK");
    expect(classifyGuarded({ action: "read", resource: "src/x.ts" }).effect).toBe("ALLOW");
    // integrity DENY survives guarded elevation
    expect(classifyGuarded({ action: "secret-expose" }).effect).toBe("DENY");
  });
  it("matches guardrails case-insensitively (substring or regex)", () => {
    expect(matchesGuardrail(["deploy"], "deploy", ["production"])).toBe("deploy");
    expect(matchesGuardrail(["git push"], "shell", ["git push origin main"])).toBe("git push");
    expect(matchesGuardrail(["^deploy$"], "deploy", [])).toBe("^deploy$");
    expect(matchesGuardrail([], "deploy", [])).toBeUndefined();
    expect(matchesGuardrail(["publish"], "deploy", ["staging"])).toBeUndefined();
    expect(matchesGuardrail(["[invalid"], "deploy", [])).toBeUndefined();
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
