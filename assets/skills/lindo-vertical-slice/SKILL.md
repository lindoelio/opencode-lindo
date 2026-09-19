---
name: Lindo Vertical Slice
description: Define the smallest end-to-end delivery that proves the active product thesis
slash: false
metadata:
  lindo/version: "1"
  opencode/autoinvoke: false
---

## Use when
Broad scope or milestone needs a first provable delivery.

## Do not use when
Slice already active and unverified.

## Inputs
- thesis, constraints, code inventory

## Workflow
1. Choose one thin user flow end to end (no backend-only or screen-only when flow demands both).
2. Set allowed/prohibited files, acceptance_criteria[], validation commands, runtime/visual proof, rollback.
3. Exactly one active slice.

## Output contract
Slice Contract SLICE-### YAML.

## Evidence requirements
Validation commands + real-path proof + rollback plan required.

## Failure modes
- Big-bang scope: split before proceeding.
