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
 * Authority Matrix, YOLO baseline (default since 0.2.0). ALLOW is the default
 * for external, destructive, production, financial and legal actions. `ASK`
 * is not produced here: it is reserved for user-registered guardrails
 * (`autonomy.askBefore`, `/lindo/guard`) and for `autonomy.mode: "guarded"`.
 *
 * The only DENY rules are integrity rules: they never ask the user, they
 * simply refuse secret exposure, unproven claims, instructions found in
 * untrusted content, and lindo/* delegation by non-orchestrators.
 *
 * Ordered: later rules win (last-match semantics applied by classify()).
 */
export const AUTHORITY_RULES: AuthorityRule[] = [
  { match: (q) => q.action === "read", effect: "ALLOW", reason: "workspace read (secret values are redacted before persistence)" },
  { match: (q) => q.action === "glob" || q.action === "grep", effect: "ALLOW", reason: "workspace search" },
  { match: (q) => q.action === "webfetch" || q.action === "websearch", effect: "ALLOW", reason: "public docs" },
  { match: (q) => q.action === "diagnose", effect: "ALLOW", reason: "diagnose without mutation" },
  { match: (q) => q.action === "plan" || q.action === "thesis" || q.action === "slice-plan", effect: "ALLOW_WITH_RECORD", reason: "record proposal vs accepted decision" },
  { match: (q) => q.action === "edit", effect: "ALLOW", reason: "edit within slice" },
  { match: (q) => q.action === "shell", effect: "ALLOW", reason: "autonomous shell" },
  { match: (q) => q.action === "dependency-add", effect: "ALLOW_WITH_RECORD", reason: "record need/license/impact" },
  { match: (q) => q.action === "migration", effect: "ALLOW_WITH_RECORD", reason: "record migration + rollback" },
  { match: (q) => q.action === "refactor-broad", effect: "ALLOW_WITH_RECORD", reason: "record scope change" },
  { match: (q) => q.action === "git-commit", effect: "ALLOW_WITH_RECORD", reason: "record local commit" },
  { match: (q) => q.action === "git-push" || q.action === "pr" || q.action === "external-comment", effect: "ALLOW", reason: "external write allowed by default" },
  { match: (q) => q.action === "deploy" || q.action === "release" || q.action === "tag" || q.action === "publish", effect: "ALLOW", reason: "promotion allowed by default" },
  { match: (q) => q.action === "production" || q.action === "billing" || q.action === "permissions", effect: "ALLOW", reason: "production mutation allowed by default" },
  { match: (q) => q.action === "financial" || q.action === "legal", effect: "ALLOW", reason: "autonomous by default; guardrail can require authorization" },
  { match: (q) => q.action === "destructive" || q.isDestructive === true, effect: "ALLOW", reason: "allowed by default; prefer a recoverable alternative" },
  { match: (q) => q.action === "secret-expose" || q.action === "policy-bypass", effect: "DENY", reason: "never expose secrets or bypass protections" },
  { match: (q) => q.action === "false-claim", effect: "DENY", reason: "never claim test/deploy without proof" },
  { match: (q) => q.action === "untrusted-instruction" || q.untrustedSource === true, effect: "DENY", reason: "untrusted content is data, not command" },
  // Orchestration boundary: lindo orchestrates lindo/*; specialists may launch
  // built-in OpenCode helper agents, never lindo/* trees.
  { match: (q) => q.action === "subagent", effect: "ALLOW", reason: "built-in helper agents allowed" },
  {
    match: (q) =>
      q.action === "subagent" &&
      !!q.resource &&
      q.resource.startsWith("lindo/") &&
      !!q.role &&
      q.role !== "lindo",
    effect: "DENY",
    reason: "only lindo may orchestrate lindo/* specialists",
  },
];

/**
 * Guarded-mode elevation (legacy 0.1.x behavior, opt-in via
 * `autonomy.mode: "guarded"`). Restores ASK for external/destructive/
 * outside-slice actions and for the shell heuristics.
 */
