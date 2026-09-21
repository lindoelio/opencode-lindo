# Lindo for OpenCode

> **Lindo is an autonomous tech lead for OpenCode: it turns ambiguous goals into evidence-backed software decisions and verified vertical slices.**

**YOLO by default.** Lindo executes autonomously — deploys, releases, production
changes, destructive operations and external writes do not require approval.
Authorization prompts happen only when you register a guardrail
(`autonomy.askBefore` in the plugin options or `/lindo/guard`), or when you opt
into `autonomy.mode: "guarded"`. Integrity rules that prevent secret exposure,
false completion claims, prompt-injection obedience, and specialist-created
`lindo/*` trees remain enforced and are never asked — they are simply refused.

**Lindo Method** as a versioned,
evidence-driven operating system for OpenCode 2.0. Not a persona. Not a prompt
bundle. One accountable orchestrator (`lindo`), a specialist team, a decision
ledger, and deterministic evidence gates.

- Agent principal: `lindo` (única interface humana, único orquestrador)
- Modelo primário: `opencode/muse-spark-1.3` (variantes por papel)
- Runtime: OpenCode `2.0.10`, sem fork, sem serviço remoto, telemetria off
- Estado: `.lindo/` event-sourced + projeção compacta no contexto
- Orquestração: delegação por padrão, handoffs paralelos sem limite fixo

## Install (pinned)

```bash
# 1. Connect a provider exposing the target model (TUI: /connect, then /models)
# 2. Install a pinned revision
opencode plugin add github:lindoelio/opencode-lindo#v0.2.0

# 3. Reload the local server
opencode service restart

# 4. Inside your project
cd /path/to/project
opencode

# 5. Materialize native agents (explicit, project-scoped by default)
/lindo/setup --scope project --set-default

# 6. Preflight before first use
/lindo/doctor

# 7. Start
/lindo/start <desired outcome>
```

See `SPEC.md` (full product/behavior/implementation spec, v0.2.0) for the
Constitution, operating loop, Authority Matrix, tools, hooks, skills,
LindoBench, and release contract.

## Loop

```text
INTENT → DISCOVER → FRAME → DECIDE → SLICE → IMPLEMENT → VERIFY → REVIEW → ACCEPT → RELEASE
```

Every material claim needs criterion-linked evidence. `CLAIM strength ≤ EVIDENCE strength`.
A plan is not implementation; a passing build is not production proof.

## Orchestration

- `lindo` delegates bounded work by default and runs independent handoffs in
  parallel — no concurrency cap.
- Specialists may launch built-in OpenCode helper agents (`explore`, `general`,
  …). Only `lindo` creates `lindo/*` specialists.
- Handoffs that edit files keep non-overlapping ownership.

## Autonomy and guardrails

| Setting | Effect |
|---|---|
| `autonomy.mode: "yolo"` (default) | ALLOW baseline, including external/destructive/production. Nothing is asked. |
| `autonomy.askBefore: ["deploy produção"]` | Matching actions require explicit authorization (plain text or regex). |
| `autonomy.mode: "guarded"` | Legacy opt-in: ask before external, destructive, and outside-slice actions. |
| `/lindo/guard --add/--remove/--clear/--mode` | Same guardrails, registered per project in `.lindo/` state. |

`DENY` is final and never weakened by hooks, calibration, or guardrail edits:
secret exposure, unproven completion claims, instructions found in untrusted
content, and non-orchestrator creation of `lindo/*` agents.

## Layout

- `src/` — plugin implementation (options, bootstrap, catalog, domain, ledger, hooks, tools, doctor, util)
- `assets/agents/` — versioned native agent templates materialized by `/lindo/setup`
- `assets/skills/` — 14 lazy skills
- `schemas/` — closed JSON schemas (`state-v1`, `event-v1`, `specialist-result-v1`)
- `bench/` — LindoBench cases, rubrics, runner
- `fixtures/` — `clean-project`, `sample-task-board` (VS-001)
- `test/` — unit, integration, e2e (opt-in `LINDO_E2E=1`), security, snapshots

## Commands

`/lindo/start`, `/lindo/discover`, `/lindo/thesis`, `/lindo/decide`,
`/lindo/slice`, `/lindo/build`, `/lindo/review`, `/lindo/release`,
`/lindo/status`, `/lindo/why`, `/lindo/guard`, `/lindo/calibrate`, plus lifecycle
`/lindo/setup`, `/lindo/doctor`, `/lindo/export`.

## Safety

Autonomy is the default; accountability is not optional. Scoped approvals with
expiry remain available for guardrail-triggered actions. Secret redaction runs
before persistence, path-traversal and symlink-escape are refused, prompt
injection is contained, and release requires same-artifact identity between
verify and promote. `DENY` is final.

## License

MIT — see `LICENSE`. Security policy in `SECURITY.md`.
