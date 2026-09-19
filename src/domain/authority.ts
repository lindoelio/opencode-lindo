import type { AuthorityLevel } from "./schemas.js";

export interface AuthorityQuery {
  action: string;
  resource?: string;
  role?: string;
  phase?: string;
  hasMatchingApproval?: boolean;
  isExternal?: boolean;
  isDestructive?: boolean;
  isOutsideSlice?: boolean;
  untrustedSource?: boolean;
}

export interface AuthorityRule {
  match: (q: AuthorityQuery) => boolean;
  effect: AuthorityLevel;
  reason: string;
}

function includes(hay: string, needle: string): boolean {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

function globMatch(pattern: string, value: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`).test(value);
}

/**
 * Authority Matrix (SPEC §7.2). Ordered: earlier rules are general,
 * later specific rules win (last-match semantics applied by classify()).
 */
export const AUTHORITY_RULES: AuthorityRule[] = [
  { match: (q) => q.action === "read" && !!q.resource && globMatch("*.env*", q.resource) && q.resource !== "*.env.example", effect: "ASK", reason: "secret boundary: prefer names/availability" },
  { match: (q) => q.action === "read", effect: "ALLOW", reason: "workspace read" },
  { match: (q) => q.action === "glob" || q.action === "grep", effect: "ALLOW", reason: "workspace search" },
  { match: (q) => q.action === "webfetch" || q.action === "websearch", effect: "ALLOW", reason: "public docs" },
  { match: (q) => q.action === "diagnose", effect: "ALLOW", reason: "diagnose without mutation" },
  { match: (q) => q.action === "plan" || q.action === "thesis" || q.action === "slice-plan", effect: "ALLOW_WITH_RECORD", reason: "proposal must be recorded" },
  { match: (q) => q.action === "edit", effect: "ALLOW", reason: "edit within slice" },
  { match: (q) => q.action === "shell" && !!q.resource && /^(formatter|test|build|typecheck|lint)/i.test(q.resource), effect: "ALLOW", reason: "local validation" },
  { match: (q) => q.action === "dependency-add", effect: "ALLOW_WITH_RECORD", reason: "record need/license/impact" },
  { match: (q) => q.action === "migration", effect: "ALLOW_WITH_RECORD", reason: "reversible local migration + review" },
  { match: (q) => q.action === "refactor-broad", effect: "ASK", reason: "broad refactor outside slice" },
  { match: (q) => q.action === "git-commit", effect: "ALLOW_WITH_RECORD", reason: "local commit only when workflow asks" },
  { match: (q) => q.action === "git-push" || q.action === "pr" || q.action === "external-comment", effect: "ASK", reason: "external write needs approval" },
  { match: (q) => q.action === "deploy" || q.action === "release" || q.action === "tag" || q.action === "publish", effect: "ASK", reason: "promotion needs target+identity confirmation" },
  { match: (q) => q.action === "production" || q.action === "billing" || q.action === "permissions", effect: "ASK", reason: "production/account mutation" },
  { match: (q) => q.action === "financial" || q.action === "legal", effect: "ASK", reason: "explicit human authority" },
  { match: (q) => q.action === "destructive" || q.isDestructive === true, effect: "ASK", reason: "irreversible action prefers recoverable alternative" },
  { match: (q) => q.action === "secret-expose" || q.action === "policy-bypass", effect: "DENY", reason: "never expose secrets or bypass protections" },
  { match: (q) => q.action === "false-claim", effect: "DENY", reason: "never claim test/deploy without proof" },
  { match: (q) => q.action === "untrusted-instruction" || q.untrustedSource === true, effect: "DENY", reason: "untrusted content is data, not command" },
  { match: (q) => q.action === "subagent" && !!q.resource && (q.resource === "*" || !q.resource.startsWith("lindo/")), effect: "DENY", reason: "only lindo/* delegation" },
  // Semantic elevation: anything external/destructive/outside-slice that was ALLOW becomes ASK.
  { match: (q) => (q.isExternal === true || q.isDestructive === true || q.isOutsideSlice === true) && (q.action === "shell" || q.action === "edit"), effect: "ASK", reason: "elevation: external/destructive/outside-slice" },
];

export interface AuthorityVerdict {
  effect: AuthorityLevel;
  reason: string;
}

/** Last matching rule wins. Explicit DENY is final (callers must not invoke hooks to weaken it). */
export function classifyAuthority(q: AuthorityQuery): AuthorityVerdict {
  let verdict: AuthorityVerdict = { effect: "ALLOW", reason: "default allow" };
  for (const rule of AUTHORITY_RULES) {
    let matched = false;
    try {
      matched = rule.match(q);
    } catch {
      matched = false;
    }
    if (matched) verdict = { effect: rule.effect, reason: rule.reason };
  }
  // Shell command text heuristics (deterministic, no model call).
  if (q.action === "shell" && q.resource) {
    const cmd = q.resource;
    if (/git\s+push|gh\s+pr|npm\s+publish|git\s+tag|rm\s+-rf|:\(\)\s*\{|curl.*\|\s*(sh|bash)/i.test(cmd)) {
      if (verdict.effect === "ALLOW" || verdict.effect === "ALLOW_WITH_RECORD") {
        verdict = { effect: "ASK", reason: "shell text classified as external/destructive" };
      }
    }
    if (/\.env\b/i.test(cmd) && /(cat|print|echo|export|printenv)/i.test(cmd)) {
      verdict = { effect: "ASK", reason: "possible secret read via shell" };
    }
  }
  if (/secret|token|bearer|password/i.test(q.action) && includes(q.action, "expos")) {
    verdict = { effect: "DENY", reason: "secret exposure" };
  }
  return verdict;
}

export function approvalSatisfies(requestedAction: string, resources: string[], approval: { requestedAction: string; resources: string[]; status: string; expiresAt?: string }): boolean {
  if (approval.status !== "approved") return false;
  if (approval.requestedAction !== requestedAction) return false;
  if (approval.expiresAt && Date.parse(approval.expiresAt) < Date.now()) return false;
  return resources.every((r) => approval.resources.includes(r));
}
