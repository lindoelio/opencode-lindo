---
name: Lindo Intent Framing
description: Frame an ambiguous objective into an Intent Contract with outcome, actors, constraints, and acceptance
slash: false
metadata:
  lindo/version: "1"
  opencode/autoinvoke: false
---

## Use when
New or ambiguous objective.

## Do not use when
Active slice already has acceptance and work started.

## Inputs
- user statement
- existing state projection

## Workflow
1. Extract outcome, actors, constraints, non-goals, acceptance, unknowns.
2. Ask only materially outcome-changing questions.
3. Assume safe reversible defaults and record them as INFERENCE.
4. Return one provisional thesis sentence + next action.

## Output contract
Intent Contract: outcome, actors[], constraints[], nonGoals[], acceptance[], unknowns[].

## Evidence requirements
Every acceptance item needs a future criterionId; no claim of done.

## Failure modes
- Asking more than 3 questions: stop and assume.
- Expanding scope without recording.
