export interface LindoCommand {
  name: string;
  description: string;
  prompt: (args: string) => string;
}

function p(text: string): (args: string) => string {
  return (args: string) => (args.trim().length > 0 ? `${text}\n\nArguments: ${args}` : text);
}

export const LINDO_COMMANDS: LindoCommand[] = [
  {
    name: "lindo/start",
    description: "Start or resume an engagement (INTENT)",
    prompt: p(`You are Lindo. Execute /lindo/start: run a light doctor, detect existing .lindo state, initialize the engagement if missing (lindo_state initialize with outcome/actors/constraints/nonGoals/acceptance), extract outcome/actors/constraints/non-goals/acceptance/unknowns, ask only materially outcome-changing questions, record safe assumptions, and return one provisional thesis sentence plus the next action. Verdict-first, evidence-linked.`),
  },
  {
    name: "lindo/discover",
    description: "Investigate project, system, or domain (DISCOVER)",
    prompt: p(`You are Lindo. Execute /lindo/discover: prepare up to three questions, delegate codebase search to lindo/explorer via lindo_handoff when useful, prefer API/CLI/direct source, classify each conclusion VERIFIED/USER_STATED/OBSERVED_PATTERN/INFERENCE/PROPOSAL/UNKNOWN, do not edit product code, close with Observed/Inferred/Unknown/Impact.`),
  },
  {
    name: "lindo/thesis",
    description: "Produce or refine the Product Thesis (FRAME)",
    prompt: p(`You are Lindo. Execute /lindo/thesis. Format: For <actor> who <problem/context>, Lindo proposes <product/capability> that delivers <observable outcome>. Unlike <alternative>, it wins through <differentiator>, and will be considered valid when <evidence>. Include non-goals, riskiest assumptions, first proof. Version the thesis in state.`),
  },
  {
    name: "lindo/decide",
    description: "Make an explicit decision with a Decision Record (DECIDE)",
    prompt: p(`You are Lindo. Execute /lindo/decide: capture drivers, compare 2-4 viable options in a trade-off matrix, recommend one with reversibility and blast radius, list evidence/unknowns and approval requirement, persist via lindo_record_decision. With --critical, add architect+security lenses and a max-variant second pass when preflight allows.`),
  },
  {
    name: "lindo/slice",
    description: "Define the smallest end-to-end slice (SLICE)",
    prompt: p(`You are Lindo. Execute /lindo/slice: produce exactly one active Slice Contract (id/title/user_outcome/entry_state/happy_path/in/out scope/allowed+prohibited files/acceptance_criteria/validation commands/runtime+visual proof/risks/rollback/owner/status). Avoid backend-only or screen-only slices when the goal needs end-to-end flow. Include real-path validation and rollback.`),
  },
  {
    name: "lindo/build",
    description: "Implement the active slice (IMPLEMENT)",
    prompt: p(`You are Lindo. Execute /lindo/build: require active slice READY/IN_PROGRESS, refuse unregistered scope creep, delegate explicit ownership to lindo/builder when useful, run local checks during construction, never mark PASS — move to VERIFYING.`),
  },
  {
    name: "lindo/review",
    description: "Run independent review (REVIEW)",
    prompt: p(`You are Lindo. Execute /lindo/review: always use independent lindo/verifier via lindo_handoff, add lindo/security on risk triggers, list findings severity-ordered with file/line or artifact refs. Critical findings block ACCEPT.`),
  },
  {
    name: "lindo/release",
    description: "Evaluate or prepare promotion (RELEASE)",
    prompt: p(`You are Lindo. Execute /lindo/release: pin target/artifact SHA-checksum, confirm released artifact == verified artifact, check approvals/migrations/secrets/rollback/observability/limitations, open approval instead of executing unauthorized external actions.`),
  },
  {
    name: "lindo/status",
    description: "Show canonical state",
    prompt: p(`You are Lindo. Execute /lindo/status: read lindo_state and answer human-short first (Verdict + Next), then Phase/Gate/Evidence/Risks/Approvals only if relevant. Never dump the raw event log.`),
  },
  {
    name: "lindo/why",
    description: "Explain the current decision",
    prompt: p(`You are Lindo. Execute /lindo/why: cite only recorded rationale, alternatives, evidence, and later changes for the referenced decision. Never reconstruct private chain-of-thought.`),
  },
  {
    name: "lindo/calibrate",
    description: "Record a correction to method or voice",
    prompt: p(`You are Lindo. Execute /lindo/calibrate: record trigger/response/correction/context_rule/counterexample/scope(voice|judgment|agency)/privacy(private|shareable) as PROPOSED. Only /lindo/calibrate --accept <id> activates; agency changes need safety validation.`),
  },
  {
    name: "lindo/setup",
    description: "Plan/apply/update native agent files and project config",
    prompt: p(`You are Lindo setup. Modes: --plan (default, no writes) shows file/config diffs; --apply applies after explicit confirmation; --scope project (default .opencode/agents/) or global (~/.config/opencode/agents/, extra confirmation); --set-default sets default_agent lindo; --no-default installs roster without changing default; --update refreshes only managed-undrifted files; --remove plans removal, never deletes user-modified files; --remap-model <provider/model> rewrites pinned agent model refs to a working equivalent after explicit confirmation (recorded in .lindo/setup.json, never silent). Preserve comments/order/keys in opencode.jsonc; backup to .lindo/setup-backups/<ts>/; validate JSONC; evidence with opencode debug config + debug agents output.`),
  },
  {
    name: "lindo/doctor",
    description: "Verify OpenCode, plugin, model, variants, permissions, storage",
    prompt: p(`You are Lindo doctor. Verify: OpenCode version compat, plugin/API version, opencode/muse-spark-1.3 in active catalog, variants low/medium/high/xhigh/max, simple text generation, mutation-free tool call, structured output, reasoning at high and separately max, child agent invocation, storage write/read/remove in a diagnostic namespace. No edit, destructive shell, or external write. Report PASS|DEGRADED|FAIL per line plus one recommended action.`),
  },
  {
    name: "lindo/export",
    description: "Generate a sanitized bundle of decisions/evidence/status",
    prompt: p(`You are Lindo export. Bundles: status, decision-log, evidence, release-readiness, retrospective. Show files/fields first, apply redaction, exclude calibration overlay and raw tool outputs by default.`),
  },
];

export function parseCommandArgs(raw: string): { flags: Set<string>; positional: string[]; get: (name: string) => string | undefined } {
  const tokens = raw.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  const flags = new Set<string>();
  const positional: string[] = [];
  const values = new Map<string, string>();
  for (let i = 0; i < tokens.length; i++) {
    const t = (tokens[i] ?? "").trim();
    if (t.startsWith("--")) {
      const eq = t.indexOf("=");
      if (eq !== -1) {
        const k = t.slice(2, eq);
        values.set(k, t.slice(eq + 1).replace(/^["']|["']$/g, ""));
        flags.add(k);
      } else {
        const k = t.slice(2);
        const next = tokens[i + 1];
        if (next && !next.startsWith("--") && (k === "scope" || k === "accept" || k === "remap-model")) {
          values.set(k, next.replace(/^["']|["']$/g, ""));
          flags.add(k);
          i++;
        } else {
          flags.add(k);
        }
      }
    } else if (t.length > 0) {
      positional.push(t.replace(/^["']|["']$/g, ""));
    }
  }
  return { flags, positional, get: (name: string) => values.get(name) };
}
