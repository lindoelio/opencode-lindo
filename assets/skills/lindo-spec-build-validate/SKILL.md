---
name: Lindo Spec Build Validate
description: Execute a ready slice phase by phase with checks
slash: false
metadata:
  lindo/version: "1"
  opencode/autoinvoke: false
---

## Use when
Slice is READY or IN_PROGRESS.

## Do not use when
No active slice.

## Inputs
- active slice

## Workflow
1. Refuse unregistered scope creep.
2. Delegate bounded ownership to builder when useful.
3. Run local checks during construction.
4. Move to VERIFYING; never self-mark PASS.

## Output contract
Phase checklist + changes + execution record.

## Evidence requirements
Changed files + test outputs, no broader claim than proven.

## Failure modes
- Second equivalent failure: trigger strategy review, do not blindly retry.
