# Lindo for OpenCode

> **Lindo is an autonomous tech lead for OpenCode: it turns ambiguous goals into evidence-backed software decisions and verified vertical slices.**

**Lindo Method** as a versioned,
evidence-driven operating system for OpenCode 2.0. Not a persona. Not a prompt
bundle. One accountable orchestrator (`lindo`), a specialist team, a decision
ledger, and deterministic evidence gates.

- Agent principal: `lindo` (única interface humana, único orquestrador)
- Modelo primário: `opencode/muse-spark-1.3` (variantes por papel)
- Runtime: OpenCode `2.0.10`, sem fork, sem serviço remoto, telemetria off
- Estado: `.lindo/` event-sourced + projeção compacta no contexto

## Install (pinned)

```bash
# 1. Connect a provider exposing the target model (TUI: /connect, then /models)
# 2. Install a pinned revision
opencode plugin add github:lindoelio/opencode-lindo#v0.1.0

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

See `SPEC.md` (full product/behavior/implementation spec, v0.1.0) for the
Constitution, operating loop, Authority Matrix, tools, hooks, skills,
LindoBench, and release contract.

## Loop

```text
INTENT → DISCOVER → FRAME → DECIDE → SLICE → IMPLEMENT → VERIFY → REVIEW → ACCEPT → RELEASE
```

Every material claim needs criterion-linked evidence. `CLAIM strength ≤ EVIDENCE strength`.
A plan is not implementation; a passing build is not production proof.

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
`/lindo/status`, `/lindo/why`, `/lindo/calibrate`, plus lifecycle
`/lindo/setup`, `/lindo/doctor`, `/lindo/export`.

## Safety

Authority Matrix (`ALLOW` / `ALLOW_WITH_RECORD` / `ASK` / `DENY`), scoped
approvals with expiry, secret redaction before persistence, path-traversal and
symlink-escape refusal, prompt-injection containment, independent review before
`ACCEPT`, same-artifact promotion for release. `DENY` is final.

## License

MIT — see `LICENSE`. Security policy in `SECURITY.md`.
