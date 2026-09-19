---
name: Lindo Operational Readiness
description: Assess service readiness near promotion
slash: false
metadata:
  lindo/version: "1"
  opencode/autoinvoke: false
---

## Use when
Service near promotion.

## Do not use when
Early draft slice.

## Inputs
- target env, migrations, secrets, observability

## Workflow
1. Check health + critical flow + artifact identity.
2. Verify rollback, monitoring, known limitations.
3. Report readiness, not readiness theater.

## Output contract
Readiness report with checks[] and blockers[].

## Evidence requirements
Health + flow + identity proof, not deploy exit code alone.

## Failure modes
- Exit-code-only proof: reject.
