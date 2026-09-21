# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-09-21

### Changed (breaking)

- **YOLO is the default.** `ALLOW` is now the baseline for external writes,
  deploys, releases, tags, publication, production/billing/permission changes,
  financial/legal actions and destructive operations. The permission hook no
  longer elevates `allow` to `ask`. Authorization prompts happen only when a
  user-registered guardrail matches (`autonomy.askBefore` or `/lindo/guard`) or
  when `autonomy.mode: "guarded"` is explicitly set.
- **No concurrency cap.** The `max 3 concurrent handoffs` guard is removed;
  `lindo` is instructed to delegate by default and run independent handoffs in
  parallel. SPEC concurrency limits (default 2 / max 3) are gone.
- **Nested helper agents allowed.** Specialists may launch built-in OpenCode
  helper agents (`explore`, `general`, …). Only `lindo` may create `lindo/*`
  specialists; that boundary remains a final `DENY`.
- `.env`/credentials reads are `ALLOW` by default (redaction before persistence
  is unchanged).
- Agent templates no longer carry `ask` permissions for `git push`, `git tag`,
  `external_directory`, or `.env` reads.

### Added

- `autonomy` plugin option: `{ mode: "yolo" | "guarded", askBefore: string[] }`.
- `guardrails` + `autonomyMode` in project state, `lindo_state` action
  `guard` (add/remove/clear/mode), and `/lindo/guard` command.
- `matchesGuardrail` (plain text or regex, case-insensitive) in the Authority
  Matrix; `classifyGuarded` preserves the legacy opt-in behavior.
- Doctor reports the effective autonomy policy.
- 15th command (`/lindo/guard`); bench cases and rubrics updated for the
  autonomy-first policy.

### Kept

- Integrity `DENY` rules remain final: secret exposure, unproven completion
  claims, instructions from untrusted content, and `lindo/*` orchestration by
  non-orchestrators.

## [0.1.3] - 2026-09-19

### Added

- Explicit model remediation: `/lindo/doctor` reports `DEGRADED` (instead of a
  bare `FAIL`) when the pinned model is missing but a same-family equivalent
  exists, with an exact `remediation` instruction. `/lindo/setup --apply
  --remap-model <provider/model>` rewrites pinned agent `model:` refs
  (variants preserved, frontmatter intact) after explicit confirmation and
  records the choice in `.lindo/setup.json`, which later plans reapply so
  updates never silently revert it. No silent fallback, ever.

## [0.1.2] - 2026-09-19

### Added

- REVIEW and ACCEPT gates now require a completed `lindo/verifier` handoff:
  self-verification fails with `missing: ["independent-verifier-review"]`.
- State projection now reports `handoffs_completed`, `handoffs_open`, and
  `missing_independent_review` (with the gate consequence spelled out), so the
  primary agent sees the delegation gap in every context injection.

## [0.1.1] - 2026-09-19

### Fixed

- Skill registration used a `location` key; `Skill.Info` requires an absolute
  `path`. The server disabled the plugin after the transform failure. Skills now
  resolve `assets/skills/<id>/SKILL.md` inside the installed package, with a
  regression test asserting the registered shape.

## [0.1.0] - 2026-09-19

### Added

- Initial public draft implementation of Lindo for OpenCode.
- Primary agent `lindo` + 8 specialists (`explorer`, `product`, `architect`,
  `designer`, `builder`, `verifier`, `security`, `release`) materialized by
  `/lindo/setup` as native OpenCode Markdown agents.
- 14 commands (`start`, `discover`, `thesis`, `decide`, `slice`, `build`,
  `review`, `release`, `status`, `why`, `calibrate`, plus `setup`, `doctor`,
  `export`) registered via `ctx.command.transform`.
- 14 lazy skills (`lindo-intent-framing` … `lindo-twin-calibration`).
- 7 tools in the `lindo` namespace (`lindo_state`, `lindo_record_assumption`,
  `lindo_record_decision`, `lindo_submit_evidence`, `lindo_evaluate_gate`,
  `lindo_request_approval`, `lindo_handoff`) with closed JSON schemas.
- Project ledger `.lindo/` (event-sourced `state.json` + `ledger/events.jsonl`
  with hash chaining, atomic writes, optimistic revision, redaction).
- Authority Matrix + `permission.evaluate` semantic enforcement.
- Session hooks (`prompt`, `context`, `compaction`, `retry`) and tool audit
  hooks (`execute.before`/`execute.after`).
- `/lindo/doctor` model preflight for `opencode/muse-spark-1.3` and reasoning
  variants `low`/`medium`/`high`/`xhigh`/`max`.
- `fixtures/sample-task-board` vertical-slice fixture + `VS-001` flow.
- LindoBench case schema, rubrics, and runner skeleton.
- OpenCode `2.0.10` compatibility. No fork, no remote service, no telemetry.
