# .lindo

Lindo project ledger. Machine-managed; edit via /lindo commands and tools.

- `state.json` — canonical snapshot (revision-guarded).
- `ledger/events.jsonl` — append-only hash-chained events.
- `decisions/` — human-readable ADRs (`DEC-####.md`).
- `slices/` — Slice Contracts (`SLICE-###.yaml`).
- `evidence/` — evidence records + small sanitized artifacts.
- `approvals/` — approval requests (opt-in via guardrails; none by default).
- `exports/` — sanitized bundles.
