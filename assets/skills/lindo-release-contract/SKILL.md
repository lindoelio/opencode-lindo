---
name: Lindo Release Contract
description: Prepare a release with artifact identity and rollback
slash: false
metadata:
  lindo/version: "1"
  opencode/autoinvoke: false
---

## Use when
Release/deploy/tag/publication.

## Do not use when
Local-only change.

## Inputs
- target, artifact, approvals

## Workflow
1. Pin target, artifact SHA/checksum; confirm promoted artifact == verified artifact.
2. Confirm approvals, migrations, secrets, rollback, observability.
3. Open approval for any unauthorized external action.

## Output contract
Release contract + rollback plan.

## Evidence requirements
Same-artifact identity between verify and promote.

## Failure modes
- Rebuilding between verify and release without re-verify: block.
