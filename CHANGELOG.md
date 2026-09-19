# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