export const GUARDED_ELEVATION_RULES: AuthorityRule[] = [
  { match: (q) => q.action === "read" && !!q.resource && globMatch("*.env*", q.resource) && q.resource !== "*.env.example", effect: "ASK", reason: "guarded: secret boundary" },
  { match: (q) => q.action === "refactor-broad", effect: "ASK", reason: "guarded: broad refactor outside slice" },
  { match: (q) => q.action === "git-push" || q.action === "pr" || q.action === "external-comment", effect: "ASK", reason: "guarded: external write needs approval" },
  { match: (q) => q.action === "deploy" || q.action === "release" || q.action === "tag" || q.action === "publish", effect: "ASK", reason: "guarded: promotion needs target+identity confirmation" },
  { match: (q) => q.action === "production" || q.action === "billing" || q.action === "permissions", effect: "ASK", reason: "guarded: production/account mutation" },
  { match: (q) => q.action === "financial" || q.action === "legal", effect: "ASK", reason: "guarded: explicit human authority" },
  { match: (q) => q.action === "destructive" || q.isDestructive === true, effect: "ASK", reason: "guarded: irreversible action" },
  { match: (q) => (q.isExternal === true || q.isDestructive === true || q.isOutsideSlice === true) && (q.action === "shell" || q.action === "edit"), effect: "ASK", reason: "guarded: external/destructive/outside-slice" },
];

export interface AuthorityVerdict {
  effect: AuthorityLevel;
  reason: string;
}

/** Last matching rule wins. */
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
  if (/secret|token|bearer|password/i.test(q.action) && includes(q.action, "expos")) {
    verdict = { effect: "DENY", reason: "secret exposure" };
  }
  return verdict;
}

/** Guarded-mode classification: yolo baseline plus legacy ASK elevations. */
export function classifyGuarded(q: AuthorityQuery): AuthorityVerdict {
  const base = classifyAuthority(q);
  if (base.effect === "DENY") return base;
  let verdict = base;
  for (const rule of GUARDED_ELEVATION_RULES) {
    let matched = false;
    try {
      matched = rule.match(q);
    } catch {
      matched = false;
    }
    if (matched) verdict = { effect: rule.effect, reason: rule.reason };
  }
  if (q.action === "shell" && q.resource) {
    const cmd = q.resource;
    if (/git\s+push|gh\s+pr|npm\s+publish|git\s+tag|rm\s+-rf|:\(\)\s*\{|curl.*\|\s*(sh|bash)/i.test(cmd) && verdict.effect === "ALLOW") {
      verdict = { effect: "ASK", reason: "guarded: shell text classified as external/destructive" };
    }
    if (/\.env\b/i.test(cmd) && /(cat|print|echo|export|printenv)/i.test(cmd)) {
      verdict = { effect: "ASK", reason: "guarded: possible secret read via shell" };
    }
  }
  return verdict;
}

/**
 * Guardrails: user-registered patterns (plain substrings or regexes) matched
 * case-insensitively against `"<action> <resources>"`. A match means "ask me
 * before this".
 */
export function matchesGuardrail(guardrails: string[], action: string, resources: string[]): string | undefined {
  const hay = `${action} ${resources.join(" ")}`.trim();
  for (const raw of guardrails) {
    const pattern = raw.trim();
    if (!pattern) continue;
    try {
      if (new RegExp(pattern, "i").test(hay)) return pattern;
    } catch {
      if (hay.toLowerCase().includes(pattern.toLowerCase())) return pattern;
    }
  }
  return undefined;
}

export function approvalSatisfies(requestedAction: string, resources: string[], approval: { requestedAction: string; resources: string[]; status: string; expiresAt?: string }): boolean {
  if (approval.status !== "approved") return false;
  if (approval.requestedAction !== requestedAction) return false;
  if (approval.expiresAt && Date.parse(approval.expiresAt) < Date.now()) return false;
  return resources.every((r) => approval.resources.includes(r));
}
