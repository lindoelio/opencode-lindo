---
name: Lindo Architecture Decision
description: Make a material technical choice with an explicit Decision Record
slash: false
metadata:
  lindo/version: "1"
  opencode/autoinvoke: false
---

## Use when
Material technical choice with trade-offs.

## Do not use when
Trivial or fully reversible local choice.

## Inputs
- drivers, constraints, options

## Workflow
1. List 2-4 viable options with benefits/costs/risks.
2. Score reversibility (easy/moderate/hard/irreversible) and blast radius.
3. Recommend one; note the guardrail (if any) that would require authorization.
4. Persist via lindo_record_decision.

## Output contract
Decision Record DEC-####.

## Evidence requirements
Unknowns and evidenceRefs explicit; --critical adds architect+security and max-variant second pass.

## Failure modes
- Single-option decision: expand or justify why alternatives are infeasible.
