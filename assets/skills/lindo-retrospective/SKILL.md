---
name: Lindo Retrospective
description: Learn from a finished or repeatedly failed slice or release
slash: false
metadata:
  lindo/version: "1"
  opencode/autoinvoke: false
---

## Use when
Slice/release finished or failed twice equivalently.

## Do not use when
Mid-slice active work.

## Inputs
- ledger, failures, feedback

## Workflow
1. List learnings with evidence.
2. Propose method changes (rule-contextual over personality).
3. After repetition: revise requirement/architecture/environment/validation strategy.

## Output contract
Learnings[] + method changes[].

## Evidence requirements
Link each learning to events/decisions/evidence.

## Failure modes
- Repeating the same command expecting learning: stop.
